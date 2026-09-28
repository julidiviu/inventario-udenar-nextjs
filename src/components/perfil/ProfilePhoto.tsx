"use client";

import { useRef } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

const FOTO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function ProfilePhoto({
  fotoUrl,
  nombre,
  subiendo,
  onSelect,
  onError,
}: {
  fotoUrl: string | null;
  nombre: string;
  subiendo: boolean;
  onSelect: (file: File) => void;
  onError: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!FOTO_TYPES.has(file.type)) {
      onError("La foto debe ser PNG, JPG o WebP.");
      return;
    }
    onSelect(file);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-40 w-40 overflow-hidden rounded-full border-2 border-brand-700 bg-zinc-100">
        {fotoUrl ? (
          <Image src={fotoUrl} alt={nombre} fill sizes="160px" className="object-cover" unoptimized />
        ) : (
          <span
            aria-hidden="true"
            className="grid h-full w-full place-items-center text-5xl font-bold text-brand-700"
          >
            {nombre.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFile}
        aria-label="Cambiar Foto"
      />
      <Button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
        className="w-full"
      >
        <Upload />
        Cambiar Foto
      </Button>
    </div>
  );
}
