"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PhotoCropDialog } from "./PhotoCropDialog";
import { ProfileForm } from "./ProfileForm";
import { ProfilePhoto } from "./ProfilePhoto";
import { SignatureSection } from "./SignatureSection";
import type { FirmaPendiente } from "@/lib/firma";
import type { PerfilUsuario } from "@/lib/perfil";

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return typeof data?.error === "string" && data.error
      ? data.error
      : fallback;
  } catch {
    return fallback;
  }
}

async function subirArchivo(file: File, folder: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  form.append("kind", "foto");
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok)
    throw new Error(await readError(res, "No se pudo subir el archivo."));
  const data = await res.json();
  if (typeof data?.url !== "string")
    throw new Error("No se pudo subir el archivo.");
  return data.url;
}

async function guardarPerfil(
  body: Record<string, string>,
): Promise<PerfilUsuario> {
  const res = await fetch("/api/perfil", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(await readError(res, "No se pudo guardar el perfil."));
  const data = await res.json();
  return data.perfil as PerfilUsuario;
}

export function PerfilView({ initial }: { initial: PerfilUsuario }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<PerfilUsuario>(initial);
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [firmaPendiente, setFirmaPendiente] = useState<FirmaPendiente | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [fotoError, setFotoError] = useState<string | null>(null);
  const [recorte, setRecorte] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [exito, setExito] = useState(false);

  const incompleto = !(usuario.cedula && usuario.telefono && usuario.firmaUrl);

  function cerrarRecorte() {
    if (recorte) URL.revokeObjectURL(recorte);
    setRecorte(null);
  }

  async function handleFotoRecortada(file: File) {
    cerrarRecorte();
    setSubiendoFoto(true);
    setFotoError(null);
    try {
      const url = await subirArchivo(file, "usuarios");
      const perfil = await guardarPerfil({ fotoUrl: url });
      setUsuario(perfil);
      router.refresh();
    } catch (err) {
      setFotoError(
        err instanceof Error
          ? err.message
          : "No se pudo subir la foto. Se mantiene la actual.",
      );
    } finally {
      setSubiendoFoto(false);
    }
  }

  function handleFirma(firma: FirmaPendiente) {
    setFirmaPendiente(firma);
    setError(null);
  }

  async function handleGuardar() {
    setGuardandoPerfil(true);
    setError(null);
    try {
      let firmaUrl = usuario.firmaUrl ?? "";
      if (firmaPendiente)
        firmaUrl = await subirArchivo(firmaPendiente.file, "usuarios/firmas");
      const perfil = await guardarPerfil({ cedula, telefono, firmaUrl });
      setUsuario(perfil);
      setCedula("");
      setTelefono("");
      setFirmaPendiente(null);
      setExito(true);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el perfil.",
      );
    } finally {
      setGuardandoPerfil(false);
    }
  }

  return (
    <div className="rounded-[18px] bg-white/90 px-4 py-8 shadow-[0_10px_35px_rgba(0,0,0,0.08)] sm:px-8 dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800">
      <PageHeader title="Perfil de Usuario" />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-4">
          <ProfilePhoto
            fotoUrl={usuario.fotoUrl}
            nombre={usuario.nombre}
            subiendo={subiendoFoto}
            onSelect={(file) => {
              if (recorte) URL.revokeObjectURL(recorte);
              setFotoError(null);
              setRecorte(URL.createObjectURL(file));
            }}
            onError={setFotoError}
          />
          {fotoError && (
            <p role="alert" className="text-center text-sm text-red-600">
              {fotoError}
            </p>
          )}
          <SignatureSection
            firmaUrl={usuario.firmaUrl}
            pendiente={firmaPendiente}
            editable={!usuario.firmaUrl}
            onFirma={handleFirma}
            onError={setError}
          />
        </div>

        <div className="flex flex-col gap-4">
          <dl className="rounded-[10px] border-l-2 border-brand-700 bg-zinc-50 p-4 dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
            <div className="flex flex-col gap-2 text-sm sm:text-base">
              <div className="flex gap-2">
                <dt className="font-semibold text-brand-700 dark:text-brand-100">
                  Nombre:
                </dt>
                <dd className="text-zinc-600 dark:text-zinc-300">
                  {usuario.nombre}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-brand-700 dark:text-brand-100">
                  Código:
                </dt>
                <dd className="text-zinc-600 dark:text-zinc-300">
                  {usuario.codigo}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-brand-700 dark:text-brand-100">
                  Rol:
                </dt>
                <dd className="text-zinc-600 dark:text-zinc-300">
                  {usuario.rolLabel}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-brand-700 dark:text-brand-100">
                  Programa:
                </dt>
                <dd className="text-zinc-600 dark:text-zinc-300">
                  {usuario.programa}
                </dd>
              </div>
            </div>
          </dl>

          {incompleto ? (
            <ProfileForm
              cedula={cedula}
              telefono={telefono}
              cedulaActual={usuario.cedula}
              telefonoActual={usuario.telefono}
              firmaLista={Boolean(
                firmaPendiente?.previewUrl ?? usuario.firmaUrl,
              )}
              error={error}
              guardando={guardandoPerfil}
              onCedula={setCedula}
              onTelefono={setTelefono}
              onGuardar={handleGuardar}
            />
          ) : (
            <dl className="rounded-[10px] border-l-2 border-brand-700 bg-zinc-50 p-4 dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
              <div className="flex flex-col gap-2 text-sm sm:text-base">
                <div className="flex gap-2">
                  <dt className="font-semibold text-brand-700 dark:text-brand-100">
                    Cédula:
                  </dt>
                  <dd className="text-zinc-600 dark:text-zinc-300">
                    {usuario.cedula}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-semibold text-brand-700 dark:text-brand-100">
                    Teléfono:
                  </dt>
                  <dd className="text-zinc-600 dark:text-zinc-300">
                    {usuario.telefono}
                  </dd>
                </div>
              </div>
            </dl>
          )}
        </div>
      </div>

      <PhotoCropDialog
        key={recorte ?? "cerrado"}
        open={recorte !== null}
        imageUrl={recorte}
        onOpenChange={(open) => {
          if (!open) cerrarRecorte();
        }}
        onSave={handleFotoRecortada}
        onError={(msg) => {
          cerrarRecorte();
          setFotoError(msg);
        }}
      />

      <Dialog open={exito} onOpenChange={setExito}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              Datos guardados correctamente.
            </DialogTitle>
          </DialogHeader>
          <DialogFooter className="sm:justify-center justify-center">
            <Button type="button" onClick={() => setExito(false)}>
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
