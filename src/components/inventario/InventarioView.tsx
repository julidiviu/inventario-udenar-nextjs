"use client";

import { useMemo, useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, Plus } from "lucide-react";
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
import { RecursoCard } from "./RecursoCard";
import { RecursoModal, type RecursoFormData } from "./RecursoModal";
import { SolicitudModal } from "./SolicitudModal";
import { toISODate } from "@/lib/recursos";
import type {
  FiltroDisponibilidad,
  InventarioMode,
  Recurso,
  TipoRecurso,
} from "./types";

interface InventarioViewProps {
  mode: InventarioMode;
  initialTipos: TipoRecurso[];
  initialRecursos: Recurso[];
  /** Null = admin sin dependencia asignada (solo mode="admin"). */
  dependenciaNombre: string | null;
  perfilCompleto?: boolean;
  solicitudesPendientesInicial?: number[];
  /** Deep-link desde solicitudes: abre el acordeón y resalta la tarjeta (ids inválidos se ignoran). */
  tipoAbiertoId?: number | null;
  destacarId?: number | null;
}

const FILTROS: { value: FiltroDisponibilidad; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "disponibles", label: "Disponibles" },
  { value: "prestados", label: "Prestados" },
];

export function InventarioView({
  mode,
  initialTipos,
  initialRecursos,
  dependenciaNombre,
  perfilCompleto = true,
  solicitudesPendientesInicial = [],
  tipoAbiertoId = null,
  destacarId = null,
}: InventarioViewProps) {
  const [tipos, setTipos] = useState<TipoRecurso[]>(initialTipos);
  const [recursos, setRecursos] = useState<Recurso[]>(initialRecursos);
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<FiltroDisponibilidad>("todos");
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<number[]>(
    solicitudesPendientesInicial,
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Recurso | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleting, setDeleting] = useState<Recurso | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [cascadeInfo, setCascadeInfo] = useState<{
    recurso: Recurso;
    counts: { solicitudes: number; prestamos: number };
  } | null>(null);
  const [cascadeConfirm, setCascadeConfirm] = useState(false);

  const [solicitando, setSolicitando] = useState<Recurso | null>(null);
  const [solicitudSaving, setSolicitudSaving] = useState(false);
  const [solicitudError, setSolicitudError] = useState("");

  const q = query.trim().toLowerCase();

  const tiposVisibles = useMemo(
    () =>
      tipos
        .map((t) => ({
          ...t,
          recursos: recursos.filter(
            (r) =>
              r.tipoId === t.id &&
              (filtro === "todos" ||
                (filtro === "disponibles" && r.disponible) ||
                (filtro === "prestados" && !r.disponible)) &&
              (!q || r.nombre.toLowerCase().includes(q) || r.qr.toLowerCase().includes(q)),
          ),
        }))
        .filter((t) => t.recursos.length > 0),
    [tipos, recursos, filtro, q],
  );

  const visibles = tiposVisibles.reduce((n, t) => n + t.recursos.length, 0);

  async function readError(res: Response): Promise<string> {
    try {
      const body = await res.json();
      return typeof body.error === "string" ? body.error : "Operación fallida.";
    } catch {
      return "Operación fallida.";
    }
  }

  function applyTipoChanges(body: { tipo?: TipoRecurso; tiposEliminados?: number[] }) {
    if (body.tipo) {
      setTipos((prev) => (prev.some((t) => t.id === body.tipo!.id) ? prev : [...prev, body.tipo!]));
    }
    if (body.tiposEliminados && body.tiposEliminados.length > 0) {
      setTipos((prev) => prev.filter((t) => !body.tiposEliminados!.includes(t.id)));
    }
  }

  async function handleSave(data: RecursoFormData, file: File | null) {
    setSaving(true);
    setFormError("");
    try {
      let fotoUrl = data.fotoUrl;
      if (file) {
        const form = new FormData();
        form.set("file", file);
        form.set("folder", "recursos");
        form.set("kind", "foto");
        const up = await fetch("/api/upload", { method: "POST", body: form });
        if (!up.ok) {
          setFormError(await readError(up));
          return;
        }
        fotoUrl = (await up.json()).url as string;
      }
      const res = await fetch(
        editing ? `/api/recursos/${editing.id}` : "/api/recursos",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, fotoUrl }),
        },
      );
      if (!res.ok) {
        setFormError(await readError(res));
        return;
      }
      const body = await res.json();
      const row = body.recurso as Recurso;
      setRecursos((prev) =>
        editing ? prev.map((r) => (r.id === editing.id ? row : r)) : [...prev, row],
      );
      applyTipoChanges(body);
      setModalOpen(false);
      setEditing(null);
    } catch {
      setFormError("No se pudo guardar el recurso.");
    } finally {
      setSaving(false);
    }
  }

  async function runDelete(id: number, cascade: boolean) {
    const res = await fetch(`/api/recursos/${id}${cascade ? "?cascade=true" : ""}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const body = await res.json();
      setRecursos((prev) => prev.filter((r) => r.id !== id));
      applyTipoChanges(body);
      setDeleting(null);
      setCascadeInfo(null);
      setCascadeConfirm(false);
      return;
    }
    if (res.status === 409 && !cascade) {
      try {
        const body = await res.json();
        if (body.counts && deleting) {
          setDeleting(null);
          setCascadeInfo({ recurso: deleting, counts: body.counts });
          return;
        }
      } catch {
        // cae al error genérico
      }
    }
    setDeleteError(await readError(res));
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteError("");
    try {
      await runDelete(deleting.id, false);
    } catch {
      setDeleteError("No se pudo eliminar el recurso.");
    }
  }

  async function handleCascadeConfirm() {
    if (!cascadeInfo) return;
    setDeleteError("");
    try {
      await runDelete(cascadeInfo.recurso.id, true);
    } catch {
      setDeleteError("No se pudo eliminar el recurso.");
    }
  }

  async function handleConfirmSolicitud(recurso: Recurso, fecha: Date) {
    setSolicitudSaving(true);
    setSolicitudError("");
    try {
      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recursoId: recurso.id, fechaDevolucion: toISODate(fecha) }),
      });
      if (!res.ok) {
        setSolicitudError(await readError(res));
        return;
      }
      setSolicitudesPendientes((prev) =>
        prev.includes(recurso.id) ? prev : [...prev, recurso.id],
      );
      setSolicitando(null);
    } catch {
      setSolicitudError("No se pudo crear la solicitud.");
    } finally {
      setSolicitudSaving(false);
    }
  }

  if (mode === "admin" && dependenciaNombre === null) {
    return (
      <div className="mx-auto w-full max-w-7xl rounded-[20px] bg-gradient-to-br from-white to-zinc-50 p-6 shadow-[0_25px_45px_rgba(0,0,0,0.08)] sm:p-10 dark:from-zinc-900 dark:to-zinc-950">
        <PageHeader title="Inventario de Recursos" />
        <EmptyState
          variant="alert"
          message="No administras ninguna dependencia. Pide al superadmin que te asigne una."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl rounded-[20px] bg-gradient-to-br from-white to-zinc-50 p-6 shadow-[0_25px_45px_rgba(0,0,0,0.08)] sm:p-10 dark:from-zinc-900 dark:to-zinc-950">
      <PageHeader
        title={mode === "admin" ? "Inventario de Recursos" : `Recursos de ${dependenciaNombre ?? ""}`}
      />

      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex gap-2">
            {FILTROS.map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={filtro === f.value ? "default" : "outline"}
                onClick={() => setFiltro(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          {mode === "admin" && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormError("");
                setModalOpen(true);
              }}
            >
              <Plus /> Agregar Recurso
            </Button>
          )}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Buscar por nombre o código QR..."
            className="sm:max-w-sm"
          />
          <p className="rounded-[20px] border border-brand-700 bg-brand-700/5 px-4 py-1.5 text-sm font-bold whitespace-nowrap text-brand-700 dark:text-brand-100">
            Mostrando {visibles} de {recursos.length} recursos
          </p>
        </div>
      </div>

      {tiposVisibles.length === 0 ? (
        <EmptyState
          message={
            recursos.length === 0
              ? "No hay recursos registrados en esta dependencia."
              : "Sin resultados para la búsqueda o el filtro aplicado."
          }
        />
      ) : (
        <Accordion.Root
          type="multiple"
          defaultValue={tipoAbiertoId ? [String(tipoAbiertoId)] : undefined}
          className="flex flex-col gap-4"
        >
          {tiposVisibles.map((t) => (
            <Accordion.Item
              key={t.id}
              value={String(t.id)}
              className="overflow-hidden rounded-[14px] border border-zinc-200 bg-white shadow-[0_10px_25px_rgba(0,0,0,0.05)] dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full cursor-pointer items-center justify-between bg-brand-700 px-5 py-4 text-left font-bold text-white transition hover:bg-brand-900 [&[data-state=open]>svg]:rotate-180">
                  <span>
                    {t.nombre} ({t.recursos.length})
                  </span>
                  <ChevronDown className="size-5 shrink-0 transition-transform duration-300" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden">
                <div className="grid grid-cols-1 gap-6 bg-zinc-50 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 dark:bg-zinc-950">
                  {t.recursos.map((r) => (
                    <RecursoCard
                      key={r.id}
                      recurso={r}
                      mode={mode}
                      destacado={r.id === destacarId}
                      solicitudPendiente={solicitudesPendientes.includes(r.id)}
                      perfilCompleto={perfilCompleto}
                      onEdit={(rec) => {
                        setEditing(rec);
                        setFormError("");
                        setModalOpen(true);
                      }}
                      onDelete={(rec) => {
                        setDeleting(rec);
                        setDeleteError("");
                      }}
                      onSolicitar={(rec) => {
                        setSolicitando(rec);
                        setSolicitudError("");
                      }}
                    />
                  ))}
                </div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      )}

      {mode === "admin" && (
        <RecursoModal
          key={`${modalOpen}-${editing?.id ?? "new"}`}
          open={modalOpen}
          initial={editing}
          tipos={tipos}
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
            <DialogTitle>Eliminar recurso</DialogTitle>
            <DialogDescription>
              ¿Eliminar &laquo;{deleting?.nombre}&raquo; ({deleting?.qr})? Se eliminará por completo de
              la base de datos.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm font-medium text-red-600">{deleteError}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleting(null);
                setDeleteError("");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cascadeInfo !== null && !cascadeConfirm} onOpenChange={(v) => !v && setCascadeInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recurso con registros asociados</DialogTitle>
            <DialogDescription>
              Este recurso tiene {cascadeInfo?.counts.solicitudes}{" "}
              {cascadeInfo?.counts.solicitudes === 1 ? "solicitud asociada" : "solicitudes asociadas"} y{" "}
              {cascadeInfo?.counts.prestamos}{" "}
              {cascadeInfo?.counts.prestamos === 1 ? "préstamo asociado" : "préstamos asociados"}.
              ¿Estás seguro de eliminar este recurso?
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm font-medium text-red-600">{deleteError}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCascadeInfo(null);
                setDeleteError("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => setCascadeConfirm(true)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cascadeConfirm} onOpenChange={(v) => !v && setCascadeConfirm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación definitiva</DialogTitle>
            <DialogDescription>
              Se eliminarán {cascadeInfo ? cascadeInfo.counts.solicitudes + cascadeInfo.counts.prestamos : 0}{" "}
              registros asociados a este recurso. ¿Estás seguro de eliminar este recurso?
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm font-medium text-red-600">{deleteError}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCascadeConfirm(false);
                setDeleteError("");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCascadeConfirm} className="bg-red-600 text-white hover:bg-red-700">
              Eliminar todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {mode === "view" && (
        <SolicitudModal
          key={`${solicitando?.id ?? "none"}`}
          open={solicitando !== null}
          recurso={solicitando}
          saving={solicitudSaving}
          serverError={solicitudError}
          onClose={() => setSolicitando(null)}
          onConfirm={handleConfirmSolicitud}
        />
      )}
    </div>
  );
}
