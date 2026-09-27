"use client";

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  cedula,
  telefono,
  firmaLista,
  error,
  onCedula,
  onTelefono,
  onGuardar,
}: {
  cedula: string;
  telefono: string;
  firmaLista: boolean;
  error: string | null;
  onCedula: (v: string) => void;
  onTelefono: (v: string) => void;
  onGuardar: () => void;
}) {
  const puedeGuardar = cedula.length > 0 && telefono.length > 0 && firmaLista;

  return (
    <div className="rounded-[10px] border-l-2 border-brand-700 bg-zinc-50 p-4 dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
          <Label htmlFor="cedula" className="shrink-0 sm:w-20">
            Cédula:
          </Label>
          <Input
            id="cedula"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ingrese su cédula"
            value={cedula}
            onChange={(e) => onCedula(e.target.value.replace(/[^0-9]/g, ""))}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
          <Label htmlFor="telefono" className="shrink-0 sm:w-20">
            Teléfono:
          </Label>
          <Input
            id="telefono"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ingrese su teléfono"
            maxLength={10}
            value={telefono}
            onChange={(e) => onTelefono(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
          />
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
