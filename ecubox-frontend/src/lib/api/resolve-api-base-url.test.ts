import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveApiBaseUrl } from './resolve-api-base-url';

describe('resolveApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('devuelve /api cuando VITE_API_URL está vacío o ausente', () => {
    vi.stubEnv('VITE_API_URL', '');
    expect(resolveApiBaseUrl()).toBe('/api');
  });

  it('añade /api al origen absoluto sin path', () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8080');
    expect(resolveApiBaseUrl()).toBe('http://localhost:8080/api');
  });

  it('normaliza barra final del origen antes de añadir /api', () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8080///');
    expect(resolveApiBaseUrl()).toBe('http://localhost:8080/api');
  });

  it('no duplica si el path ya termina en /api', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/api');
    expect(resolveApiBaseUrl()).toBe('https://api.example.com/api');
  });

  it('respeta otro path de gateway sin añadir /api', () => {
    vi.stubEnv('VITE_API_URL', 'https://gw.example.com/v1/proxy');
    expect(resolveApiBaseUrl()).toBe('https://gw.example.com/v1/proxy');
  });

  it('ruta relativa /api se mantiene', () => {
    vi.stubEnv('VITE_API_URL', '/api');
    expect(resolveApiBaseUrl()).toBe('/api');
  });

  it('ruta relativa /v1 recibe sufijo /api', () => {
    vi.stubEnv('VITE_API_URL', '/v1');
    expect(resolveApiBaseUrl()).toBe('/v1/api');
  });

  it('entrada inválida como URL absoluta cae en /api', () => {
    vi.stubEnv('VITE_API_URL', 'https://[malformed');
    expect(resolveApiBaseUrl()).toBe('/api');
  });
});
