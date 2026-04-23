import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { useEffect, useMemo, useState } from 'react';
import { notify } from '@/lib/notify';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';

import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { registerClienteSimple } from '@/lib/api/auth.service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PASSWORD_MIN_LENGTH = 6;

const schema = z
  .object({
    email: z
      .string()
      .min(1, 'El correo es requerido')
      .email('Correo electrónico no válido'),
    password: z
      .string()
      .min(
        PASSWORD_MIN_LENGTH,
        `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
      ),
    passwordConfirm: z.string().min(1, 'Repite la contraseña'),
    acceptTerms: z.literal(true, {
      message: 'Debes aceptar los términos para continuar',
    }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirm'],
  });

type FormValues = z.infer<typeof schema>;

const HIGHLIGHTS = [
  {
    icon: Sparkles,
    title: 'Tu casillero al instante',
    description: 'Recibe la dirección de Miami para empezar a comprar online.',
  },
  {
    icon: Zap,
    title: 'Sin papeleos',
    description: 'Solo necesitas un correo y una contraseña para crear tu cuenta.',
  },
  {
    icon: ShieldCheck,
    title: 'Tus datos protegidos',
    description: 'Cifrado de extremo a extremo y acceso seguro a tu panel.',
  },
] as const;

interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

function computeStrength(pwd: string): PasswordStrength {
  if (!pwd) return { score: 0, label: 'Vacía' };
  let s = 0;
  if (pwd.length >= 6) s++;
  if (pwd.length >= 10) s++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) s++;
  const score = Math.min(4, s) as 0 | 1 | 2 | 3 | 4;
  const labels = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte'];
  return { score, label: labels[score] };
}

function StrengthBar({ strength }: { strength: PasswordStrength }) {
  const colors = [
    'bg-[var(--color-destructive)]',
    'bg-[var(--color-destructive)]',
    'bg-[var(--color-warning)]',
    'bg-[var(--color-primary)]',
    'bg-[var(--color-success)]',
  ];
  const textColors = [
    'text-[var(--color-destructive)]',
    'text-[var(--color-destructive)]',
    'text-[var(--color-warning)]',
    'text-[var(--color-primary)]',
    'text-[var(--color-success)]',
  ];
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < strength.score ? colors[strength.score] : 'bg-[var(--color-muted)]',
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          'text-[10px] font-medium uppercase tracking-wider',
          textColors[strength.score],
        )}
      >
        {strength.label}
      </span>
    </div>
  );
}

function Requirement({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-xs landing-text-muted">
      <span
        className={cn(
          'inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition',
          ok
            ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
            : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
        )}
      >
        {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      </span>
      <span className={cn(ok && 'line-through opacity-70')}>{label}</span>
    </li>
  );
}

export function RegistroSimplePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      passwordConfirm: '',
      acceptTerms: undefined as unknown as true,
    },
  });

  // Pre-poblar email desde query param ?email=
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) setValue('email', emailParam);
  }, [setValue]);

  const watchedPassword = watch('password');
  const watchedConfirm = watch('passwordConfirm');
  const strength = useMemo(
    () => computeStrength(watchedPassword),
    [watchedPassword],
  );
  const passwordsMatch =
    watchedPassword.length > 0 && watchedPassword === watchedConfirm;

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      await notify.run(
        registerClienteSimple({
          email: values.email,
          password: values.password,
        }),
        {
          loading: 'Creando cuenta...',
          success: 'Cuenta creada. Ya puedes iniciar sesión.',
          error: (err) => {
            const status = (err as { response?: { status?: number } })?.response?.status;
            return status === 409
              ? 'Este correo ya está registrado'
              : 'No se pudo crear la cuenta. Intenta de nuevo.';
          },
        },
      );
      navigate({ to: '/login' });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError('Este correo ya está registrado. Prueba a iniciar sesión.');
      } else {
        setError('Error al registrarse. Intenta de nuevo.');
      }
    }
  }

  return (
    <div className="landing-shell">
      <div className="landing-overlay" />
      <SiteHeader variant="auth" />

      <main className="relative z-10 mobile-safe-inline flex-1 py-6 sm:py-10">
        <div className="content-container-wide grid w-full gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
          {/* Panel marketing (izquierda) */}
          <aside className="hidden flex-col gap-7 lg:flex">
            <span className="landing-chip inline-flex w-fit items-center gap-2 px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              <span className="landing-text-muted text-xs uppercase tracking-wider">
                Crea tu cuenta gratis
              </span>
            </span>
            <h1 className="responsive-title landing-text font-bold leading-tight">
              Empieza a recibir tus compras{' '}
              <span className="brand-gradient-text">
                desde EE. UU.
              </span>
            </h1>
            <p className="landing-text-muted max-w-md text-base">
              Activa tu casillero personal en menos de un minuto y desbloquea todas
              las funciones de seguimiento y envío.
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
                  Crear cuenta
                </h2>
                <p className="mt-1 text-sm landing-text-muted">
                  Solo necesitas un correo y una contraseña.
                </p>
              </div>

              <div className="px-5 py-6 sm:px-6 sm:py-7">
                <form
                  onSubmit={handleSubmit(onSubmit)}
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

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-medium landing-text"
                    >
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
                        style={{ width: 16, height: 16 }}
                        aria-hidden
                      />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="tu@correo.com"
                        aria-invalid={!!errors.email}
                        className="h-11 pl-9"
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[var(--color-destructive)]">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-sm font-medium landing-text"
                    >
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
                        style={{ width: 16, height: 16 }}
                        aria-hidden
                      />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Mínimo 6 caracteres"
                        aria-invalid={!!errors.password}
                        className="h-11 pl-9 pr-10"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                        aria-label={
                          showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {watchedPassword.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <StrengthBar strength={strength} />
                        <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
                          <Requirement
                            ok={watchedPassword.length >= 6}
                            label="6+ caracteres"
                          />
                          <Requirement
                            ok={watchedPassword.length >= 10}
                            label="10+ caracteres"
                          />
                          <Requirement
                            ok={
                              /[A-Z]/.test(watchedPassword) &&
                              /[a-z]/.test(watchedPassword)
                            }
                            label="May. y minús."
                          />
                          <Requirement
                            ok={
                              /\d/.test(watchedPassword) &&
                              /[^A-Za-z0-9]/.test(watchedPassword)
                            }
                            label="Número y símbolo"
                          />
                        </ul>
                      </div>
                    )}
                    {errors.password && (
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[var(--color-destructive)]">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="passwordConfirm"
                      className="mb-1.5 block text-sm font-medium landing-text"
                    >
                      Repetir contraseña
                    </label>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
                        style={{ width: 16, height: 16 }}
                        aria-hidden
                      />
                      <Input
                        id="passwordConfirm"
                        type={showConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Vuelve a escribirla"
                        aria-invalid={!!errors.passwordConfirm}
                        className={cn(
                          'h-11 pl-9 pr-16',
                          passwordsMatch &&
                            'border-[var(--color-success)] focus-visible:ring-[var(--color-success)]/40',
                        )}
                        {...register('passwordConfirm')}
                      />
                      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                        {passwordsMatch && (
                          <CheckCircle2
                            className="h-4 w-4 text-[var(--color-success)]"
                            aria-label="Las contraseñas coinciden"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                          aria-label={
                            showConfirm
                              ? 'Ocultar contraseña'
                              : 'Mostrar contraseña'
                          }
                        >
                          {showConfirm ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    {errors.passwordConfirm && (
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[var(--color-destructive)]">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.passwordConfirm.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="flex cursor-pointer items-start gap-2 text-sm landing-text">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/40"
                        {...register('acceptTerms')}
                      />
                      <span className="leading-snug">
                        Acepto los{' '}
                        <Link
                          to="/terminos"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[var(--color-primary)] hover:underline"
                        >
                          términos y condiciones
                        </Link>{' '}
                        y la{' '}
                        <Link
                          to="/privacidad"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[var(--color-primary)] hover:underline"
                        >
                          política de privacidad
                        </Link>{' '}
                        de ECUBOX.
                      </span>
                    </label>
                    {errors.acceptTerms && (
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[var(--color-destructive)]">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.acceptTerms.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 w-full gap-2 text-base"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creando cuenta...
                      </>
                    ) : (
                      <>
                        Crear cuenta
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[var(--color-landing-border)]" />
                  <span className="text-xs landing-text-muted">o</span>
                  <div className="h-px flex-1 bg-[var(--color-landing-border)]" />
                </div>

                <p className="text-center text-sm landing-text-muted">
                  ¿Ya tienes cuenta?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    Iniciar sesión
                  </Link>
                </p>
              </div>
            </div>

            <p className="mt-4 text-center text-xs landing-text-muted">
              Tu información se guarda de forma segura y no compartimos tus datos.
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
