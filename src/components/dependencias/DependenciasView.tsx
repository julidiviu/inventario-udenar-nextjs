"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { DependenciaCard } from "./DependenciaCard";
import { DependenciaModal, type DependenciaFormData } from "./DependenciaModal";
import type { AdminDisponible, Dependencia, DependenciasMode } from "./types";

interface DependenciasViewProps {
  mode: DependenciasMode;
  initialDependencias: Dependencia[];
  admins: AdminDisponible[];
}

export function DependenciasView({ mode, initialDependencias, admins }: DependenciasViewProps) {
  const [dependencias, setDependencias] = useState<Dependencia[]>(initialDependencias);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Dependencia | null>(null);
  const [deleting, setDeleting] = useState<Dependencia | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(dependencia: Dependencia) {
    setEditing(dependencia);
    setModalOpen(true);
  }

  function handleSave(data: DependenciaFormData) {
    if (editing) {
      setDependencias((prev) => prev.map((d) => (d.id === editing.id ? { ...d, ...data } : d)));
    } else {
      const nextId = dependencias.length ? Math.max(...dependencias.map((d) => d.id)) + 1 : 1;
      setDependencias((prev) => [...prev, { id: nextId, ...data }]);
    }
    setModalOpen(false);
    setEditing(null);
  }

  function handleDelete() {
    if (!deleting) return;
    setDependencias((prev) => prev.filter((d) => d.id !== deleting.id));
    setDeleting(null);
  }

  return (
    <div className="mx-auto w-full max-w-7xl rounded-[20px] bg-gradient-to-br from-white to-zinc-50 p-6 shadow-[0_25px_45px_rgba(0,0,0,0.08)] sm:p-10 dark:from-zinc-900 dark:to-zinc-950">
      <PageHeader title="Dependencias Académicas" />
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-center text-sm text-zinc-500 sm:text-left dark:text-zinc-400">
          {mode === "admin"
            ? "Selecciona una dependencia para gestionarla"
            : "Selecciona una dependencia para consultar los recursos disponibles"}
        </p>
        {mode === "admin" && (
          <Button onClick={openCreate}>
            <Plus /> Crear Dependencia
          </Button>
        )}
      </div>

      {dependencias.length === 0 ? (
        <EmptyState message="No hay dependencias registradas." variant="alert" />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {dependencias.map((d) => (
            <DependenciaCard key={d.id} dependencia={d} mode={mode} onEdit={openEdit} onDelete={setDeleting} />
          ))}
        </div>
      )}

      <DependenciaModal
        key={`${modalOpen}-${editing?.id ?? "new"}`}
        open={modalOpen}
        initial={editing}
        admins={admins}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />

      <Dialog open={deleting !== null} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar dependencia</DialogTitle>
            <DialogDescription>
              ¿Eliminar &laquo;{deleting?.nombre}&raquo;? Esta acción solo afecta la vista local en esta fase.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
