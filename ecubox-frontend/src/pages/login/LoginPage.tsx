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
import { SurfaceCard } from '@/components/ui/surface-card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const loginSchema = z.object({
  username: z.string().min(1, 'El usuario o correo es requerido'),
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
        setError('Usuario/correo o contraseña incorrectos');
      } else {
        setError('Error al iniciar sesión. Intenta de nuevo.');
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <header className="border-b border-[var(--color-border)]">
        <div className="content-container-wide mobile-safe-inline py-3 sm:py-4">
          <Link to="/" className="-m-1 inline-flex rounded-lg p-1 transition hover:bg-[var(--color-muted)]" aria-label="ECUBOX - Inicio">
            <EcuboxLogo variant="light" size="lg" asLink={false} />
          </Link>
        </div>
      </header>

      <main className="mobile-safe-inline flex flex-1 items-center justify-center py-6 sm:py-10">
        <div className="w-full max-w-md">
          <SurfaceCard className="p-5 sm:p-6 md:p-8">
            <h1 className="mb-2 text-xl sm:text-2xl font-bold text-[var(--color-foreground)]">
              Iniciar sesión
            </h1>
            <p className="mb-6 text-sm text-[var(--color-muted-foreground)]">
              Accede al panel de administración de ECUBOX.
            </p>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <div role="alert" className="ui-alert ui-alert-error">
                  {error}
                </div>
              )}

              <Form {...form}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuario o correo</FormLabel>
                        <FormControl>
                          <Input type="text" autoComplete="username" placeholder="usuario o tu@correo.com" {...field} />
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
                          <Input type="password" autoComplete="current-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Form>

              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                {form.formState.isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
              <Link to="/registro" className="text-[var(--color-primary)] hover:underline">Registrarse</Link>
              {' · '}
              <Link to="/" className="text-[var(--color-primary)] hover:underline">Volver al inicio</Link>
            </p>
          </SurfaceCard>
        </div>
      </main>
    </div>
  );
}
