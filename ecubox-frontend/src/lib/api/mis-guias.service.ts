import { openapiClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type { components } from '@/lib/api/generated/schema';
import type { EstadoRastreoCliente } from '@/types/estado-rastreo';
import type { GuiaMaster, MiGuiaCreateRequest, MiInicioDashboard } from '@/types/guia-master';
import type { Paquete } from '@/types/paquete';

type S = components['schemas'];

const BASE = '/api/mis-guias' as const;

export async function listarMisGuias(consignatarioId?: number): Promise<GuiaMaster[]> {
  const data = await unwrap(
    openapiClient.GET(BASE, { params: { query: { consignatarioId } } }),
  );
  return data as GuiaMaster[];
}

export async function obtenerMiGuia(id: number): Promise<GuiaMaster> {
  const data = await unwrap(openapiClient.GET(`${BASE}/{id}`, { params: { path: { id } } }));
  return data as GuiaMaster;
}

export async function listarPiezasDeMiGuia(id: number): Promise<Paquete[]> {
  const data = await unwrap(
    openapiClient.GET(`${BASE}/{id}/piezas`, { params: { path: { id } } }),
  );
  return data as Paquete[];
}

export async function registrarMiGuia(body: MiGuiaCreateRequest): Promise<GuiaMaster> {
  const data = await unwrap(
    openapiClient.POST(BASE, { body: body as S['MiGuiaCreateRequest'] }),
  );
  return data as GuiaMaster;
}

export async function actualizarMiGuiaConsignatario(
  id: number,
  consignatarioId: number,
): Promise<GuiaMaster> {
  // BUG PREEXISTENTE (código muerto, sin uso en UI): apunta a `/consignatario`,
  // que NO existe en el backend (solo `PUT /api/mis-guias/{id}/destinatario`),
  // por lo que devuelve 404. Se preserva el request EXACTO (cast de ruta) para
  // no cambiar comportamiento en esta migración de cliente HTTP. Corregir
  // (repuntar a `/destinatario` o eliminar la función) es un cambio aparte.
  const data = await unwrap(
    openapiClient.PUT(
      `${BASE}/{id}/consignatario` as `${typeof BASE}/{id}/destinatario`,
      {
        params: { path: { id } },
        body: { consignatarioId } as S['MiGuiaUpdateRequest'],
      },
    ),
  );
  return data as GuiaMaster;
}

export interface MiGuiaUpdateBody {
  trackingBase?: string;
  consignatarioId: number;
}

export async function actualizarMiGuia(id: number, body: MiGuiaUpdateBody): Promise<GuiaMaster> {
  const data = await unwrap(
    openapiClient.PUT(`${BASE}/{id}`, {
      params: { path: { id } },
      body: body as S['MiGuiaUpdateRequest'],
    }),
  );
  return data as GuiaMaster;
}

export async function eliminarMiGuia(id: number): Promise<void> {
  await ensureOk(openapiClient.DELETE(`${BASE}/{id}`, { params: { path: { id } } }));
}

export async function obtenerMiInicioDashboard(): Promise<MiInicioDashboard> {
  const data = await unwrap(openapiClient.GET(`${BASE}/dashboard`));
  return data as MiInicioDashboard;
}

/** Catálogo de estados de rastreo visibles para el cliente, con su leyenda. */
export async function listarEstadosRastreoMisGuias(): Promise<EstadoRastreoCliente[]> {
  const data = await unwrap(openapiClient.GET(`${BASE}/estados-rastreo`));
  return data as EstadoRastreoCliente[];
}
