"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ProfilePhoto } from "./ProfilePhoto";
import { ProfileForm } from "./ProfileForm";
import { SignatureSection } from "./SignatureSection";
import {
  getEstadoPerfil,
  mockPerfilCompleto,
  mockPerfilIncompleto,
  type FirmaPendiente,
  type PerfilUsuario,
} from "@/mocks/perfil";

export function PerfilView({ initial }: { initial: PerfilUsuario }) {
  const [usuario, setUsuario] = useState<PerfilUsuario>(initial);
  const [simularCompleto, setSimularCompleto] = useState(false);
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [firmaPendiente, setFirmaPendiente] = useState<FirmaPendiente | null>(null);
  const [error, setError] = useState<string | null>(null);

  const base = simularCompleto ? mockPerfilCompleto : mockPerfilIncompleto;
  const incompleto = getEstadoPerfil(usuario) === "incompleto";

  function handleToggle(checked: boolean) {
    setSimularCompleto(checked);
    setUsuario(checked ? mockPerfilCompleto : mockPerfilIncompleto);
    setCedula("");
    setTelefono("");
    setFirmaPendiente(null);
    setError(null);
  }

  function handleFoto(fotoUrl: string) {
    setUsuario((u) => ({ ...u, fotoUrl }));
  }

  function handleFirma(firma: FirmaPendiente) {
    setFirmaPendiente(firma);
    setError(null);
  }

  function handleGuardar() {
    setUsuario((u) => ({
      ...u,
      cedula,
      telefono,
      firmaUrl: firmaPendiente?.previewUrl ?? u.firmaUrl,
    }));
    setCedula("");
    setTelefono("");
    setFirmaPendiente(null);
  }

  return (
    <div className="rounded-[18px] bg-white/90 px-4 py-8 shadow-[0_10px_35px_rgba(0,0,0,0.08)] sm:px-8 dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800">
      <div className="mb-4 flex justify-end">
        <div className="flex items-center gap-2 rounded-[10px] border border-dashed border-brand-700/40 bg-brand-50 px-3 py-2 dark:bg-zinc-950">
          <Label htmlFor="toggle-perfil">Perfil Completo</Label>
          <Switch id="toggle-perfil" checked={simularCompleto} onCheckedChange={handleToggle} aria-label="Alternar entre perfil incompleto y completo" />
        </div>
      </div>

      <PageHeader title="Perfil de Usuario" />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-4">
          <ProfilePhoto fotoUrl={usuario.fotoUrl ?? base.fotoUrl} nombre={usuario.nombre} onChange={handleFoto} />
          <SignatureSection
            firmaUrl={usuario.firmaUrl}
            pendiente={firmaPendiente}
            editable={incompleto}
            onFirma={handleFirma}
            onError={setError}
          />
        </div>

        <div className="flex flex-col gap-4">
          <dl className="rounded-[10px] border-l-2 border-brand-700 bg-zinc-50 p-4 dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
            <div className="flex flex-col gap-2 text-sm sm:text-base">
              <div className="flex gap-2">
                <dt className="font-semibold text-brand-700 dark:text-brand-100">Nombre:</dt>
                <dd className="text-zinc-600 dark:text-zinc-300">{usuario.nombre}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-brand-700 dark:text-brand-100">Código:</dt>
                <dd className="text-zinc-600 dark:text-zinc-300">{usuario.codigo}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-brand-700 dark:text-brand-100">Rol:</dt>
                <dd className="text-zinc-600 dark:text-zinc-300">{usuario.rolLabel}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-brand-700 dark:text-brand-100">Programa:</dt>
                <dd className="text-zinc-600 dark:text-zinc-300">{usuario.programa}</dd>
              </div>
            </div>
          </dl>

          {incompleto ? (
            <ProfileForm
              cedula={cedula}
              telefono={telefono}
              firmaLista={Boolean(firmaPendiente?.previewUrl ?? usuario.firmaUrl)}
              error={error}
              onCedula={setCedula}
              onTelefono={setTelefono}
              onGuardar={handleGuardar}
            />
          ) : (
            <dl className="rounded-[10px] border-l-2 border-brand-700 bg-zinc-50 p-4 dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
              <div className="flex flex-col gap-2 text-sm sm:text-base">
                <div className="flex gap-2">
                  <dt className="font-semibold text-brand-700 dark:text-brand-100">Cédula:</dt>
                  <dd className="text-zinc-600 dark:text-zinc-300">{usuario.cedula}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-semibold text-brand-700 dark:text-brand-100">Teléfono:</dt>
                  <dd className="text-zinc-600 dark:text-zinc-300">{usuario.telefono}</dd>
                </div>
              </div>
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
