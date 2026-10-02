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
import { QR_RE, RECURSO_DESCRIPCION_MAX, RECURSO_NOMBRE_MAX, TIPO_NOMBRE_MAX } from "@/lib/recursos";
import type { Recurso, TipoRecurso } from "./types";

export const OTRO_TIPO_VALUE = "__otro__";

export interface RecursoFormData {
  nombre: string;
  qr: string;
  tipoId: number | null;
  nuevoTipo: string | null;
  descripcion: string;
  fotoUrl: string | null;
}

interface RecursoModalProps {
  open: boolean;
  initial: Recurso | null;
  tipos: TipoRecurso[];
  saving: boolean;
  serverError: string;
  onClose: () => void;
  onSave: (data: RecursoFormData, file: File | null) => void;
}

const inputClass =
  "h-11 w-full rounded-[10px] border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-500/30 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export function RecursoModal({ open, initial, tipos, saving, serverError, onClose, onSave }: RecursoModalProps) {
  // El padre remonta con key por apertura/edición: el estado inicial basta, sin effects.
  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [qr, setQr] = useState(initial?.qr ?? "");
  const [tipoValue, setTipoValue] = useState(initial ? String(initial.tipoId) : "");
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? "");
  const [fotoUrl] = useState<string | null>(initial?.fotoUrl ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  function handleFile(next: File | undefined) {
    if (!next) return;
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || nombre.trim().length > RECURSO_NOMBRE_MAX) {
      setError("El nombre es requerido (máximo 100 caracteres).");
      return;
    }
    if (!QR_RE.test(qr.trim())) {
      setError("El código QR debe ser numérico de máximo 8 dígitos.");
      return;
    }
    if (!tipoValue) {
      setError("Selecciona el tipo de recurso.");
      return;
    }
    if (tipoValue === OTRO_TIPO_VALUE && (!nuevoTipo.trim() || nuevoTipo.trim().length > TIPO_NOMBRE_MAX)) {
      setError("Especifica el nombre del nuevo tipo (máximo 100 caracteres).");
      return;
    }
    if (!descripcion.trim() || descripcion.trim().length > RECURSO_DESCRIPCION_MAX) {
      setError("La descripción es requerida (máximo 800 caracteres).");
      return;
    }
    setError("");
    onSave(
      {
        nombre: nombre.trim(),
        qr: qr.trim(),
        tipoId: tipoValue === OTRO_TIPO_VALUE ? null : Number(tipoValue),
        nuevoTipo: tipoValue === OTRO_TIPO_VALUE ? nuevoTipo.trim() : null,
        descripcion: descripcion.trim(),
        fotoUrl,
      },
      file,
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar recurso" : "Agregar recurso"}</DialogTitle>
          <DialogDescription>
            {initial ? "Modifica los datos del recurso." : "Registra un nuevo recurso en el inventario."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rec-nombre">Nombre</Label>
            <Input
              id="rec-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Microscopio óptico"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rec-qr">Código QR</Label>
            <Input
              id="rec-qr"
              value={qr}
              onChange={(e) => setQr(e.target.value)}
              placeholder="Ej. 12345678"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rec-tipo">Tipo de Recurso</Label>
            <select
              id="rec-tipo"
              value={tipoValue}
              onChange={(e) => setTipoValue(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Selecciona un tipo</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
              <option value={OTRO_TIPO_VALUE}>Otro: Especificar nuevo tipo</option>
            </select>
          </div>

          {tipoValue === OTRO_TIPO_VALUE && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rec-nuevo-tipo">Nuevo tipo</Label>
              <Input
                id="rec-nuevo-tipo"
                value={nuevoTipo}
                onChange={(e) => setNuevoTipo(e.target.value)}
                placeholder="Ej. Instrumentos"
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rec-descripcion">Descripción</Label>
            <textarea
              id="rec-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción corta del recurso"
              rows={3}
              className={`${inputClass} h-auto py-2.5`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rec-imagen">Imagen</Label>
            <Input
              id="rec-imagen"
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {(preview ?? fotoUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview ?? fotoUrl ?? ""} alt="Vista previa" className="h-28 w-full rounded-[10px] object-cover" />
            )}
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
