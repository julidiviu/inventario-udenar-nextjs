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
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return typeof body.error === "string" ? body.error : "Operación fallida.";
  } catch {
    return "Operación fallida.";
  }
}

export function DependenciasView({ mode, initialDependencias }: DependenciasViewProps) {
  const [dependencias, setDependencias] = useState<Dependencia[]>(initialDependencias);
  const [admins, setAdmins] = useState<AdminDisponible[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Dependencia | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleting, setDeleting] = useState<Dependencia | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function openModal(dependencia: Dependencia | null) {
    setEditing(dependencia);
    setFormError("");
    setModalOpen(true);
    try {
      const url = dependencia
        ? `/api/admins/disponibles?dependenciaId=${dependencia.id}`
        : "/api/admins/disponibles";
      const res = await fetch(url);
      if (res.ok) {
        const body = await res.json();
        setAdmins(Array.isArray(body.admins) ? body.admins : []);
      }
    } catch {
      setAdmins([]);
    }
  }

  async function handleSave(data: DependenciaFormData, file: File | null) {
    setSaving(true);
    setFormError("");
    try {
      let imagenUrl = data.imagenUrl;
      if (file) {
        const form = new FormData();
        form.set("file", file);
        form.set("folder", "dependencias");
        form.set("kind", "foto");
        const up = await fetch("/api/upload", { method: "POST", body: form });
        if (!up.ok) {
          setFormError(await readError(up));
          return;
        }
        imagenUrl = (await up.json()).url as string;
      }
      const res = await fetch(
        editing ? `/api/dependencias/${editing.id}` : "/api/dependencias",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, imagenUrl }),
        },
      );
      if (!res.ok) {
        setFormError(await readError(res));
        return;
      }
      const row = (await res.json()).dependencia as Dependencia;
      setDependencias((prev) =>
        editing ? prev.map((d) => (d.id === editing.id ? row : d)) : [...prev, row],
      );
      setModalOpen(false);
      setEditing(null);
    } catch {
      setFormError("No se pudo guardar la dependencia.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteError("");
    try {
      const res = await fetch(`/api/dependencias/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleteError(await readError(res));
        return;
      }
      setDependencias((prev) => prev.filter((d) => d.id !== deleting.id));
      setDeleting(null);
    } catch {
      setDeleteError("No se pudo eliminar la dependencia.");
    }
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
          <Button onClick={() => openModal(null)}>
            <Plus /> Crear Dependencia
          </Button>
        )}
      </div>

      {dependencias.length === 0 ? (
        <EmptyState message="No hay dependencias registradas." variant="alert" />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {dependencias.map((d) => (
            <DependenciaCard
              key={d.id}
              dependencia={d}
              mode={mode}
              onEdit={(dep) => openModal(dep)}
              onDelete={(dep) => {
                setDeleting(dep);
                setDeleteError("");
              }}
            />
          ))}
        </div>
      )}

      {mode === "admin" && (
        <DependenciaModal
          key={`${modalOpen}-${editing?.id ?? "new"}`}
          open={modalOpen}
          initial={editing}
          admins={admins}
          saving={saving}
          serverError={formError}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}

      <Dialog open={deleting !== null} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar dependencia</DialogTitle>
            <DialogDescription>
              ¿Eliminar &laquo;{deleting?.nombre}&raquo;? Se ocultará de la lista (borrado lógico).
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm font-medium text-red-600">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
