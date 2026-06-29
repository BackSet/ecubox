import { openapiClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type {
  AccesoEnlace,
  GenerarAccesoEnlaceRequest,
  GenerarAccesoEnlaceResponse,
} from '@/types/acceso-enlace';

// El contrato OpenAPI tipa las respuestas de forma laxa (propiedades opcionales,
// `tipo` como string). Se conservan los tipos de dominio en las firmas y se
// puentea la imprecisión con un cast localizado en el límite del servicio.

export async function getAccesoEnlaces(): Promise<AccesoEnlace[]> {
  const data = await unwrap(openapiClient.GET('/api/acceso-enlaces'));
  return data as AccesoEnlace[];
}

export async function generarAccesoEnlace(
  body: GenerarAccesoEnlaceRequest,
): Promise<GenerarAccesoEnlaceResponse> {
  const data = await unwrap(openapiClient.POST('/api/acceso-enlaces', { body }));
  return data as GenerarAccesoEnlaceResponse;
}

export async function revocarAccesoEnlace(id: number): Promise<void> {
  await ensureOk(openapiClient.DELETE('/api/acceso-enlaces/{id}', { params: { path: { id } } }));
}
