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
import { CODIGO_RE, NOMBRE_MAX } from "@/lib/dependencias";
import type { AdminDisponible, Dependencia } from "./types";

export interface DependenciaFormData {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  administradorId: string | null;
}

interface DependenciaModalProps {
  open: boolean;
  initial: Dependencia | null;
  admins: AdminDisponible[];
  saving: boolean;
  serverError: string;
  onClose: () => void;
  onSave: (data: DependenciaFormData, file: File | null) => void;
}

const inputClass =
  "h-11 w-full rounded-[10px] border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-500/30 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export function DependenciaModal({ open, initial, admins, saving, serverError, onClose, onSave }: DependenciaModalProps) {
  // El padre remonta con key por apertura/edición: el estado inicial basta, sin effects.
  const [codigo, setCodigo] = useState(initial?.codigo ?? "");
  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? "");
  const [imagenUrl] = useState<string | null>(initial?.imagenUrl ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [administradorId, setAdministradorId] = useState(initial?.administradorId ?? "");
  const [error, setError] = useState("");

  function handleFile(next: File | undefined) {
    if (!next) return;
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!CODIGO_RE.test(codigo.trim())) {
      setError("El código debe ser un número de máximo 5 dígitos.");
      return;
    }
    if (!nombre.trim() || nombre.trim().length > NOMBRE_MAX) {
      setError("El nombre es requerido (máximo 100 caracteres).");
      return;
    }
    setError("");
    onSave(
      {
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim() ? descripcion.trim() : null,
        imagenUrl,
        administradorId: administradorId ? administradorId : null,
      },
      file,
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar dependencia" : "Crear dependencia"}</DialogTitle>
          <DialogDescription>
            {initial ? "Modifica los datos de la dependencia." : "Registra una nueva dependencia académica."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dep-codigo">Código de la dependencia</Label>
            <Input
              id="dep-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej. 34"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dep-nombre">Nombre de la dependencia</Label>
            <Input
              id="dep-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Ingeniería de Sistemas"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dep-descripcion">Descripción</Label>
            <textarea
              id="dep-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción (opcional)"
              rows={3}
              className={`${inputClass} h-auto py-2.5`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dep-imagen">Imagen / Foto</Label>
            <Input
              id="dep-imagen"
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {(preview ?? imagenUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview ?? imagenUrl ?? ""} alt="Vista previa" className="h-28 w-full rounded-[10px] object-cover" />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dep-admin">Administrador</Label>
            <select
              id="dep-admin"
              value={administradorId}
              onChange={(e) => setAdministradorId(e.target.value)}
              className={inputClass}
            >
              <option value="">Sin asignar</option>
              {initial?.administradorId &&
                !admins.some((a) => a.id === initial.administradorId) && (
                  <option value={initial.administradorId}>Administrador actual</option>
                )}
              {admins.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id === initial?.administradorId
                    ? `Administrador actual - ${a.nombreCompleto}`
                    : `${a.nombreCompleto} (${a.codigo})`}
                </option>
              ))}
            </select>
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
  );
}
