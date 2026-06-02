// Stub de 'virtual:pwa-register' para el entorno de tests, donde el plugin de
// Vite (vite-plugin-pwa) que provee el modulo virtual no esta activo.
export function registerSW(): (reloadPage?: boolean) => Promise<void> {
  return async () => {};
}
