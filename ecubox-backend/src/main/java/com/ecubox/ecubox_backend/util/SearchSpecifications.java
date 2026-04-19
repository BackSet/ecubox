package com.ecubox.ecubox_backend.util;

import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
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
        String trimmed = q == null ? "" : q.trim();
        if (trimmed.isEmpty() || fieldExtractors == null || fieldExtractors.length == 0) {
            return (root, query, cb) -> cb.conjunction();
        }
        String[] tokens = trimmed.toLowerCase(Locale.ROOT).split("\\s+");
        return (root, query, cb) -> {
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
     * Atajo para campos que cruzan una relación {@code rel.field}.
     */
    public static <T> Function<Root<T>, Expression<String>> path(String... segments) {
        return root -> {
            Path<?> p = root;
            for (String s : segments) {
                p = p.get(s);
            }
            @SuppressWarnings("unchecked")
            Expression<String> expr = (Expression<String>) p;
            return expr;
        };
    }

    private static Expression<String> toLower(jakarta.persistence.criteria.CriteriaBuilder cb,
                                              Expression<String> expr) {
        return cb.lower(expr);
    }

    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
