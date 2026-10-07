"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SignatureDialog } from "@/components/perfil/SignatureDialog";
import type { FirmaPendiente } from "@/lib/firma";
import {
  ADMIN_CEDULA_RE,
  ADMIN_CODIGO_RE,
  ADMIN_EMAIL_RE,
  ADMIN_MIN_PASSWORD,
  ADMIN_NOMBRE_MAX,
  ADMIN_PROGRAMA_MAX,
  ADMIN_TELEFONO_RE,
} from "@/lib/admins";

export interface AdminFormData {
  codigo: string;
  email: string;
  cedula: string | null;
  firstName: string;
  lastName: string;
  telefono: string | null;
  programa: string | null;
  firmaUrl: string | null;
  isActive: boolean;
  password: string;
}

interface AdminModalProps {
  open: boolean;
  /** Forma mínima para edición (la usan AdminRow y UsuarioRow). */
  initial: {
    id: string;
    codigo: string;
    email: string;
    cedula: string | null;
    firstName: string;
    lastName: string;
    telefono: string | null;
    programa: string | null;
    firmaUrl: string | null;
    isActive: boolean;
  } | null;
  saving: boolean;
  serverError: string;
  onClose: () => void;
  onSave: (data: AdminFormData, file: File | null) => void;
}

export function AdminModal({ open, initial, saving, serverError, onClose, onSave }: AdminModalProps) {
  // El padre remonta con key por apertura/edición: el estado inicial basta, sin effects.
  const [codigo, setCodigo] = useState(initial?.codigo ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [cedula, setCedula] = useState(initial?.cedula ?? "");
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [telefono, setTelefono] = useState(initial?.telefono ?? "");
  const [programa, setPrograma] = useState(initial?.programa ?? "");
  const [firmaUrl] = useState<string | null>(initial?.firmaUrl ?? null);
  const [firmaFile, setFirmaFile] = useState<File | null>(null);
  const [firmaPreview, setFirmaPreview] = useState<string | null>(null);
  const [firmaDialogOpen, setFirmaDialogOpen] = useState(false);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  function handleFirmaFile(next: File | undefined) {
    if (!next) return;
    setFirmaFile(next);
    setFirmaPreview(URL.createObjectURL(next));
  }

  function handleFirmaDrawn(firma: FirmaPendiente) {
    setFirmaFile(firma.file);
    setFirmaPreview(firma.previewUrl);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ADMIN_CODIGO_RE.test(codigo.trim())) {
      setError("El código tiene que ser numérico.");
      return;
    }
    if (!ADMIN_EMAIL_RE.test(email.trim().toLowerCase())) {
      setError("El correo no es válido.");
      return;
    }
    if (cedula.trim() && !ADMIN_CEDULA_RE.test(cedula.trim())) {
      setError("La cédula solo admite números.");
      return;
    }
    if (!firstName.trim() || firstName.trim().length > ADMIN_NOMBRE_MAX) {
      setError("Los nombres son requeridos (máximo 100 caracteres).");
      return;
    }
    if (!lastName.trim() || lastName.trim().length > ADMIN_NOMBRE_MAX) {
      setError("Los apellidos son requeridos (máximo 100 caracteres).");
      return;
    }
    if (telefono.trim() && !ADMIN_TELEFONO_RE.test(telefono.trim())) {
      setError("El teléfono debe tener 10 dígitos numéricos.");
      return;
    }
    if (initial && programa.trim().length > ADMIN_PROGRAMA_MAX) {
      setError("El programa no puede superar los 100 caracteres.");
      return;
    }
    // Contraseña: obligatoria al crear; opcional al editar (vacía = no cambia).
    if (!initial || password !== "") {
      if (password.length < ADMIN_MIN_PASSWORD) {
        setError(`La contraseña debe tener al menos ${ADMIN_MIN_PASSWORD} caracteres.`);
        return;
      }
      if (password !== confirm) {
        setError("Las contraseñas no coinciden.");
        return;
      }
    }
    setError("");
    onSave(
      {
        codigo: codigo.trim(),
        email: email.trim().toLowerCase(),
        cedula: cedula.trim() ? cedula.trim() : null,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        telefono: telefono.trim() ? telefono.trim() : null,
        programa: initial ? (programa.trim() ? programa.trim() : null) : null,
        firmaUrl,
        isActive: initial ? isActive : true,
        password,
      },
      firmaFile,
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar administrador" : "Crear administrador"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "Modifica los datos del administrador. Deja la contraseña vacía para no cambiarla."
              : "Registra un nuevo administrador. La dependencia se asigna desde Dependencias."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-codigo">Código</Label>
            <Input
              id="admin-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Ej. 1001"
              inputMode="numeric"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-email">Correo electrónico</Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ej. ana@udenar.edu.co"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-cedula">Cédula</Label>
            <Input
              id="admin-cedula"
              value={cedula}
              onChange={(e) => setCedula(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Opcional"
              inputMode="numeric"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-nombres">Nombres</Label>
              <Input
                id="admin-nombres"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ej. Ana"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-apellidos">Apellidos</Label>
              <Input
                id="admin-apellidos"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ej. Pérez"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-telefono">Teléfono</Label>
            <Input
              id="admin-telefono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
              placeholder="10 dígitos (opcional)"
              inputMode="numeric"
              maxLength={10}
            />
          </div>

          {initial && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-programa">Programa o facultad</Label>
              <Input
                id="admin-programa"
                value={programa}
                onChange={(e) => setPrograma(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          )}

          {initial && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-firma">Firma</Label>
              {(firmaPreview ?? firmaUrl) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={firmaPreview ?? firmaUrl ?? ""}
                  alt="Firma del administrador"
                  className="h-24 w-full rounded-[10px] border border-zinc-300 bg-white object-contain dark:border-zinc-700 dark:bg-zinc-200"
                />
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setFirmaDialogOpen(true)}>
                  {firmaUrl || firmaPreview ? "Cambiar dibujando" : "Dibujar firma"}
                </Button>
                <Input
                  id="admin-firma"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFirmaFile(e.target.files?.[0])}
                />
              </div>
            </div>
          )}

          {initial && (
            <div className="flex items-center justify-between rounded-[10px] border border-zinc-300 px-3 py-2.5 dark:border-zinc-700">
              <Label htmlFor="admin-activo">Cuenta activa</Label>
              <Switch id="admin-activo" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-password">{initial ? "Nueva contraseña" : "Contraseña"}</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={initial ? "Vacía = no cambia" : "Mínimo 8 caracteres"}
                required={!initial}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-confirm">Confirmar contraseña</Label>
              <Input
                id="admin-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={initial ? "Vacía = no cambia" : "Repite la contraseña"}
                required={!initial}
              />
            </div>
          </div>

          {(error || serverError) && (
            <p className="text-sm font-medium text-red-600">{error || serverError}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {initial && (
      <SignatureDialog
        open={firmaDialogOpen}
        onOpenChange={setFirmaDialogOpen}
        onSave={handleFirmaDrawn}
      />
    )}
    </>
  );
}
