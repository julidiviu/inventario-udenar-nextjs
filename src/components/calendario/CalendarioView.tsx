"use client";

import { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatFechaCO } from "@/lib/dates";
import { hoyBogota, toISODate } from "@/lib/recursos";

function aFecha(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function CalendarioView({ fechaInicial }: { fechaInicial: string | null }) {
  // El servidor pasa la fecha vigente; el estado local sigue la selección.
  const [actual, setActual] = useState<string | null>(fechaInicial);
  const [seleccion, setSeleccion] = useState<Date | undefined>(
    fechaInicial ? aFecha(fechaInicial) : undefined,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const hoy = hoyBogota();

  async function guardar(nueva: string | null) {
    setSaving(true);
    setError("");
    setDone("");
    try {
      const res = await fetch("/api/cierre", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: nueva }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : "No se pudo guardar.");
        return;
      }
      setActual(body.fecha as string | null);
      setDone(nueva ? `Cierre fijado al ${formatFechaCO(nueva)}.` : "Restricción eliminada.");
    } catch {
      setError("No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  function handleGuardar() {
    if (!seleccion) {
      setError("Selecciona una fecha en el calendario.");
      return;
    }
    const iso = toISODate(seleccion);
    if (iso < toISODate(hoy)) {
      setError("El cierre debe ser hoy o una fecha futura.");
      return;
    }
    void guardar(iso);
  }

  return (
    <div className="mx-auto w-full max-w-7xl rounded-[20px] bg-gradient-to-br from-white to-zinc-50 p-6 shadow-[0_25px_45px_rgba(0,0,0,0.08)] sm:p-10 dark:from-zinc-900 dark:to-zinc-950">
      <PageHeader title="Cierre de semestre" />
      <p className="mb-8 text-center text-sm text-zinc-500 sm:text-left dark:text-zinc-400">
        Fecha máxima elegible al solicitar o extender:{" "}
        <strong className="text-zinc-800 dark:text-zinc-100">
          {actual ? formatFechaCO(actual) : "Sin restricción"}
        </strong>
      </p>

      <div className="flex justify-center">
        <DayPicker
          mode="single"
          selected={seleccion}
          onSelect={setSeleccion}
          disabled={[{ before: hoy }]}
          weekStartsOn={1}
        />
      </div>

      {(error || done) && (
        <p className={`mt-4 text-center text-sm font-medium ${error ? "text-red-600" : "text-green-700 dark:text-green-400"}`}>
          {error || done}
        </p>
      )}

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Button onClick={handleGuardar} disabled={saving}>
          {saving ? "Guardando…" : "Guardar fecha"}
        </Button>
        {actual && (
          <Button variant="outline" onClick={() => void guardar(null)} disabled={saving}>
            Quitar restricción
          </Button>
        )}
      </div>
    </div>
  );
}
