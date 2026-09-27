"use client";

import { useRef } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProfilePhoto({
  fotoUrl,
  nombre,
  onChange,
}: {
  fotoUrl: string | null;
  nombre: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return;
    const url = URL.createObjectURL(file);
    onChange(url);
    e.target.value = "";
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
      <Button type="button" onClick={() => inputRef.current?.click()} className="w-full">
        <Upload />
        Cambiar Foto
      </Button>
    </div>
  );
}
