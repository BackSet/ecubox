import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from '@tanstack/react-router';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { EcuboxLogo } from '@/components/brand';
import { login } from '@/lib/api/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const REMEMBER_KEY = 'ecubox-login-remember';

const loginSchema = z.object({
  username: z.string().min(1, 'El usuario o correo es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: 'Acceso seguro',
    description: 'Sesión protegida con tokens y expiración automática.',
  },
  {
    icon: Sparkles,
    title: 'Tu panel personal',
    description: 'Consulta envíos, paquetes y movimientos en un solo lugar.',
  },
] as const;

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [remember, setRemember] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        form.setValue('username', saved);
        setRemember(true);
      }
    } catch {
      // ignorar errores de storage
    }
  }, [form]);

  function detectCapsLock(e: React.KeyboardEvent<HTMLInputElement>) {
    if (typeof e.getModifierState === 'function') {
      setCapsLock(e.getModifierState('CapsLock'));
    }
  }

  async function onSubmit(values: LoginFormValues) {
    setError(null);
    try {
      const data = await login(values);
      setAuth(data);
      try {
        if (remember) {
          window.localStorage.setItem(REMEMBER_KEY, values.username);
        } else {
          window.localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {
        // ignorar
      }
      navigate({ to: '/inicio' });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setError('Usuario/correo o contraseña incorrectos');
      } else if (status === 429) {
        setError('Demasiados intentos. Intenta de nuevo en unos segundos.');
      } else {
        setError('Error al iniciar sesión. Intenta de nuevo.');
      }
    }
  }

  return (
    <div className="landing-shell">
      <div className="landing-overlay" />
      <header className="relative z-10 border-b border-[var(--color-landing-border)] bg-[color-mix(in_oklab,var(--color-landing-bg)_82%,transparent)] backdrop-blur-md">
        <div className="content-container-wide mobile-safe-inline flex items-center justify-between gap-3 py-3 sm:py-4">
          <Link
            to="/"
            className="-m-1 inline-flex rounded-lg p-1 transition hover:bg-[var(--color-landing-card-muted)]"
            aria-label="ECUBOX - Inicio"
          >
            <EcuboxLogo variant="light" size="lg" asLink={false} />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium landing-text-muted transition hover:text-[var(--color-primary)] sm:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="relative z-10 mobile-safe-inline flex-1 py-6 sm:py-10">
        <div className="content-container-wide grid w-full gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
          {/* Panel marketing (izquierda) */}
          <aside className="hidden flex-col gap-7 lg:flex">
            <span className="landing-chip inline-flex w-fit items-center gap-2 px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              <span className="landing-text-muted text-xs uppercase tracking-wider">
                Bienvenido de nuevo
              </span>
            </span>
            <h1 className="landing-text text-3xl font-bold leading-tight xl:text-4xl">
              Tu casillero, tus envíos,{' '}
              <span className="bg-gradient-to-br from-[var(--color-primary)] to-[#5B9CFF] bg-clip-text text-transparent">
                en un solo lugar.
              </span>
            </h1>
            <p className="landing-text-muted max-w-md text-base">
              Inicia sesión para administrar tus envíos, ver el estado en tiempo real
              y consultar tu historial completo.
            </p>

            <ul className="space-y-3">
              {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
                <li key={title} className="landing-card flex items-start gap-3 p-4">
                  <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                    <Icon className="h-5 w-5" strokeWidth={1.7} />
                  </span>
                  <div>
                    <p className="landing-text text-sm font-semibold">{title}</p>
                    <p className="landing-text-muted text-sm">{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>

          {/* Formulario (derecha) */}
          <div className="mx-auto w-full max-w-md">
            <div className="landing-card overflow-hidden">
              <div className="border-b border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)]/60 px-5 py-5 sm:px-6 sm:py-6">
                <h2 className="text-xl font-bold landing-text sm:text-2xl">
                  Iniciar sesión
                </h2>
                <p className="mt-1 text-sm landing-text-muted">
                  Accede a tu panel de ECUBOX.
                </p>
              </div>

              <div className="px-5 py-6 sm:px-6 sm:py-7">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-5"
                    noValidate
                  >
                    {error && (
                      <div
                        role="alert"
                        className="flex items-start gap-2.5 rounded-lg border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/8 px-3.5 py-3 text-sm text-[var(--color-destructive)]"
                      >
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span className="leading-snug">{error}</span>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usuario o correo</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <UserRound
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
                                style={{ width: 16, height: 16 }}
                                aria-hidden
                              />
                              <Input
                                type="text"
                                autoComplete="username"
                                placeholder="usuario o tu@correo.com"
                                className="h-11 pl-9"
                                {...field}
                              />
                            </div>
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
                          <div className="flex items-center justify-between">
                            <FormLabel>Contraseña</FormLabel>
                            <button
                              type="button"
                              className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                              onClick={() =>
                                form.setError('password', {
                                  type: 'manual',
                                  message:
                                    'Si olvidaste tu contraseña, contacta al administrador para restablecerla.',
                                })
                              }
                            >
                              ¿Olvidaste tu contraseña?
                            </button>
                          </div>
                          <FormControl>
                            <div className="relative">
                              <Lock
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
                                style={{ width: 16, height: 16 }}
                                aria-hidden
                              />
                              <Input
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                placeholder="Tu contraseña"
                                className="h-11 pl-9 pr-10"
                                onKeyDown={detectCapsLock}
                                onKeyUp={detectCapsLock}
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                                aria-label={
                                  showPassword
                                    ? 'Ocultar contraseña'
                                    : 'Mostrar contraseña'
                                }
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          {capsLock && (
                            <p className="inline-flex items-center gap-1.5 text-xs text-[var(--color-warning)]">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Bloq Mayús está activado.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <label className="flex cursor-pointer items-center gap-2 text-sm landing-text">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/40"
                      />
                      Recordar mi usuario en este dispositivo
                    </label>

                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                      className="h-11 w-full gap-2 text-base"
                    >
                      {form.formState.isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        <>
                          Entrar
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[var(--color-landing-border)]" />
                  <span className="text-xs landing-text-muted">o</span>
                  <div className="h-px flex-1 bg-[var(--color-landing-border)]" />
                </div>

                <p className="text-center text-sm landing-text-muted">
                  ¿No tienes cuenta?{' '}
                  <Link
                    to="/registro"
                    className="font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    Crear una cuenta
                  </Link>
                </p>
              </div>
            </div>

            <p className="mt-4 text-center text-xs landing-text-muted">
              Al iniciar sesión aceptas nuestros términos y condiciones.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
