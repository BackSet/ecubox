package com.ecubox.ecubox_backend.util;

import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.From;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;

/**
 * Helpers para construir {@link Specification} de búsqueda por texto libre
 * sobre múltiples campos. Política aplicada:
 * <ul>
 *   <li>Si el texto trae varios tokens (separados por espacios), <em>todos</em>
 *       deben coincidir (AND), pero cada token puede aparecer en cualquiera de
 *       los campos (OR-de-campos).</li>
 *   <li>Búsqueda case-insensitive con {@code LOWER(...) LIKE %token%}.</li>
 *   <li>Texto {@code null} o en blanco devuelve una {@link Specification}
 *       siempre verdadera (no filtra nada), de modo que pueda combinarse
 *       transparentemente con otros filtros usando {@code .and(...)}.</li>
 * </ul>
 *
 * <p>No usa {@code unaccent(...)} para no requerir extensiones de Postgres;
 * si en el futuro se habilita la extensión {@code unaccent}, basta cambiar
 * la función {@link #toLower(jakarta.persistence.criteria.CriteriaBuilder, Expression)}.
 */
public final class SearchSpecifications {

    private SearchSpecifications() {}

    /**
     * Construye una {@link Specification} que exige que todos los tokens del
     * texto {@code q} aparezcan (LIKE %token%) en al menos uno de los campos
     * indicados.
     *
     * @param q texto bruto introducido por el usuario.
     * @param fieldExtractors lambdas que, dado el {@link Root}, devuelven el
     *                        {@link Expression} de tipo String del campo a buscar
     *                        (puede atravesar relaciones con {@code root.get("rel").get("campo")}).
     */
    @SafeVarargs
    public static <T> Specification<T> tokensLike(String q,
                                                  Function<Root<T>, Expression<String>>... fieldExtractors) {
        return buildTokensLike(q, false, fieldExtractors);
    }

    /**
     * Variante de {@link #tokensLike} que además fuerza {@code SELECT DISTINCT}
     * sobre la query principal. Es la opción correcta cuando uno de los
     * extractores apunta a una <b>colección</b> (relación a {@code Set}/{@code List}
     * via {@code @OneToMany} o {@code @ManyToMany}, p. ej. {@code roles},
     * {@code permisos}). El LEFT JOIN producido multiplicaría la fila padre por
     * cada elemento que matchee, y sin {@code distinct} aparecerían duplicados
     * tanto en el contenido como en el conteo de página.
     *
     * <p>Para joins a relaciones <em>singulares</em> ({@code @ManyToOne},
     * {@code @OneToOne}) sigue prefiriéndose {@link #tokensLike}, ya que
     * {@code distinct} en esos casos es innecesario y puede empeorar el plan
     * de ejecución del optimizador.</p>
     */
    @SafeVarargs
    public static <T> Specification<T> tokensLikeDistinct(String q,
                                                          Function<Root<T>, Expression<String>>... fieldExtractors) {
        return buildTokensLike(q, true, fieldExtractors);
    }

    private static <T> Specification<T> buildTokensLike(String q,
                                                        boolean distinct,
                                                        Function<Root<T>, Expression<String>>[] fieldExtractors) {
        String trimmed = q == null ? "" : q.trim();
        if (trimmed.isEmpty() || fieldExtractors == null || fieldExtractors.length == 0) {
            return (root, query, cb) -> cb.conjunction();
        }
        String[] tokens = trimmed.toLowerCase(Locale.ROOT).split("\\s+");
        return (root, query, cb) -> {
            // Marcamos distinct sólo en la query principal de selección. Spring
            // Data emite también un count query (resultType Long); ahí distinct
            // no aporta nada y puede romper el conteo, así que no lo aplicamos.
            if (distinct && query != null && query.getResultType() != Long.class
                    && query.getResultType() != long.class) {
                query.distinct(true);
            }
            List<Predicate> tokenPredicates = new ArrayList<>(tokens.length);
            for (String token : tokens) {
                if (token.isEmpty()) continue;
                String pattern = "%" + escapeLike(token) + "%";
                List<Predicate> fieldPredicates = new ArrayList<>(fieldExtractors.length);
                for (Function<Root<T>, Expression<String>> extractor : fieldExtractors) {
                    Expression<String> expr = extractor.apply(root);
                    if (expr == null) continue;
                    fieldPredicates.add(cb.like(toLower(cb, expr), pattern, '\\'));
                }
                if (!fieldPredicates.isEmpty()) {
                    tokenPredicates.add(cb.or(fieldPredicates.toArray(Predicate[]::new)));
                }
            }
            if (tokenPredicates.isEmpty()) return cb.conjunction();
            return cb.and(tokenPredicates.toArray(Predicate[]::new));
        };
    }

    /**
     * Atajo conveniente para acceder a un campo simple del root sin escribir
     * la lambda completa.
     */
    public static <T> Function<Root<T>, Expression<String>> field(String name) {
        return root -> root.<String>get(name);
    }

    /**
     * Atajo para campos que cruzan una o más relaciones {@code rel.[rel...].field}.
     *
     * <p><b>Importante:</b> usa {@link JoinType#LEFT LEFT JOIN} para los
     * segmentos de relación en vez del INNER JOIN implícito que produciría
     * {@code root.get("rel").get("campo")}. De este modo, si una entidad NO
     * tiene la relación cargada (por ejemplo una guía sin destinatario o sin
     * cliente), no se excluye del resultado al hacer una búsqueda libre por
     * texto sobre otros campos. El INNER JOIN implícito era el causante de
     * que ciertas guías "desaparecieran" al buscarlas.</p>
     *
     * <p>Además, reutiliza joins ya creados sobre el mismo {@link From} cuando
     * varios extractores apuntan a la misma relación (p. ej.
     * {@code path("consignatario", "nombre")} y
     * {@code path("consignatario", "codigo")}), evitando producir
     * múltiples joins duplicados en el SQL.</p>
     */
    public static <T> Function<Root<T>, Expression<String>> path(String... segments) {
        return root -> {
            if (segments == null || segments.length == 0) {
                throw new IllegalArgumentException("path(...) requiere al menos un segmento");
            }
            // Caso simple: campo directo del root, sin joins.
            if (segments.length == 1) {
                return root.<String>get(segments[0]);
            }
            From<?, ?> from = root;
            for (int i = 0; i < segments.length - 1; i++) {
                from = leftJoinReuse(from, segments[i]);
            }
            return from.<String>get(segments[segments.length - 1]);
        };
    }

    /**
     * Devuelve un LEFT JOIN sobre {@code attribute} reutilizando el join
     * existente si {@code from} ya tiene uno con el mismo nombre y tipo LEFT.
     */
    private static Join<?, ?> leftJoinReuse(From<?, ?> from, String attribute) {
        for (Join<?, ?> j : from.getJoins()) {
            if (attribute.equals(j.getAttribute().getName()) && j.getJoinType() == JoinType.LEFT) {
                return j;
            }
        }
        return from.join(attribute, JoinType.LEFT);
    }

    private static Expression<String> toLower(jakarta.persistence.criteria.CriteriaBuilder cb,
                                              Expression<String> expr) {
        return cb.lower(expr);
    }

    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
