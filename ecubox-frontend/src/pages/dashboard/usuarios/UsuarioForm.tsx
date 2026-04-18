import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  AlertCircle,
  AtSign,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Loader2,
  Mail,
  Power,
  PowerOff,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRoles } from '@/hooks/useRoles';
import { useUsuario, useCreateUsuario, useUpdateUsuario } from '@/hooks/useUsuarios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { emailOpcionalSchema } from '@/lib/validation';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api/error-message';

const usernameRegex = /^[a-zA-Z0-9._-]+$/;

const formSchema = z.object({
  username: z.string().optional(),
  password: z.string().optional(),
  email: emailOpcionalSchema,
  enabled: z.boolean(),
  roleIds: z.array(z.number()),
});

type FormValues = z.infer<typeof formSchema>;

interface UsuarioFormProps {
  id?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function UsuarioForm({ id, onClose, onSuccess }: UsuarioFormProps) {
  const isEdit = id != null;
  const { data: usuario } = useUsuario(id);
  const { data: roles = [] } = useRoles();
  const createMutation = useCreateUsuario();
  const updateMutation = useUpdateUsuario();

  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: isEdit
      ? { username: '', password: '', email: '', enabled: true, roleIds: [] }
      : { username: '', password: '', email: '', enabled: true, roleIds: [] },
  });

  useEffect(() => {
    if (isEdit && usuario) {
      form.reset({
        username: usuario.username ?? '',
        password: '',
        email: usuario.email ?? '',
        enabled: usuario.enabled,
        roleIds: [],
      });
    }
  }, [isEdit, usuario, form]);

  useEffect(() => {
    if (isEdit && usuario && roles.length > 0) {
      const roleIds = (usuario.roles ?? [])
        .map((name) => roles.find((r) => r.nombre === name)?.id)
        .filter((n): n is number => n != null);
      form.setValue('roleIds', roleIds);
    }
  }, [isEdit, usuario, roles, form]);

  const watchedUsername = form.watch('username') ?? '';
  const watchedPassword = form.watch('password') ?? '';
  const watchedEmail = form.watch('email') ?? '';
  const watchedEnabled = form.watch('enabled');
  const watchedRoleIds = form.watch('roleIds') ?? [];

  const usernameInvalid =
    !isEdit && watchedUsername.trim().length > 0 && !usernameRegex.test(watchedUsername.trim());
  const usernameLenInvalid =
    !isEdit && watchedUsername.trim().length > 0 && watchedUsername.trim().length < 3;
  const passwordLenInvalid =
    watchedPassword.length > 0 && watchedPassword.length < 6;

  const passwordStrength = useMemo(() => computeStrength(watchedPassword), [watchedPassword]);

  const rolesAgrupados = useMemo(() => {
    const sorted = [...roles].sort((a, b) => a.nombre.localeCompare(b.nombre));
    return sorted;
  }, [roles]);

  const rolesSeleccionados = useMemo(
    () => roles.filter((r) => watchedRoleIds.includes(r.id)),
    [roles, watchedRoleIds],
  );

  function generarPassword() {
    const length = 12;
    const lowers = 'abcdefghijkmnopqrstuvwxyz';
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const nums = '23456789';
    const sym = '!@#$%^&*';
    const all = lowers + uppers + nums + sym;
    let pwd = '';
    pwd += pick(uppers);
    pwd += pick(lowers);
    pwd += pick(nums);
    pwd += pick(sym);
    for (let i = pwd.length; i < length; i++) pwd += pick(all);
    pwd = pwd
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
    form.setValue('password', pwd, { shouldValidate: true, shouldDirty: true });
    setShowPassword(true);
    toast.success('Contraseña generada');
  }

  function pick(s: string) {
    return s.charAt(Math.floor(Math.random() * s.length));
  }

  function toggleRol(rolId: number) {
    const prev = form.getValues('roleIds') ?? [];
    const next = prev.includes(rolId)
      ? prev.filter((id) => id !== rolId)
      : [...prev, rolId];
    form.setValue('roleIds', next, { shouldDirty: true });
  }

  function selectAllRoles() {
    form.setValue(
      'roleIds',
      roles.map((r) => r.id),
      { shouldDirty: true },
    );
  }

  function clearRoles() {
    form.setValue('roleIds', [], { shouldDirty: true });
  }

  async function onSubmit(values: FormValues) {
    let hasError = false;
    if (!isEdit) {
      const u = (values.username ?? '').trim();
      const p = (values.password ?? '').trim();
      if (!u) {
        form.setError('username', { message: 'El usuario es obligatorio' });
        hasError = true;
      } else if (u.length < 3) {
        form.setError('username', { message: 'Mínimo 3 caracteres' });
        hasError = true;
      } else if (!usernameRegex.test(u)) {
        form.setError('username', {
          message: 'Solo letras, números, punto, guion y guion bajo',
        });
        hasError = true;
      }
      if (!p) {
        form.setError('password', { message: 'La contraseña es obligatoria' });
        hasError = true;
      } else if (p.length < 6) {
        form.setError('password', { message: 'Mínimo 6 caracteres' });
        hasError = true;
      }
    } else if ((values.password ?? '').length > 0 && (values.password ?? '').length < 6) {
      form.setError('password', { message: 'Mínimo 6 caracteres' });
      hasError = true;
    }
    if (hasError) return;

    try {
      if (isEdit && id != null) {
        await updateMutation.mutateAsync({
          id,
          body: {
            password: values.password?.trim() ? values.password.trim() : undefined,
            email: values.email?.trim() || undefined,
            enabled: values.enabled,
            roleIds: values.roleIds,
          },
        });
        toast.success('Usuario actualizado');
      } else {
        await createMutation.mutateAsync({
          username: values.username!.trim(),
          password: values.password!.trim(),
          email: values.email?.trim() || undefined,
          enabled: values.enabled,
          roleIds: values.roleIds ?? [],
        });
        toast.success('Usuario creado');
      }
      onSuccess();
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'No se pudo guardar el usuario');
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const errors = form.formState.errors;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              {isEdit ? (
                <UserCog className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle>
                {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? 'Actualiza correo, contraseña, estado de la cuenta y roles asignados.'
                  : 'Define las credenciales de acceso, datos de contacto y roles del nuevo usuario.'}
              </DialogDescription>
              {isEdit && usuario && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="h-5 rounded font-mono text-[11px] font-normal"
                  >
                    {usuario.username}
                  </Badge>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
                      usuario.enabled
                        ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]'
                        : 'border-[var(--color-muted-foreground)]/30 bg-[var(--color-muted)]/40 text-muted-foreground',
                    )}
                  >
                    {usuario.enabled ? (
                      <CheckCircle2 className="h-2.5 w-2.5" />
                    ) : (
                      <PowerOff className="h-2.5 w-2.5" />
                    )}
                    {usuario.enabled ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="text-[11px] text-muted-foreground">ID #{usuario.id}</span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Identidad */}
          <FormSection
            icon={<UserCircle2 className="h-4 w-4" />}
            title="Identidad"
            description="Nombre de usuario y correo electrónico para la cuenta."
          >
            <div className="space-y-4">
              <FormField
                label="Nombre de usuario"
                required={!isEdit}
                error={
                  errors.username?.message ??
                  (usernameLenInvalid
                    ? 'Mínimo 3 caracteres'
                    : usernameInvalid
                      ? 'Solo letras, números, punto, guion y guion bajo'
                      : undefined)
                }
                hint={
                  isEdit
                    ? 'El nombre de usuario no se puede modificar.'
                    : 'Entre 3 y 30 caracteres. Solo letras, números, punto, guion o guion bajo.'
                }
                icon={<AtSign className="h-3.5 w-3.5" />}
              >
                <Input
                  {...form.register('username')}
                  placeholder="Ej: maria.perez"
                  autoComplete="username"
                  disabled={isEdit}
                  aria-invalid={Boolean(errors.username) || usernameInvalid || usernameLenInvalid}
                />
              </FormField>

              <FormField
                label="Correo electrónico"
                error={errors.email?.message}
                hint="Opcional. Se usará para notificaciones y recuperación."
                icon={<Mail className="h-3.5 w-3.5" />}
              >
                <Input
                  type="email"
                  {...form.register('email')}
                  placeholder="usuario@ejemplo.com"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                />
              </FormField>
            </div>
          </FormSection>

          {/* Acceso */}
          <FormSection
            icon={<KeyRound className="h-4 w-4" />}
            title={isEdit ? 'Cambiar contraseña' : 'Credenciales de acceso'}
            description={
              isEdit
                ? 'Deja en blanco si no deseas cambiar la contraseña actual.'
                : 'Define una contraseña segura para el primer acceso del usuario.'
            }
          >
            <FormField
              label={isEdit ? 'Nueva contraseña' : 'Contraseña'}
              required={!isEdit}
              error={
                errors.password?.message ??
                (passwordLenInvalid ? 'Mínimo 6 caracteres' : undefined)
              }
              hint={isEdit ? 'Dejar vacío para no cambiar.' : 'Mínimo 6 caracteres.'}
            >
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    {...form.register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={
                      isEdit ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'
                    }
                    autoComplete={isEdit ? 'new-password' : 'new-password'}
                    className="pr-9 font-mono"
                    aria-invalid={Boolean(errors.password) || passwordLenInvalid}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute top-1/2 right-2 inline-flex -translate-y-1/2 items-center justify-center rounded p-1 text-muted-foreground transition-colors hover:bg-[var(--color-muted)] hover:text-foreground"
                    title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={generarPassword}
                  title="Generar contraseña aleatoria segura"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generar
                </Button>
              </div>
              {watchedPassword.length > 0 && (
                <PasswordStrengthBar strength={passwordStrength} />
              )}
            </FormField>
          </FormSection>

          {/* Estado */}
          <FormSection
            icon={watchedEnabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
            title="Estado de la cuenta"
            description="Controla si el usuario puede iniciar sesión."
          >
            <div
              className={cn(
                'flex items-center justify-between rounded-md border px-3 py-2.5 transition-colors',
                watchedEnabled
                  ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5'
                  : 'border-[var(--color-muted-foreground)]/20 bg-[var(--color-muted)]/30',
              )}
            >
              <div className="flex items-center gap-2">
                {watchedEnabled ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                ) : (
                  <PowerOff className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {watchedEnabled ? 'Cuenta activa' : 'Cuenta inactiva'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {watchedEnabled
                      ? 'El usuario podrá iniciar sesión normalmente.'
                      : 'El usuario no podrá acceder hasta que sea reactivado.'}
                  </p>
                </div>
              </div>
              <Switch
                checked={watchedEnabled}
                onCheckedChange={(checked) =>
                  form.setValue('enabled', Boolean(checked), { shouldDirty: true })
                }
                aria-label="Activar usuario"
              />
            </div>
          </FormSection>

          {/* Roles */}
          <FormSection
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Roles asignados"
            description="Define qué módulos y operaciones podrá realizar el usuario."
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{watchedRoleIds.length}</span>{' '}
                  de {roles.length} seleccionados
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={selectAllRoles}
                    disabled={roles.length === 0 || watchedRoleIds.length === roles.length}
                  >
                    Seleccionar todos
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={clearRoles}
                    disabled={watchedRoleIds.length === 0}
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Limpiar
                  </Button>
                </div>
              </div>

              {roles.length === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-4 text-center text-xs text-muted-foreground">
                  No hay roles disponibles. Crea roles desde el módulo de Roles.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {rolesAgrupados.map((rol) => {
                    const checked = watchedRoleIds.includes(rol.id);
                    return (
                      <button
                        key={rol.id}
                        type="button"
                        onClick={() => toggleRol(rol.id)}
                        className={cn(
                          'group flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition-colors',
                          checked
                            ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 text-foreground'
                            : 'border-[var(--color-border)] bg-[var(--color-card)] text-muted-foreground hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-muted)]/30',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                            checked
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                              : 'border-[var(--color-border)] bg-transparent',
                          )}
                        >
                          {checked && <Check className="h-3 w-3" />}
                        </span>
                        <Shield
                          className={cn(
                            'h-3.5 w-3.5 shrink-0',
                            checked ? 'text-[var(--color-primary)]' : 'text-muted-foreground',
                          )}
                        />
                        <span
                          className={cn(
                            'truncate font-medium',
                            checked ? 'text-foreground' : 'text-foreground/80',
                          )}
                        >
                          {rol.nombre}
                        </span>
                        {rol.permisos?.length ? (
                          <Badge
                            variant="outline"
                            className="ml-auto h-4 rounded px-1 text-[10px] font-normal"
                            title={`${rol.permisos.length} permisos`}
                          >
                            {rol.permisos.length}
                          </Badge>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </FormSection>

          {/* Vista previa */}
          {(watchedUsername.trim() || watchedEmail.trim() || rolesSeleccionados.length > 0) && (
            <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/15 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Info className="h-3 w-3" />
                Vista previa
              </div>
              <PreviewCard
                username={watchedUsername || usuario?.username || ''}
                email={watchedEmail}
                enabled={watchedEnabled}
                roles={rolesSeleccionados.map((r) => r.nombre)}
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : isEdit ? (
                'Guardar cambios'
              ) : (
                'Crear usuario'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Componentes auxiliares
// ============================================================================

interface FormSectionProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}

function FormSection({ icon, title, description, children }: FormSectionProps) {
  return (
    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <header className="mb-3 flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-[11px] text-muted-foreground">{description}</p>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function FormField({ label, required, error, hint, icon, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs text-foreground">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span>{label}</span>
        {required && <span className="text-[var(--color-destructive)]">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-xs text-[var(--color-destructive)]">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
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

function PasswordStrengthBar({ strength }: { strength: PasswordStrength }) {
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
      <span className={cn('text-[10px] font-medium', textColors[strength.score])}>
        {strength.label}
      </span>
    </div>
  );
}

interface PreviewCardProps {
  username?: string;
  email?: string;
  enabled: boolean;
  roles: string[];
}

function PreviewCard({ username, email, enabled, roles }: PreviewCardProps) {
  const initials = (username ?? '?')
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3">
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
            enabled
              ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
              : 'bg-[var(--color-muted)] text-muted-foreground',
          )}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p
              className={cn(
                'truncate text-sm font-medium',
                username?.trim() ? 'text-foreground' : 'italic text-muted-foreground',
              )}
            >
              {username?.trim() || 'Sin usuario'}
            </p>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
                enabled
                  ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]'
                  : 'border-[var(--color-muted-foreground)]/30 bg-[var(--color-muted)]/40 text-muted-foreground',
              )}
            >
              {enabled ? (
                <CheckCircle2 className="h-2.5 w-2.5" />
              ) : (
                <PowerOff className="h-2.5 w-2.5" />
              )}
              {enabled ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          {email?.trim() && (
            <p className="flex items-center gap-1.5 text-xs text-foreground">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{email.trim()}</span>
            </p>
          )}
          {roles.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              {roles.map((r) => (
                <Badge
                  key={r}
                  variant="outline"
                  className="h-5 rounded border-[var(--color-border)] bg-[var(--color-muted)]/30 px-1.5 text-[10px] font-medium text-foreground"
                >
                  <Shield className="mr-1 h-2.5 w-2.5" />
                  {r}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="inline-flex items-center gap-1 pt-0.5 text-[11px] italic text-muted-foreground">
              <Users className="h-3 w-3" />
              Sin roles asignados
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
