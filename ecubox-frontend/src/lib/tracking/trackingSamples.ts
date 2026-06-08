import type {
  TrackingEstadoItem,
  TrackingResolveResponse,
  TrackingResponse,
} from '@/lib/api/tracking.service';

export interface TrackingSampleEntry {
  codigo: string;
  titulo: string;
  descripcion: string;
  tipo: 'PIEZA' | 'GUIA_MASTER';
}

export const TRACKING_SAMPLES: TrackingSampleEntry[] = [
  {
    codigo: 'ABC1234567890',
    titulo: 'Guía master (consolidador)',
    descripcion: 'Vista agregada de una guía con varias piezas en distintas etapas.',
    tipo: 'GUIA_MASTER',
  },
  {
    codigo: 'ABC1234567890 1/2',
    titulo: 'Pieza 1 de 2',
    descripcion: 'Seguimiento detallado de una pieza en tránsito internacional.',
    tipo: 'PIEZA',
  },
  {
    codigo: 'XYZ-987654321',
    titulo: 'Pieza lista para retiro',
    descripcion: 'Envío disponible en agencia con plazo de retiro activo.',
    tipo: 'PIEZA',
  },
];

const SAMPLE_CODIGOS = new Set(
  [
    ...TRACKING_SAMPLES.map((s) => normalizeTrackingSampleCodigo(s.codigo)),
    'ABC1234567890 2/2',
  ].map((c) => c.toUpperCase())
);

export function normalizeTrackingSampleCodigo(raw: string): string {
  return raw
    .trim()
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ');
}

export function isTrackingSampleCodigo(raw: string): boolean {
  const cod = normalizeTrackingSampleCodigo(raw).toUpperCase();
  return SAMPLE_CODIGOS.has(cod);
}

export function getDefaultTrackingSampleCodigo(): string {
  return TRACKING_SAMPLES[0]?.codigo ?? 'ABC1234567890';
}

export function resolveTrackingSample(raw: string): TrackingResolveResponse | null {
  const cod = normalizeTrackingSampleCodigo(raw);
  const key = cod.toUpperCase();

  if (key === 'ABC1234567890') {
    return { tipo: 'GUIA_MASTER', master: buildMasterAbc() };
  }
  if (key === 'ABC1234567890 1/2') {
    return { tipo: 'PIEZA', pieza: buildPiezaAbc12() };
  }
  if (key === 'ABC1234567890 2/2') {
    return { tipo: 'PIEZA', pieza: buildPiezaAbc22() };
  }
  if (key === 'XYZ-987654321') {
    return { tipo: 'PIEZA', pieza: buildPiezaXyz() };
  }
  return null;
}

function buildEstadosTransito(actualIndex: number): TrackingEstadoItem[] {
  const base: Omit<TrackingEstadoItem, 'esActual'>[] = [
    {
      id: 1,
      codigo: 'REGISTRADO',
      nombre: 'Registrado en bodega USA',
      orden: 1,
      tipoFlujo: 'NORMAL',
      leyenda: 'Tu paquete fue recibido y registrado en nuestra bodega de New Jersey.',
      fechaOcurrencia: '2026-05-02T15:30:00.000Z',
    },
    {
      id: 2,
      codigo: 'CONSOLIDADO',
      nombre: 'Consolidado para envío',
      orden: 2,
      tipoFlujo: 'NORMAL',
      leyenda: 'El paquete fue agrupado con otros envíos hacia Ecuador.',
      fechaOcurrencia: '2026-05-05T18:00:00.000Z',
    },
    {
      id: 3,
      codigo: 'DESPACHADO',
      nombre: 'Despachado desde USA',
      orden: 3,
      tipoFlujo: 'NORMAL',
      leyenda: 'Salió de nuestra bodega rumbo a Ecuador.',
      fechaOcurrencia: '2026-05-08T12:00:00.000Z',
    },
    {
      id: 4,
      codigo: 'TRANSITO',
      nombre: 'En tránsito internacional',
      orden: 4,
      tipoFlujo: 'NORMAL',
      leyenda: 'Tu envío viaja hacia Ecuador. Te avisaremos cuando ingrese a aduana.',
      fechaOcurrencia: actualIndex >= 3 ? '2026-05-18T09:15:00.000Z' : null,
    },
    {
      id: 5,
      codigo: 'ADUANA',
      nombre: 'En proceso aduanero',
      orden: 5,
      tipoFlujo: 'NORMAL',
      leyenda: 'El paquete está siendo gestionado en aduana ecuatoriana.',
      fechaOcurrencia: null,
    },
    {
      id: 6,
      codigo: 'ENTREGA',
      nombre: 'Disponible para entrega',
      orden: 6,
      tipoFlujo: 'NORMAL',
      leyenda: 'Podrás retirar o recibir tu paquete según el tipo de entrega contratado.',
      fechaOcurrencia: null,
    },
  ];

  return base.map((item, index) => ({
    ...item,
    esActual: index === actualIndex,
  }));
}

