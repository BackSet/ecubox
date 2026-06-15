import { describe, expect, it } from 'vitest';
import { getVisibleNavItems } from './dashboardNav';

/** Devuelve el item de la ruta /consignatarios visible para un set de permisos. */
function consignatariosItem(permisos: string[]) {
  const has = (p: string) => permisos.includes(p);
  return getVisibleNavItems(has).find((i) => i.to === '/consignatarios');
}

describe('dashboardNav · rótulo por audiencia de /consignatarios', () => {
  it('muestra "Consignatarios" al back-office (CONSIGNATARIOS_OPERARIO)', () => {
    const item = consignatariosItem(['CONSIGNATARIOS_READ', 'CONSIGNATARIOS_OPERARIO']);
    expect(item?.label).toBe('Consignatarios');
  });

  it('muestra "Destinatarios" al cliente (sin CONSIGNATARIOS_OPERARIO)', () => {
    const item = consignatariosItem(['CONSIGNATARIOS_READ']);
    expect(item?.label).toBe('Destinatarios');
  });

  it('muestra "Destinatarios" en sesión por enlace', () => {
    const item = consignatariosItem(['ACCESO_ENLACE_CONSIGNATARIOS_READ']);
    expect(item?.label).toBe('Destinatarios');
  });

  it('no duplica la ruta /consignatarios', () => {
    const items = getVisibleNavItems((p) => p === 'CONSIGNATARIOS_READ');
    expect(items.filter((i) => i.to === '/consignatarios')).toHaveLength(1);
  });
});
