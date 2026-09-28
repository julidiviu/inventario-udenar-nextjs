"use client";

import { Building2, ExternalLink, ImageIcon, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Dependencia, DependenciasMode } from "./types";

interface DependenciaCardProps {
  dependencia: Dependencia;
  mode: DependenciasMode;
  onEdit: (dependencia: Dependencia) => void;
  onDelete: (dependencia: Dependencia) => void;
}

export function DependenciaCard({ dependencia, mode, onEdit, onDelete }: DependenciaCardProps) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[18px] border border-zinc-100 bg-white shadow-[0_10px_25px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)] dark:border-zinc-800 dark:bg-zinc-900">
      {mode === "admin" && (
        <div className="absolute top-3 right-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Opciones de ${dependencia.nombre}`}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/90 text-zinc-600 shadow transition hover:bg-white hover:text-brand-700 focus:ring-2 focus:ring-brand-500 focus:outline-none dark:bg-zinc-800/90 dark:text-zinc-300"
              >
                <MoreVertical className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(dependencia)}>
                <Pencil className="size-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDelete(dependencia)} className="text-red-600 dark:text-red-400">
                <Trash2 className="size-4" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {dependencia.imagenUrl ? (
        <div className="h-44 overflow-hidden bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dependencia.imagenUrl}
            alt={dependencia.nombre}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        </div>
      ) : (
        <div className="flex h-44 items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
          <ImageIcon className="size-10" />
        </div>
      )}

      <div className="flex flex-1 flex-col justify-between gap-4 p-6">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-brand-700 dark:text-zinc-50">
            <Building2 className="size-4 shrink-0 opacity-85" />
            {dependencia.nombre}
          </h3>
          <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {dependencia.descripcion?.trim() ? dependencia.descripcion : "(Sin descripción)"}
          </p>
        </div>

        {mode === "view" && (
          <Button asChild className="w-full bg-brand-700/10 text-brand-700 hover:bg-brand-700/15 hover:text-brand-900">
            <a href="#">
              <ExternalLink /> Ver Recursos
            </a>
          </Button>
        )}
      </div>
    </article>
  );
}
