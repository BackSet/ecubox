import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { EcuboxLogo } from '@/components/brand';
import { z } from 'zod';
import { registerClienteSimple } from '@/lib/api/auth.service';
import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SurfaceCard } from '@/components/ui/surface-card';

const PASSWORD_MIN_LENGTH = 6;

const schema = z
  .object({
    email: z.string().min(1, 'El correo es requerido').email('Correo electrónico no válido'),
    password: z.string().min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`),
    passwordConfirm: z.string().min(1, 'Repite la contraseña'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirm'],
  });

type FormValues = z.infer<typeof schema>;

export function RegistroSimplePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', passwordConfirm: '' },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      await registerClienteSimple({ email: values.email, password: values.password });
      toast.success('Cuenta creada. Ya puedes iniciar sesión.');
      navigate({ to: '/login' });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError('Correo ya registrado.');
      } else {
        setError('Error al registrarse. Intenta de nuevo.');
      }
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      <header className="border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link to="/" className="inline-flex p-1 -m-1 rounded-lg hover:bg-[var(--color-muted)] transition" aria-label="ECUBOX - Inicio">
            <EcuboxLogo variant="light" size="lg" asLink={false} />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <SurfaceCard className="p-8">
            <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
              Registro rápido
            </h1>
            <p className="text-[var(--color-muted-foreground)] text-sm mb-6">
              Solo necesitas correo y contraseña para crear tu cuenta.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div role="alert" className="ui-alert ui-alert-error">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                  Correo electrónico
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-[var(--color-destructive)]">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                  Contraseña
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-[var(--color-destructive)]">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="passwordConfirm" className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                  Repetir contraseña
                </label>
                <Input
                  id="passwordConfirm"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.passwordConfirm}
                  {...register('passwordConfirm')}
                />
                {errors.passwordConfirm && (
                  <p className="mt-1 text-sm text-[var(--color-destructive)]">
                    {errors.passwordConfirm.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Registrando...' : 'Registrarse'}
              </Button>
            </form>

            <p className="mt-2 text-center text-sm text-[var(--color-muted-foreground)]">
              <Link to="/login" className="hover:underline text-[var(--color-primary)]">
                Iniciar sesión
              </Link>
              {' · '}
              <Link to="/" className="hover:underline text-[var(--color-primary)]">
                Inicio
              </Link>
            </p>
          </SurfaceCard>
        </div>
      </main>
    </div>
  );
}
