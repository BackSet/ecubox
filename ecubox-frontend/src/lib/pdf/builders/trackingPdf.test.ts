import { describe, expect, it } from 'vitest';
import { buildTrackingPdf } from './trackingPdf';

describe('buildTrackingPdf', () => {
  it('renderiza alterno, retiro en oficina y fecha límite desde el contrato común', () => {
    const doc = buildTrackingPdf({
      numeroGuia: 'DEMO-OFICINA',
      estadoRastreoNombre: 'Incidencia configurada',
      estadoActualId: 9,
      flujoActual: 'ALTERNO',
      motivoAlterno: 'Validación documental',
      bloqueado: true,
      diasMaxRetiro: 5,
      diasTranscurridos: 2,
      diasRestantes: 3,
      fechaLimiteRetiro: '2026-06-17T00:00:00',
      estados: [
        {
          id: 1,
          codigo: 'BASE',
          nombre: 'Base configurada',
          orden: 1,
          tipoFlujo: 'NORMAL',
          leyenda: null,
          esActual: false,
        },
        {
          id: 9,
          codigo: 'ALT',
          nombre: 'Incidencia configurada',
          orden: 2,
          tipoFlujo: 'ALTERNO',
          afterEstadoId: 1,
          leyenda: 'Leyenda configurada',
          esActual: true,
        },
      ],
      operadorEntrega: {
        tipoEntrega: 'AGENCIA',
        agenciaNombre: 'Oficina Centro',
        agenciaDireccion: 'Av. Principal',
        agenciaProvincia: 'Pichincha',
        agenciaCanton: 'Quito',
        horarioAtencionAgencia: '09:00 a 17:00',
        diasMaxRetiroAgencia: 5,
      },
    });

    const output = doc.output();
    expect(output.startsWith('%PDF-')).toBe(true);
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
  });
});
