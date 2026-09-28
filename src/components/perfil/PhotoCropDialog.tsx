"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const S = 288; // lado del encuadre en px CSS
const OUT = 512; // PNG exportado

export function PhotoCropDialog({
  open,
  imageUrl,
  onOpenChange,
  onSave,
  onError,
}: {
  open: boolean;
  imageUrl: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (file: File) => void;
  onError: (msg: string) => void;
}) {
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  const base = nat.w > 0 && nat.h > 0 ? Math.max(S / nat.w, S / nat.h) : 1;
  const dw = nat.w * base * scale;
  const dh = nat.h * base * scale;
  const maxX = Math.max(0, (dw - S) / 2);
  const maxY = Math.max(0, (dh - S) / 2);
  const left = (S - dw) / 2 + Math.min(maxX, Math.max(-maxX, offset.x));
  const top = (S - dh) / 2 + Math.min(maxY, Math.max(-maxY, offset.y));

  function handleSave() {
    if (!imageUrl || nat.w === 0) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        onError("No se pudo procesar la foto.");
        return;
      }
      const sx = (-left / dw) * nat.w;
      const sy = (-top / dh) * nat.h;
      const sw = (S / dw) * nat.w;
      const sh = (S / dh) * nat.h;
      ctx.save();
      ctx.beginPath();
      ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUT, OUT);
      ctx.restore();
      canvas.toBlob((blob) => {
        if (!blob) {
          onError("No se pudo procesar la foto.");
          return;
        }
        onSave(new File([blob], "foto.png", { type: "image/png" }));
      }, "image/png");
    };
    img.onerror = () => onError("No se pudo leer la foto.");
    img.src = imageUrl;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar Foto</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          <div
            className="relative overflow-hidden bg-zinc-100 touch-none select-none dark:bg-zinc-800"
            style={{ width: S, height: S }}
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
            }}
            onPointerMove={(e) => {
              if (drag.current) setOffset({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          >
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Encuadre de foto"
                draggable={false}
                onLoad={(e) =>
                  setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
                }
                style={{ width: dw, height: dh, left, top }}
                className="absolute max-w-none"
              />
            )}
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="h-full w-full rounded-full shadow-[0_0_0_999px_rgba(0,0,0,0.55)] ring-2 ring-white" />
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            aria-label="Zoom"
            className="w-full accent-green-700"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={!imageUrl || nat.w === 0}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
