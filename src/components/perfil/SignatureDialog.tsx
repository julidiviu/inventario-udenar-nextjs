"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dataUrlToPngFile } from "@/lib/firma";
import type { FirmaPendiente } from "@/lib/firma";

export function SignatureDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (firma: FirmaPendiente) => void;
}) {
  const canvasRef = useRef<SignatureCanvas>(null);
  const [vacia, setVacia] = useState(true);

  function handleEnd() {
    setVacia(canvasRef.current?.isEmpty() ?? true);
  }

  function handleClear() {
    canvasRef.current?.clear();
    setVacia(true);
  }

  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas || canvas.isEmpty()) return;
    // PNG transparente con trazo negro (penColor="black", sin backgroundColor).
    const dataUrl = canvas.getTrimmedCanvas().toDataURL("image/png");
    const file = await dataUrlToPngFile(dataUrl);
    onSave({ file, previewUrl: dataUrl, origen: "canvas" });
    handleClear();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Firma</DialogTitle>
          <DialogDescription>Dibuje su firma con el mouse o el dedo en trazo negro.</DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-[10px] border border-zinc-300 bg-white">
          <SignatureCanvas
            ref={canvasRef}
            penColor="black"
            minWidth={1.5}
            maxWidth={2.5}
            onEnd={handleEnd}
            canvasProps={{
              width: 500,
              height: 200,
              className: "h-48 w-full touch-none bg-transparent",
            }}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={handleClear}>
            Limpiar
          </Button>
          <Button type="button" onClick={handleSave} disabled={vacia}>
            Guardar firma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
