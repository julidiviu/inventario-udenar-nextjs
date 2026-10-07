"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
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
import { AdminModal, type AdminFormData } from "./AdminModal";

export interface AdminRow {
  id: string;
  codigo: string;
  email: string;
  cedula: string | null;
  firstName: string;
  lastName: string;
  telefono: string | null;
  programa: string | null;
  firmaUrl: string | null;
  isActive: boolean;
  dependenciaNombre: string | null;
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return typeof body.error === "string" ? body.error : "Operación fallida.";
  } catch {
    return "Operación fallida.";
  }
}

export function AdminsView({ initialAdmins }: { initialAdmins: AdminRow[] }) {
  const [admins, setAdmins] = useState<AdminRow[]>(initialAdmins);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  function openModal(admin: AdminRow | null) {
    setEditing(admin);
    setFormError("");
    setModalOpen(true);
  }

  async function handleSave(data: AdminFormData, file: File | null) {
    setSaving(true);
    setFormError("");
    try {
      let firmaUrl = data.firmaUrl;
      if (file) {
        const form = new FormData();
        form.set("file", file);
        form.set("folder", "usuarios/firmas");
        form.set("kind", "foto");
        const up = await fetch("/api/upload", { method: "POST", body: form });
        if (!up.ok) {
          setFormError(await readError(up));
          return;
        }
        firmaUrl = (await up.json()).url as string;
      }
      // Al editar, contraseña vacía = no cambia (el back la ignora).
      const res = await fetch(editing ? `/api/admins/${editing.id}` : "/api/admins", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, firmaUrl }),
      });
      if (!res.ok) {
        setFormError(await readError(res));
        return;
      }
      const row = (await res.json()).admin as AdminRow;
      setAdmins((prev) =>
        editing
          ? prev.map((a) => (a.id === editing.id ? { ...row, dependenciaNombre: a.dependenciaNombre } : a))
          : [...prev, { ...row, dependenciaNombre: null }],
      );
      setModalOpen(false);
      setEditing(null);
      setDone(editing ? "Administrador actualizado." : "Administrador creado.");
    } catch {
      setFormError("No se pudo guardar el administrador.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl rounded-[20px] bg-gradient-to-br from-white to-zinc-50 p-6 shadow-[0_25px_45px_rgba(0,0,0,0.08)] sm:p-10 dark:from-zinc-900 dark:to-zinc-950">
      <PageHeader title="Administradores" />
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-center text-sm text-zinc-500 sm:text-left dark:text-zinc-400">
          Crea administradores y edítalos. La dependencia se asigna desde Dependencias.
        </p>
        <Button onClick={() => openModal(null)}>
          <Plus /> Crear Admin
        </Button>
      </div>

      {admins.length === 0 ? (
        <EmptyState message="No hay administradores registrados." variant="alert" />
      ) : (
        <section className="overflow-hidden rounded-[18px] bg-white shadow-[0_10px_32px_rgba(0,0,0,0.12)] dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-brand-700 text-center text-white">
                  <th className="px-3 py-2 font-semibold">Código</th>
                  <th className="px-3 py-2 font-semibold">Nombre</th>
                  <th className="px-3 py-2 font-semibold">Dependencia</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                  <th className="px-3 py-2 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-zinc-200 text-center transition hover:bg-brand-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                  >
                    <td className="px-3 py-2 font-medium">{a.codigo}</td>
                    <td className="px-3 py-2">{`${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() || `Usuario ${a.codigo}`}</td>
                    <td className="px-3 py-2">{a.dependenciaNombre ?? "No asignada"}</td>
                    <td className="px-3 py-2">
                      {a.isActive ? (
                        <span className="inline-block rounded-[10px] bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-block rounded-[10px] bg-zinc-400 px-3 py-1.5 text-xs font-semibold text-white dark:bg-zinc-600">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        variant="outline"
                        size="icon"
                        title="Editar administrador"
                        onClick={() => openModal(a)}
                      >
                        <Pencil />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <AdminModal
        key={`${modalOpen}-${editing?.id ?? "new"}`}
        open={modalOpen}
        initial={editing}
        saving={saving}
        serverError={formError}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />

      <Dialog open={done !== null} onOpenChange={(v) => !v && setDone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Listo</DialogTitle>
            <DialogDescription>{done}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDone(null)}>Aceptar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
