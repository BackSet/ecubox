import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';

import { SurfaceCard } from '@/components/ui/surface-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { updateMe } from '@/lib/api/auth.service';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { cn } from '@/lib/utils';

const PASSWORD_MIN_LENGTH = 6;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[var(--color-destructive)]">
      <AlertCircle className="h-3.5 w-3.5" />
      {message}
    </p>
  );
}

// ============== Cuenta ==============

const accountSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es obligatorio')
    .email('Correo electrónico no válido')
    .max(255, 'Demasiado largo'),
});

type AccountValues = z.infer<typeof accountSchema>;

function CuentaSection() {
  const { username, email, roles, createdAt, setProfile } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { email: email ?? '' },
  });

  useEffect(() => {
    reset({ email: email ?? '' });
  }, [email, reset]);

  async function onSubmit(values: AccountValues) {
    setServerError(null);
    try {
      const updated = await updateMe({ email: values.email.trim() });
      setProfile(updated);
      toast.success('Información actualizada');
      reset({ email: updated.email ?? '' });
    } catch (err) {
      const message = getApiErrorMessage(err) ?? 'No se pudo actualizar tu información';
      setServerError(message);
      toast.error(message);
    }
  }

  return (
    <SurfaceCard className="p-5 sm:p-6">
      <header className="mb-5 flex items-start gap-3 border-b border-[var(--color-border)] pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <UserIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            Información de la cuenta
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            Tu nombre de usuario es fijo. Puedes actualizar tu correo de contacto en cualquier
            momento.
          </p>
        </div>
        {createdAt && (
          <span className="hidden shrink-0 items-center gap-1.5 rounded-md bg-[var(--color-muted)] px-2.5 py-1 text-xs text-[var(--color-muted-foreground)] sm:inline-flex">
            <CalendarDays className="h-3.5 w-3.5" />
            Miembro desde {formatDate(createdAt)}
          </span>
        )}
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/8 px-3.5 py-3 text-sm text-[var(--color-destructive)]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span className="leading-snug">{serverError}</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
              Nombre de usuario
            </label>
            <Input value={username ?? ''} disabled readOnly className="h-10" />
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              No puede ser modificado
            </p>
          </div>

          <div>
            <label
              htmlFor="profile-email"
              className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]"
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
                id="profile-email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                aria-invalid={!!errors.email}
                className="h-10 pl-9"
                {...register('email')}
              />
            </div>
            <FieldError message={errors.email?.message} />
          </div>
        </div>

        {roles.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
              Roles asignados
            </label>
            <div className="flex flex-wrap gap-1.5">
              {roles.map((role) => (
                <Badge key={role} variant="secondary" className="text-[10px] uppercase tracking-wide">
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-4">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting || !isDirty}
            onClick={() => {
              reset({ email: email ?? '' });
              setServerError(null);
            }}
          >
            Descartar
          </Button>
          <Button type="submit" disabled={isSubmitting || !isDirty} className="gap-2">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar cambios
          </Button>
        </div>
      </form>
    </SurfaceCard>
  );
}

// ============== Seguridad ==============

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`)
      .max(100, 'Máximo 100 caracteres'),
    confirmPassword: z.string().min(1, 'Repite la nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña debe ser distinta de la actual',
    path: ['newPassword'],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

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
              i < strength.score ? colors[strength.score] : 'bg-[var(--color-muted)]'
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          'text-[10px] font-medium uppercase tracking-wider',
          textColors[strength.score]
        )}
      >
        {strength.label}
      </span>
    </div>
  );
}

function SeguridadSection() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPwd = watch('newPassword');
  const confirmPwd = watch('confirmPassword');
  const matches = newPwd.length > 0 && newPwd === confirmPwd;
  const strength = useMemo(() => computeStrength(newPwd), [newPwd]);

  async function onSubmit(values: PasswordValues) {
    setServerError(null);
    try {
      await updateMe({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Contraseña actualizada');
      reset();
    } catch (err) {
      const message = getApiErrorMessage(err) ?? 'No se pudo actualizar la contraseña';
      setServerError(message);
      toast.error(message);
    }
  }

  return (
    <SurfaceCard className="p-5 sm:p-6">
      <header className="mb-5 flex items-start gap-3 border-b border-[var(--color-border)] pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            Cambiar contraseña
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            Por seguridad necesitamos tu contraseña actual antes de cambiarla.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/8 px-3.5 py-3 text-sm text-[var(--color-destructive)]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span className="leading-snug">{serverError}</span>
          </div>
        )}

        <PasswordField
          id="current-password"
          label="Contraseña actual"
          autoComplete="current-password"
          show={showCurrent}
          toggle={() => setShowCurrent((v) => !v)}
          register={register('currentPassword')}
          error={errors.currentPassword?.message}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <PasswordField
              id="new-password"
              label="Nueva contraseña"
              autoComplete="new-password"
              placeholder={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres`}
              show={showNew}
              toggle={() => setShowNew((v) => !v)}
              register={register('newPassword')}
              error={errors.newPassword?.message}
            />
            {newPwd.length > 0 && (
              <div className="mt-2">
                <StrengthBar strength={strength} />
              </div>
            )}
          </div>
          <PasswordField
            id="confirm-password"
            label="Confirmar nueva contraseña"
            autoComplete="new-password"
            show={showConfirm}
            toggle={() => setShowConfirm((v) => !v)}
            register={register('confirmPassword')}
            error={errors.confirmPassword?.message}
            success={matches}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-4">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => {
              reset();
              setServerError(null);
            }}
          >
            Limpiar
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Actualizar contraseña
          </Button>
        </div>
      </form>
    </SurfaceCard>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  show: boolean;
  toggle: () => void;
  register: ReturnType<ReturnType<typeof useForm<PasswordValues>>['register']>;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
  success?: boolean;
}

function PasswordField({
  id,
  label,
  show,
  toggle,
  register,
  error,
  autoComplete,
  placeholder,
  success,
}: PasswordFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]"
      >
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={!!error}
          className={cn(
            'h-10 pr-16',
            success && 'border-[var(--color-success)] focus-visible:ring-[var(--color-success)]/40'
          )}
          {...register}
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {success && (
            <CheckCircle2
              className="h-4 w-4 text-[var(--color-success)]"
              aria-label="Las contraseñas coinciden"
            />
          )}
          <button
            type="button"
            onClick={toggle}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <FieldError message={error} />
    </div>
  );
}

// ============== Page ==============

export function PerfilPage() {
  const refreshAuth = useAuthStore((s) => s.refreshAuth);
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    refreshAuth().catch(() => {
      // Snapshot persistido es suficiente si la red falla.
    });
  }, [refreshAuth]);

  const handleLogout = () => {
    logout();
    navigate({ to: '/' });
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-foreground)] sm:text-2xl">
            Mi perfil
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            Actualiza tu correo y tu contraseña.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 sm:w-auto">
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </header>

      <CuentaSection />
      <SeguridadSection />
    </div>
  );
}
