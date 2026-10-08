"use client";

import { useEffect, useState } from "react";
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
import { addBusinessDays, toISODate } from "@/lib/recursos";
import type { Recurso } from "./types";

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
  // Tope del superadmin (/calendario). Null = sin restricción.
  const [max, setMax] = useState<Date | null>(null);
  const [maxISO, setMaxISO] = useState<string | null>(null);

  // Autocontenido: el tope se lee al abrir (el servidor también lo valida).
  useEffect(() => {
    let vivo = true;
    fetch("/api/cierre")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (vivo && b && typeof b.fecha === "string") {
          const [y, m, d] = b.fecha.split("-").map(Number);
          setMax(new Date(y, m - 1, d));
          setMaxISO(b.fecha);
        }
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  function handleConfirm() {
    if (!recurso || !fecha) {
      setError("Selecciona la fecha estimada de devolución.");
      return;
    }
    if (maxISO && toISODate(fecha) > maxISO) {
      setError(`La fecha máxima es el ${formatFechaCO(maxISO)} (cierre de semestre).`);
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
              ? `Recurso: ${recurso.nombre} (${recurso.qr}). Elige la fecha estimada de devolución (mínimo 5 días hábiles${maxISO ? `, máximo ${formatFechaCO(maxISO)}` : ""}).`
              : "Elige la fecha estimada de devolución."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <DayPicker
            mode="single"
            selected={fecha}
            onSelect={setFecha}
            disabled={[{ before: min }, { dayOfWeek: [0, 6] }, ...(max ? [{ after: max }] : [])]}
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
