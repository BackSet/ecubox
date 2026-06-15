import { describe, expect, it } from 'vitest';
import {
  parsearMotivoRevision,
  serializarMotivoRevision,
} from './revisionMotivos';

describe('serializarMotivoRevision', () => {
  it('serializa solo el código cuando no hay observación', () => {
    expect(serializarMotivoRevision('DATOS_INCONSISTENTES')).toBe('DATOS_INCONSISTENTES');
    expect(serializarMotivoRevision('DATOS_INCONSISTENTES', '   ')).toBe('DATOS_INCONSISTENTES');
  });

  it('serializa código + observación', () => {
    expect(serializarMotivoRevision('OTRO', 'faltan datos')).toBe('OTRO: faltan datos');
  });
});

describe('parsearMotivoRevision', () => {
  it('parsea código con observación a una etiqueta legible', () => {
    const r = parsearMotivoRevision('TOTAL_PAQUETES_INCORRECTO: faltan 2');
    expect(r.codigo).toBe('TOTAL_PAQUETES_INCORRECTO');
    expect(r.observacion).toBe('faltan 2');
    expect(r.label).toBe('Total de paquetes incorrecto: faltan 2');
  });

  it('parsea código sin observación', () => {
    const r = parsearMotivoRevision('CONSIGNATARIO_INCORRECTO');
    expect(r.codigo).toBe('CONSIGNATARIO_INCORRECTO');
    expect(r.label).toBe('Consignatario incorrecto');
  });

  it('es tolerante con motivos libres antiguos (sin código)', () => {
    const r = parsearMotivoRevision('texto libre histórico');
    expect(r.codigo).toBeNull();
    expect(r.label).toBe('texto libre histórico');
  });

  it('maneja vacío/nulo', () => {
    expect(parsearMotivoRevision(null).label).toBe('');
    expect(parsearMotivoRevision('').codigo).toBeNull();
  });
});