function buildEstadosAgencia(actualIndex: number): TrackingEstadoItem[] {
  const items = buildEstadosTransito(5);
  return items.map((item, index) => ({
    ...item,
    esActual: index === actualIndex,
    fechaOcurrencia:
      index <= actualIndex
        ? item.fechaOcurrencia ?? `2026-05-${String(10 + index).padStart(2, '0')}T10:00:00.000Z`
        : null,
  }));
}

function buildMasterAbc() {
  return {
    trackingBase: 'ABC1234567890',
    estadoGlobal: 'DESPACHO_PARCIAL' as const,
    totalPiezasEsperadas: 2,
    piezasRegistradas: 2,
    piezasRecibidas: 2,
    piezasDespachadas: 1,
    consignatarioNombre: 'María Demo García',
    consignatario: {
      nombre: 'María Demo García',
      provincia: 'Guayas',
      canton: 'Guayaquil',
    },
    piezas: [
      {
        numeroGuia: 'ABC1234567890 1/2',
        piezaNumero: 1,
        piezaTotal: 2,
        estadoActualCodigo: 'TRANSITO',
        estadoActualNombre: 'En tránsito internacional',
        fechaEstadoDesde: '2026-05-18T09:15:00.000Z',
      },
      {
        numeroGuia: 'ABC1234567890 2/2',
        piezaNumero: 2,
        piezaTotal: 2,
        estadoActualCodigo: 'CONSOLIDADO',
        estadoActualNombre: 'Consolidado para envío',
        fechaEstadoDesde: '2026-05-05T18:00:00.000Z',
      },
    ],
    fechaPrimeraRecepcion: '2026-05-02T15:30:00.000Z',
    fechaPrimeraPiezaDespachada: '2026-05-08T12:00:00.000Z',
    ultimaActualizacion: '2026-05-20T14:00:00.000Z',
    timeline: [
      {
        numeroGuia: 'ABC1234567890 1/2',
        piezaNumero: 1,
        piezaTotal: 2,
        estadoCodigo: 'TRANSITO',
        estadoNombre: 'En tránsito internacional',
        eventoTipo: 'CAMBIO_ESTADO',
        occurredAt: '2026-05-18T09:15:00.000Z',
      },
      {
        numeroGuia: 'ABC1234567890 2/2',
        piezaNumero: 2,
        piezaTotal: 2,
        estadoCodigo: 'CONSOLIDADO',
        estadoNombre: 'Consolidado para envío',
        eventoTipo: 'CAMBIO_ESTADO',
        occurredAt: '2026-05-05T18:00:00.000Z',
      },
      {
        numeroGuia: 'ABC1234567890 1/2',
        piezaNumero: 1,
        piezaTotal: 2,
        estadoCodigo: 'DESPACHADO',
        estadoNombre: 'Despachado desde USA',
        eventoTipo: 'CAMBIO_ESTADO',
        occurredAt: '2026-05-08T12:00:00.000Z',
      },
    ],
  };
}

