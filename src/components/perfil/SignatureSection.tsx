"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { PenLine, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignatureDialog } from "./SignatureDialog";
import { pngFileToFirmaPendiente } from "@/lib/firma";
import type { FirmaPendiente } from "@/lib/firma";

export function SignatureSection({
  firmaUrl,
  pendiente,
  editable,
  onFirma,
  onError,
}: {
  firmaUrl: string | null;
  pendiente: FirmaPendiente | null;
  editable: boolean;
  onFirma: (firma: FirmaPendiente) => void;
  onError: (msg: string | null) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const preview = pendiente?.previewUrl ?? firmaUrl;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "image/png") {
      onError("La firma debe ser un archivo .png");
      return;
    }
    onError(null);
    onFirma(await pngFileToFirmaPendiente(file, "upload"));
  }

  return (
    <div className="rounded-[10px] border-l-2 border-brand-700 bg-zinc-50 p-4 dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
      <p className="flex items-center justify-center gap-1.5 text-center text-sm font-bold text-brand-700 dark:text-brand-100">
        <PenLine className="size-4" aria-hidden="true" />
        Firma registrada:
      </p>

      <div className="mx-auto mt-3 flex min-h-[110px] w-full max-w-[260px] items-center justify-center rounded-[10px] border border-zinc-100 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {preview ? (
          <Image
            src={preview}
            alt="Firma registrada"
            width={240}
            height={96}
            className="h-24 w-auto object-contain"
            unoptimized
          />
        ) : (
          <p className="text-center text-xs text-zinc-400">Sin firma registrada</p>
        )}
      </div>

      {editable && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            ref={uploadRef}
            type="file"
            accept=".png,image/png"
            className="hidden"
            onChange={handleUpload}
            aria-label="Subir Firma"
          />
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => uploadRef.current?.click()}>
            <Upload />
            Subir Firma
          </Button>
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setDialogOpen(true)}>
            <PenLine />
            Crear Firma
          </Button>
        </div>
      )}

      <SignatureDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={onFirma} />
    </div>
  );
}
