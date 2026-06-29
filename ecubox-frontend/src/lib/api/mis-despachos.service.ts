import { openapiClient, unwrap } from '@/lib/api/openapi-client';
import type { MiDespacho, MiDespachoDetalle } from '@/types/mis-despacho';

const BASE = '/api/mis-despachos' as const;

export async function listarMisDespachos(): Promise<MiDespacho[]> {
  const data = await unwrap(openapiClient.GET(BASE));
  return data as MiDespacho[];
}

export async function obtenerMiDespacho(despachoId: number): Promise<MiDespachoDetalle> {
  const data = await unwrap(
    openapiClient.GET(`${BASE}/{id}`, { params: { path: { id: despachoId } } }),
  );
  return data as MiDespachoDetalle;
}

export async function confirmarEntregaDespacho(despachoId: number): Promise<MiDespacho> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/{id}/confirmar-entrega`, { params: { path: { id: despachoId } } }),
  );
  return data as MiDespacho;
}
