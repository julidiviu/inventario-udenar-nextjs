"use client";

import { ImageIcon, Pencil, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InventarioMode, Recurso } from "./types";

interface RecursoCardProps {
  recurso: Recurso;
  mode: InventarioMode;
  solicitudPendiente?: boolean;
  perfilCompleto?: boolean;
  /** Deep-link desde solicitudes: anillo + scroll hasta la tarjeta. */
  destacado?: boolean;
  onEdit?: (recurso: Recurso) => void;
  onDelete?: (recurso: Recurso) => void;
  onSolicitar?: (recurso: Recurso) => void;
}

function scrollAlVer(el: HTMLElement | null) {
  el?.scrollIntoView({ block: "center" });
}

export function RecursoCard({
  recurso,
  mode,
  solicitudPendiente = false,
  perfilCompleto = true,
  destacado = false,
  onEdit,
  onDelete,
  onSolicitar,
}: RecursoCardProps) {
  const perfilIncompleto = !perfilCompleto;

  return (
    <article
      id={`recurso-${recurso.id}`}
      ref={destacado ? scrollAlVer : undefined}
      className={`group flex h-full flex-col overflow-hidden rounded-[18px] border border-zinc-100 bg-white shadow-[0_10px_25px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)] dark:border-zinc-800 dark:bg-zinc-900 ${destacado ? "ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-zinc-950" : ""}`}
    >
      {recurso.fotoUrl ? (
        <div className="h-44 overflow-hidden bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recurso.fotoUrl}
            alt={recurso.nombre}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        </div>
      ) : (
        <div className="flex h-44 items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
          <ImageIcon className="size-10" />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-brand-700 dark:text-zinc-50">{recurso.nombre}</h3>
          <span
            className={cn(
              "shrink-0 rounded-[10px] px-3 py-1 text-xs font-semibold",
              recurso.disponible ? "bg-brand-700 text-white" : "bg-amber-400 text-zinc-900",
            )}
          >
            {recurso.disponible ? "Disponible" : "Prestado"}
          </span>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          <strong className="font-semibold text-zinc-700 dark:text-zinc-200">QR:</strong> {recurso.qr}
        </p>
        <p className="line-clamp-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {recurso.descripcion}
        </p>

        {mode === "admin" ? (
          <div className="mt-auto flex gap-2 pt-3">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onEdit?.(recurso)}>
              <Pencil /> Editar
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-red-600 text-white hover:bg-red-700"
              onClick={() => onDelete?.(recurso)}
            >
              <Trash2 /> Eliminar
            </Button>
          </div>
        ) : (
          recurso.disponible && (
            <div className="mt-auto pt-3">
              {solicitudPendiente ? (
                <>
                  <Button size="sm" variant="secondary" className="w-full" disabled>
                    Solicitud Pendiente
                  </Button>
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Ya tienes una solicitud pendiente de este recurso. Espera su aprobación o rechazo.
                  </p>
                </>
              ) : perfilIncompleto ? (
                <>
                  <Button size="sm" variant="secondary" className="w-full" disabled>
                    Incompleto
                  </Button>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Completa tu perfil (registra firma, cédula y teléfono).
                  </p>
                </>
              ) : (
                <Button size="sm" className="w-full" onClick={() => onSolicitar?.(recurso)}>
                  <Send /> Solicitar Préstamo
                </Button>
              )}
            </div>
          )
        )}
      </div>
    </article>
  );
}
