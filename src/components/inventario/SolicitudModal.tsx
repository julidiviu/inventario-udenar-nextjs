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
import { addBusinessDays, type Recurso } from "./types";

interface SolicitudModalProps {
  open: boolean;
  recurso: Recurso | null;
  saving: boolean;
  serverError: string;
  onClose: () => void;
  onConfirm: (recurso: Recurso, fechaDevolucion: Date) => void;
}

// Fecha mínima: 5 días hábiles a partir de hoy (sábados y domingos no cuentan).
function minFecha(): Date {
  return addBusinessDays(new Date(), 5);
}

export function SolicitudModal({ open, recurso, saving, serverError, onClose, onConfirm }: SolicitudModalProps) {
  // El padre remonta con key por apertura: el estado inicial basta, sin effects.
  const [min] = useState(minFecha);
  const [fecha, setFecha] = useState<Date | undefined>(undefined);
  const [error, setError] = useState("");

  function handleConfirm() {
    if (!recurso || !fecha) {
      setError("Selecciona la fecha estimada de devolución.");
      return;
    }
    setError("");
    onConfirm(recurso, fecha);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar préstamo</DialogTitle>
          <DialogDescription>
            {recurso
              ? `Recurso: ${recurso.nombre} (${recurso.qr}). Elige la fecha estimada de devolución (mínimo 5 días hábiles).`
              : "Elige la fecha estimada de devolución."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <DayPicker
            mode="single"
            selected={fecha}
            onSelect={setFecha}
            disabled={[{ before: min }, { dayOfWeek: [0, 6] }]}
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
            {saving ? "Enviando…" : "Aceptar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