function buildPiezaAbc12(): TrackingResponse {
  const estados = buildEstadosTransito(3);
  return {
    numeroGuia: 'ABC1234567890 1/2',
    estadoRastreoId: 4,
    estadoRastreoNombre: 'En tránsito internacional',
    consignatarioNombre: 'María Demo García',
    consignatario: {
      nombre: 'María Demo García',
      provincia: 'Guayas',
      canton: 'Guayaquil',
    },
    estados,
    estadoActualId: 4,
    fechaEstadoDesde: '2026-05-18T09:15:00.000Z',
    leyenda: 'Tu envío viaja hacia Ecuador. Te avisaremos cuando ingrese a aduana.',
    flujoActual: 'NORMAL',
    bloqueado: false,
    master: {
      trackingBase: 'ABC1234567890',
      totalPiezasEsperadas: 2,
      piezasRegistradas: 2,
      piezas: [
        {
          numeroGuia: 'ABC1234567890 1/2',
          piezaNumero: 1,
          piezaTotal: 2,
          estadoActualNombre: 'En tránsito internacional',
          fechaEstadoDesde: '2026-05-18T09:15:00.000Z',
        },
        {
          numeroGuia: 'ABC1234567890 2/2',
          piezaNumero: 2,
          piezaTotal: 2,
          estadoActualNombre: 'Consolidado para envío',
          fechaEstadoDesde: '2026-05-05T18:00:00.000Z',
        },
      ],
    },
  };
}

function buildPiezaAbc22(): TrackingResponse {
  const estados = buildEstadosTransito(1);
  return {
    numeroGuia: 'ABC1234567890 2/2',
    estadoRastreoId: 2,
    estadoRastreoNombre: 'Consolidado para envío',
    consignatarioNombre: 'María Demo García',
    consignatario: {
      nombre: 'María Demo García',
      provincia: 'Guayas',
      canton: 'Guayaquil',
    },
    estados,
    estadoActualId: 2,
    fechaEstadoDesde: '2026-05-05T18:00:00.000Z',
    leyenda: 'El paquete fue agrupado con otros envíos hacia Ecuador.',
    flujoActual: 'NORMAL',
    bloqueado: false,
    master: {
      trackingBase: 'ABC1234567890',
      totalPiezasEsperadas: 2,
      piezasRegistradas: 2,
      piezas: buildMasterAbc().piezas,
    },
  };
}

function buildPiezaXyz(): TrackingResponse {
  const estados = buildEstadosAgencia(5);
  return {
    numeroGuia: 'XYZ-987654321',
    estadoRastreoId: 6,
    estadoRastreoNombre: 'Disponible en agencia',
    consignatarioNombre: 'Carlos Demo Mendoza',
    consignatario: {
      nombre: 'Carlos Demo Mendoza',
      provincia: 'Pichincha',
      canton: 'Quito',
    },
    estados,
    estadoActualId: 6,
    fechaEstadoDesde: '2026-05-20T11:00:00.000Z',
    leyenda:
      'Tu paquete está listo para retiro en la agencia indicada. Revisa el plazo máximo de retiro.',
    diasMaxRetiro: 5,
    diasTranscurridos: 2,
    diasRestantes: 3,
    cuentaRegresivaFinalizada: false,
    paqueteVencido: false,
    flujoActual: 'NORMAL',
    bloqueado: false,
    despacho: {
      numeroGuia: 'DSP-DEMO-0426',
      codigoPrecinto: 'PRC-DEMO-7788',
      tipoEntrega: 'AGENCIA',
      totalSacas: 1,
      totalPaquetes: 18,
      pesoTotalKg: 4.2,
      pesoTotalLbs: 9.3,
    },
    sacaActual: {
      numeroOrden: 'S-0426-01',
      tamanio: 'M',
      pesoKg: 4.2,
      pesoLbs: 9.3,
    },
    paquetesDespacho: [
      {
        numeroGuia: 'XYZ-987654321',
        estadoRastreoNombre: 'Disponible en agencia',
        sacaNumeroOrden: 'S-0426-01',
        pesoKg: 4.2,
        pesoLbs: 9.3,
      },
    ],
    operadorEntrega: {
      tipoEntrega: 'AGENCIA',
      agenciaNombre: 'Agencia ECUBOX Norte (demo)',
      agenciaCodigo: 'AG-DEMO-N',
      agenciaDireccion: 'Av. Demo 123 y Calle Ficticia',
      agenciaProvincia: 'Pichincha',
      agenciaCanton: 'Quito',
      agenciaEncargado: 'María Pérez (demo)',
      horarioAtencionAgencia: 'Lun–Vie 09:00–18:00, Sáb 09:00–13:00',
      diasMaxRetiroAgencia: 5,
      courierEntregaNombre: 'Servientrega (demo)',
      courierEntregaCodigo: 'SRV-DEMO',
    },
  };
}
