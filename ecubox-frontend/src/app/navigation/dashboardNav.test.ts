import { describe, expect, it } from 'vitest';
import { getVisibleNavGroups, getVisibleNavItems } from './dashboardNav';

/** Construye un `hasPermission` a partir de una lista de permisos concedidos. */
function withPerms(permisos: string[]) {
  return (p: string) => permisos.includes(p);
}

const CLIENTE = [
  'INICIO_READ',
  'CASILLERO_READ',
  'CONSIGNATARIOS_READ',
  'MIS_GUIAS_READ',
  'MIS_ENTREGAS_READ',
];
const OPERARIO = [
  'INICIO_READ',
  'ESTADISTICAS_READ',
  'CONSIGNATARIOS_READ',
  'CONSIGNATARIOS_OPERARIO',
  'GUIAS_MASTER_READ',
  'PAQUETES_READ',
  'PAQUETES_PESO_WRITE',
  'LOTES_RECEPCION_READ',
  'ENVIOS_CONSOLIDADOS_READ',
  'DESPACHOS_WRITE',
  'MANIFIESTOS_READ',
  'LIQUIDACION_CONSOLIDADO_READ',
  'COURIERS_ENTREGA_READ',
  'AGENCIAS_READ',
  'PUNTOS_ENTREGA_READ',
];
function grupos(permisos: string[], onlyWithPermission = false) {
  return getVisibleNavGroups(withPerms(permisos), { onlyWithPermission }).map((g) => g.label);
}
function item(permisos: string[], to: string, onlyWithPermission = false) {
  return getVisibleNavItems(withPerms(permisos), { onlyWithPermission }).find((i) => i.to === to);
}

describe('dashboardNav · composición por audiencia', () => {
  describe('cliente', () => {
    it('muestra Principal + Mis envíos, con Mi casillero primero', () => {
      expect(grupos(CLIENTE)).toEqual(['Principal', 'Mis envíos']);
      const items = getVisibleNavItems(withPerms(CLIENTE));
      const misEnvios = getVisibleNavGroups(withPerms(CLIENTE)).find((g) => g.label === 'Mis envíos');
      expect(misEnvios?.items.map((i) => i.to)).toEqual([
        '/casillero',
        '/consignatarios',
        '/mis-guias',
        '/mis-entregas',
      ]);
      // Rótulo de cliente.
      expect(items.find((i) => i.to === '/consignatarios')?.label).toBe('Destinatarios');
    });
  });

  describe('operario', () => {
    it('agrupa por tareas y no incluye grupos de admin ni Mi cuenta', () => {
      expect(grupos(OPERARIO)).toEqual([
        'Inicio y rastreo',
        'Gestión de clientes',
        'Recepción y transporte',
        'Entrega y cierre',
        'Red de entrega',
      ]);
      expect(item(OPERARIO, '/consignatarios')?.label).toBe('Consignatarios');
    });
  });

  describe('administrador', () => {
    it('suma Accesos y seguridad + Configuración a los grupos de operario', () => {
      // El ADMIN recibe visualmente todos los permisos (ver PROJECT_CONTEXT §4),
      // por eso modelamos hasPermission siempre verdadero.
      const labels = getVisibleNavGroups(() => true).map((g) => g.label);
      expect(labels).toContain('Accesos y seguridad');
      expect(labels).toContain('Configuración');
      // El admin no recibe el grupo "Mi cuenta".
      expect(labels).not.toContain('Mi cuenta');
    });
  });

  describe('usuario mixto (operario + cliente, no admin)', () => {
    it('usa el árbol operativo y añade "Mi cuenta" al final', () => {
      const mixto = [...OPERARIO, 'MIS_GUIAS_READ', 'MIS_ENTREGAS_READ', 'CASILLERO_READ'];
      const labels = grupos(mixto);
      expect(labels[0]).toBe('Inicio y rastreo');
      expect(labels[labels.length - 1]).toBe('Mi cuenta');
      const miCuenta = getVisibleNavGroups(withPerms(mixto)).find((g) => g.label === 'Mi cuenta');
      expect(miCuenta?.items.map((i) => i.to)).toEqual(['/casillero', '/mis-guias', '/mis-entregas']);
    });

    it('no duplica la ruta /consignatarios entre composiciones', () => {
      const mixto = [...OPERARIO, 'MIS_GUIAS_READ', 'CASILLERO_READ'];
      const consignatarios = getVisibleNavItems(withPerms(mixto)).filter((i) => i.to === '/consignatarios');
      expect(consignatarios).toHaveLength(1);
    });
  });

  describe('acceso compartido (onlyWithPermission)', () => {
    it('solo muestra items con permiso explícito, con labels de cliente', () => {
      const token = ['ACCESO_ENLACE_CONSIGNATARIOS_READ', 'ACCESO_ENLACE_GUIAS_READ'];
      const items = getVisibleNavItems(withPerms(token), { onlyWithPermission: true });
      const rutas = items.map((i) => i.to);
      expect(rutas).toContain('/consignatarios');
      expect(rutas).toContain('/mis-guias');
      // No expone Inicio ni Casillero sin autorización.
      expect(rutas).not.toContain('/inicio');
      expect(rutas).not.toContain('/casillero');
      expect(item(token, '/consignatarios', true)?.label).toBe('Destinatarios');
    });
  });

  describe('grupos vacíos y permisos', () => {
    it('descarta grupos sin items visibles', () => {
      // Operario con un único permiso: solo el grupo correspondiente aparece.
      const labels = grupos(['DESPACHOS_WRITE']);
      expect(labels).toEqual(['Entrega y cierre']);
    });

    it('un usuario sin permisos no ve grupos', () => {
      expect(grupos([])).toEqual([]);
    });
  });
});
