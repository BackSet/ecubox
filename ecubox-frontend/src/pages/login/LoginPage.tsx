import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from '@tanstack/react-router';
import { EcuboxLogo } from '@/components/brand';
import { z } from 'zod';
import { login } from '@/lib/api/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const loginSchema = z.object({
  username: z.string().min(1, 'El nombre de usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setError(null);
    try {
      const data = await login(values);
      setAuth(data);
      navigate({ to: '/inicio' });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setError('Usuario o contraseña incorrectos');
      } else {
        setError('Error al iniciar sesión. Intenta de nuevo.');
      }
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      <header className="border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link to="/" className="inline-flex p-1 -m-1 rounded-lg hover:bg-[var(--color-muted)] transition" aria-label="ECUBOX - Inicio">
            <EcuboxLogo variant="light" size="lg" asLink={false} iconOnly />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="surface-card p-8 hidden lg:block">
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
              Centro de operaciones ECUBOX
            </h2>
            <p className="mt-3 text-[var(--color-muted-foreground)] leading-relaxed">
              Gestiona envíos, despachos, lotes y manifiestos en una interfaz rápida y enfocada en operación.
            </p>
            <div className="mt-8 grid gap-3">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                <p className="text-sm font-medium text-[var(--color-foreground)]">Operación por módulos</p>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                  Paquetes, despachos, lotes y manifiestos con acciones guiadas.
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                <p className="text-sm font-medium text-[var(--color-foreground)]">Dark mode nativo</p>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                  Mejor visibilidad en turnos largos sin perder contraste.
                </p>
              </div>
            </div>
          </section>
          <div className="surface-card p-8">
            <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
              Iniciar sesión
            </h1>
            <p className="text-[var(--color-muted-foreground)] text-sm mb-6">
              Accede al panel de administración de ECUBOX.
            </p>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <div
                  role="alert"
                  className="rounded-md bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] text-sm px-4 py-3"
                >
                  {error}
                </div>
              )}

              <Form {...form}>
                <div className="space-y-5">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuario</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            autoComplete="username"
                            className="input-clean"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="current-password"
                            className="input-clean"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Form>

              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full"
              >
                {form.formState.isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
              <Link to="/registro" className="hover:underline text-[var(--color-primary)]">
                Registrarse
              </Link>
              {' · '}
              <Link to="/" className="hover:underline text-[var(--color-primary)]">
                Volver al inicio
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
