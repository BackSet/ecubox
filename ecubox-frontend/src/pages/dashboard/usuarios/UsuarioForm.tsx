import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRoles } from '@/hooks/useRoles';
import { useUsuario, useCreateUsuario, useUpdateUsuario } from '@/hooks/useUsuarios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { SectionTitle } from '@/components/SectionTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { emailOpcionalSchema } from '@/lib/validation';

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? { email: '', enabled: true, roleIds: [] }
      : { username: '', password: '', email: '', enabled: true, roleIds: [] },
  });

  useEffect(() => {
    if (isEdit && usuario) {
      form.reset({
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

  async function onSubmit(values: FormValues) {
    if (!isEdit && (!values.username?.trim() || !values.password?.trim())) {
      if (!values.username?.trim()) form.setError('username', { message: 'El usuario es obligatorio' });
      if (!values.password?.trim()) form.setError('password', { message: 'La contraseña es obligatoria' });
      return;
    }
    try {
      if (isEdit && id != null) {
        await updateMutation.mutateAsync({
          id,
          body: {
            password: values.password || undefined,
            email: values.email || undefined,
            enabled: values.enabled,
            roleIds: values.roleIds,
          },
        });
      } else {
        await createMutation.mutateAsync({
          username: values.username!,
          password: values.password!,
          email: values.email || undefined,
          enabled: values.enabled,
          roleIds: values.roleIds ?? [],
        });
      }
      onSuccess();
    } catch {
      // Error shown by mutation or toast
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {!isEdit && (
            <>
              <SectionTitle variant="form">Datos de acceso</SectionTitle>
              <div className="space-y-4">
                <div>
                  <Label className="mb-1 block">
                    Usuario
                  </Label>
                  <Input
                    {...form.register('username')}
                  />
                  {form.formState.errors.username && (
                    <p className="mt-1 text-sm text-[var(--color-destructive)]">
                      {form.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="mb-1 block">
                    Contraseña
                  </Label>
                  <Input
                    type="password"
                    {...form.register('password')}
                  />
                  {form.formState.errors.password && (
                    <p className="mt-1 text-sm text-[var(--color-destructive)]">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
          {isEdit && (
            <div>
              <SectionTitle variant="form">Cambiar contraseña</SectionTitle>
              <Label className="mb-1 block">
                Nueva contraseña (opcional)
              </Label>
              <Input
                type="password"
                {...form.register('password')}
                placeholder="Dejar en blanco para no cambiar"
              />
            </div>
          )}
          <SectionTitle variant="form">Datos y estado</SectionTitle>
          <div className="space-y-4">
            <div>
              <Label className="mb-1 block">
                Email
              </Label>
              <Input
                type="email"
                {...form.register('email')}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="enabled"
                checked={form.watch('enabled')}
                onCheckedChange={(checked) => form.setValue('enabled', Boolean(checked))}
              />
              <Label htmlFor="enabled">
                Activo
              </Label>
            </div>
          </div>
          <div>
            <SectionTitle variant="form">Roles</SectionTitle>
            <div className="flex flex-wrap gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-3">
              {roles.map((rol) => (
                <label key={rol.id} className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={form.watch('roleIds')?.includes(rol.id) ?? false}
                    onCheckedChange={(checked) => {
                      const prev = form.getValues('roleIds') ?? [];
                      const next = checked
                        ? [...prev, rol.id]
                        : prev.filter((id) => id !== rol.id);
                      form.setValue('roleIds', next);
                    }}
                  />
                  <span className="text-sm text-[var(--color-foreground)]">{rol.nombre}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
