"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Pencil, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Paginador } from "@/components/ui/Paginador";
import { AdminModal, type AdminFormData } from "@/components/administradores/AdminModal";
import type { AdminRow } from "@/components/administradores/AdminsView";
import { getRolLabel } from "@/components/layout/user";
import { FILAS_POR_PAGINA, hrefConParams } from "@/lib/paginacion";

export interface UsuarioRow extends Omit<AdminRow, "dependenciaNombre"> {
  rol: string;
}

interface UsuariosViewProps {
  initialUsuarios: UsuarioRow[];
  pagina: number;
  totalPaginas: number;
  total: number;
  qInicial: string;
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return typeof body.error === "string" ? body.error : "Operación fallida.";
  } catch {
    return "Operación fallida.";
  }
}

export function UsuariosView({ initialUsuarios, pagina, totalPaginas, total, qInicial }: UsuariosViewProps) {
  // Los datos se renderizan directo del servidor (como PrestamosView): tras
  // navegar (?q=/página) el servidor re-renderiza con filas nuevas. Nada de
  // useState para la lista (un estado copiado quedaría congelado y la tabla
  // no se actualizaría hasta recargar).
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UsuarioRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(qInicial);
  const [prevQ, setPrevQ] = useState(qInicial);
  // Sincroniza si ?q= cambia por navegación (atrás/adelante) sin remontar la vista.
  if (qInicial !== prevQ) {
    setPrevQ(qInicial);
    setQuery(qInicial);
  }

  // Búsqueda en servidor con debounce: actualiza ?q= y vuelve a página 1.
  useEffect(() => {
    const q = query.trim();
    if (q === qInicial) return;
    const t = setTimeout(() => {
      router.replace(hrefConParams(pathname, { estado: "", pagina: 1, q }));
    }, 400);
    return () => clearTimeout(t);
  }, [query, qInicial, pathname, router]);

  const inicio = total === 0 ? 0 : (pagina - 1) * FILAS_POR_PAGINA + 1;
  const fin = Math.min(pagina * FILAS_POR_PAGINA, total);

  function openModal(usuario: UsuarioRow) {
    setEditing(usuario);
    setFormError("");
    setModalOpen(true);
  }

  async function handleSave(data: AdminFormData, file: File | null) {
    if (!editing) return;
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
      // Contraseña vacía = no cambia (el back la ignora).
      const res = await fetch(`/api/usuarios/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, firmaUrl }),
      });
      if (!res.ok) {
        setFormError(await readError(res));
        return;
      }
      setModalOpen(false);
      setEditing(null);
      setDone("Usuario actualizado.");
      // Relee del servidor para reflejar la edición (patrón de solicitudes).
      router.refresh();
    } catch {
      setFormError("No se pudo guardar el usuario.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl rounded-[20px] bg-gradient-to-br from-white to-zinc-50 p-6 shadow-[0_25px_45px_rgba(0,0,0,0.08)] sm:p-10 dark:from-zinc-900 dark:to-zinc-950">
      <PageHeader title="Usuarios" />
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-center text-sm text-zinc-500 sm:text-left dark:text-zinc-400">
          {total === 0
            ? "Sin usuarios registrados"
            : `Mostrando ${inicio}–${fin} de ${total} usuarios`}
        </p>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por código, cédula o nombre…"
            className="pl-9"
          />
        </div>
      </div>

      {initialUsuarios.length === 0 ? (
        <EmptyState
          message={qInicial ? "Sin resultados para esa búsqueda." : "No hay usuarios registrados."}
          variant="alert"
        />
      ) : (
        <section className="overflow-hidden rounded-[18px] bg-white shadow-[0_10px_32px_rgba(0,0,0,0.12)] dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-brand-700 text-center text-white">
                  <th className="px-3 py-2 font-semibold">Código</th>
                  <th className="px-3 py-2 font-semibold">Nombre</th>
                  <th className="px-3 py-2 font-semibold">Cédula</th>
                  <th className="px-3 py-2 font-semibold">Rol</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                  <th className="px-3 py-2 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {initialUsuarios.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-zinc-200 text-center transition hover:bg-brand-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                  >
                    <td className="px-3 py-2 font-medium">{u.codigo}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/usuarios/${u.id}`}
                        className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-100"
                      >
                        {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || `Usuario ${u.codigo}`}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{u.cedula ?? "—"}</td>
                    <td className="px-3 py-2">{getRolLabel(u.rol)}</td>
                    <td className="px-3 py-2">
                      {u.isActive ? (
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
                        title="Editar usuario"
                        onClick={() => openModal(u)}
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

      <Paginador q={qInicial} pagina={pagina} totalPaginas={totalPaginas} />

      <AdminModal
        key={`${modalOpen}-${editing?.id ?? "none"}`}
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
