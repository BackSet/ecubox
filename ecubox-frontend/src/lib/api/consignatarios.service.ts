import { openapiClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type { components } from '@/lib/api/generated/schema';
import type { Consignatario, ConsignatarioRequest } from '@/types/consignatario';

// El tipo de dominio y el body generado difieren en `required`/optional; se
// puentea con un cast localizado del body (payload idéntico).
type ConsignatarioRequestDTO = components['schemas']['ConsignatarioRequest'];

export async function getConsignatarios(): Promise<Consignatario[]> {
  const data = await unwrap(openapiClient.GET('/api/mis-consignatarios'));
  return data as Consignatario[];
}

export async function getConsignatario(id: number): Promise<Consignatario> {
  const data = await unwrap(
    openapiClient.GET('/api/mis-consignatarios/{id}', { params: { path: { id } } }),
  );
  return data as Consignatario;
}

export async function createConsignatario(body: ConsignatarioRequest): Promise<Consignatario> {
  const data = await unwrap(
    openapiClient.POST('/api/mis-consignatarios', { body: body as ConsignatarioRequestDTO }),
  );
  return data as Consignatario;
}

export async function updateConsignatario(
  id: number,
  body: ConsignatarioRequest,
): Promise<Consignatario> {
  const data = await unwrap(
    openapiClient.PUT('/api/mis-consignatarios/{id}', {
      params: { path: { id } },
      body: body as ConsignatarioRequestDTO,
    }),
  );
  return data as Consignatario;
}

export async function deleteConsignatario(id: number): Promise<void> {
  await ensureOk(
    openapiClient.DELETE('/api/mis-consignatarios/{id}', { params: { path: { id } } }),
  );
}

export interface SugerirCodigoParams {
  nombre?: string;
  canton?: string;
  excludeId?: number;
}

export async function sugerirCodigo(params: SugerirCodigoParams): Promise<{ codigo: string }> {
  const data = await unwrap(
    openapiClient.GET('/api/mis-consignatarios/sugerir-codigo', {
      params: {
        query: {
          nombre: params.nombre ?? undefined,
          canton: params.canton ?? undefined,
          excludeId: params.excludeId ?? undefined,
        },
      },
    }),
  );
  return data as { codigo: string };
}
