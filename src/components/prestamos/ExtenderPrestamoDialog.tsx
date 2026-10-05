"use client";

import { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFechaCO } from "@/lib/dates";
import { pisoExtension } from "@/lib/prestamos";
import { toISODate } from "@/lib/recursos";

interface ExtenderPrestamoDialogProps {
  prestamoId: number;
  recursoNombre: string;
  qr: string;
  /** Pactada actual 'YYYY-MM-DD'. */
  fechaDevolucion: string;
  onClose: () => void;
  /** Éxito confirmado: el padre refresca la tabla. */
  onDone: () => void;
}

/**
 * Modal de extensión (solo admin). Autocontenido: fetch, errores y éxito viven aquí;
 * el padre lo remonta con key por apertura y refresca en onDone.
 * Regla espejo del servidor: nueva fecha estrictamente posterior a max(pactada, hoy).
 */
export function ExtenderPrestamoDialog({
  prestamoId,
  recursoNombre,
  qr,
  fechaDevolucion,
  onClose,
  onDone,
}: ExtenderPrestamoDialogProps) {
  const [piso] = useState(() => pisoExtension(fechaDevolucion));
  const [fecha, setFecha] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [serverError, setServerError] = useState("");
  const [exito, setExito] = useState<string | null>(null);

  async function handleConfirm() {
    if (!fecha) {
      setError("Selecciona la nueva fecha de devolución.");
      return;
    }
    const iso = toISODate(fecha);
    if (iso < piso) {
      setError("La nueva fecha debe ser posterior a la devolución pactada.");
      return;
    }
    setError("");
    setServerError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/prestamos/${prestamoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "extender", nuevaFechaDevolucion: iso }),
      });
      if (!res.ok) {
        try {
          const body = await res.json();
          setServerError(typeof body.error === "string" ? body.error : "Operación fallida.");
        } catch {
          setServerError("Operación fallida.");
        }
        return;
      }
      setExito(iso);
    } catch {
      setServerError("No se pudo completar la operación.");
    } finally {
      setSaving(false);
    }
  }

  if (exito) {
    return (
      <Dialog open onOpenChange={(v) => !v && onDone()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Préstamo extendido</DialogTitle>
            <DialogDescription>
              La fecha de devolución fue actualizada al {formatFechaCO(exito)}. Se regeneró el
              contrato y se notificó al prestatario.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onDone} className="bg-green-700 text-white hover:bg-green-800">
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extender préstamo</DialogTitle>
          <DialogDescription>
            Recurso: {recursoNombre} ({qr}). Devolución pactada: {formatFechaCO(fechaDevolucion)}.
            Elige la nueva fecha (posterior a la pactada).
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <DayPicker
            mode="single"
            selected={fecha}
            onSelect={setFecha}
            disabled={[{ before: new Date(`${piso}T00:00:00`) }]}
            weekStartsOn={1}
          />
        </div>

        {(error || serverError) && (
          <p className="text-sm font-medium text-red-600">{error || serverError}</p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !fecha}>
            {saving ? "Extendiendo…" : "Confirmar extensión"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
