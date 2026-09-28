"use client";

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  cedula,
  telefono,
  cedulaActual,
  telefonoActual,
  firmaLista,
  error,
  guardando,
  onCedula,
  onTelefono,
  onGuardar,
}: {
  cedula: string;
  telefono: string;
  cedulaActual: string | null;
  telefonoActual: string | null;
  firmaLista: boolean;
  error: string | null;
  guardando: boolean;
  onCedula: (v: string) => void;
  onTelefono: (v: string) => void;
  onGuardar: () => void;
}) {
  // Teléfono previo válido (10 dígitos) se muestra estático e inmodificable;
  // si falta o no cumple la regla, se pide en el input hasta completar 10.
  const telefonoPrevioValido = !!telefonoActual && /^[0-9]{10}$/.test(telefonoActual);
  const puedeGuardar =
    (cedulaActual ?? cedula).length > 0 &&
    (telefonoPrevioValido || telefono.length === 10) &&
    firmaLista &&
    !guardando;

  return (
    <div className="rounded-[10px] border-l-2 border-brand-700 bg-zinc-50 p-4 dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
          <Label htmlFor="cedula" className="shrink-0 sm:w-20">
            Cédula:
          </Label>
          {cedulaActual ? (
            <p className="text-sm text-zinc-600 sm:text-base dark:text-zinc-300">{cedulaActual}</p>
          ) : (
            <Input
              id="cedula"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Ingrese su cédula"
              value={cedula}
              onChange={(e) => onCedula(e.target.value.replace(/[^0-9]/g, ""))}
            />
          )}
        </div>

        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
          <Label htmlFor="telefono" className="shrink-0 sm:w-20">
            Teléfono:
          </Label>
          {telefonoPrevioValido ? (
            <p className="text-sm text-zinc-600 sm:text-base dark:text-zinc-300">{telefonoActual}</p>
          ) : (
            <Input
              id="telefono"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Ingrese su teléfono"
              maxLength={10}
              value={telefono}
              onChange={(e) => onTelefono(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
            />
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="button" onClick={onGuardar} disabled={!puedeGuardar} className="w-full">
          <Save />
          Guardar
        </Button>
      </div>
    </div>
  );
}
