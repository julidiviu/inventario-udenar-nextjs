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

  // Mock: todo es estado local hasta conectar el backend real.
  function handleSave(data: RecursoFormData, file: File | null) {
    setSaving(true);
    setFormError("");
    let tipoId = data.tipoId;
    if (tipoId === null && data.nuevoTipo) {
      const nextTipoId = Math.max(0, ...tipos.map((t) => t.id)) + 1;
      setTipos((prev) => [
        ...prev,
        {
          id: nextTipoId,
          nombre: data.nuevoTipo as string,
          dependenciaId: initialTipos[0]?.dependenciaId ?? 0,
        },
      ]);
      tipoId = nextTipoId;
    }
    const fotoUrl = file ? URL.createObjectURL(file) : data.fotoUrl;
    if (editing) {
      const row: Recurso = { ...editing, ...data, tipoId: tipoId as number, fotoUrl };
      setRecursos((prev) => prev.map((r) => (r.id === editing.id ? row : r)));
    } else {
      const nextId = Math.max(0, ...recursos.map((r) => r.id)) + 1;
      setRecursos((prev) => [
        ...prev,
        { id: nextId, ...data, tipoId: tipoId as number, fotoUrl, disponible: true },
      ]);
    }
    setSaving(false);
    setModalOpen(false);
    setEditing(null);
  }

  function handleDelete() {
    if (!deleting) return;
    setRecursos((prev) => prev.filter((r) => r.id !== deleting.id));
    setDeleting(null);
  }

  function handleConfirmSolicitud(recurso: Recurso) {
    setSolicitudSaving(true);
    setSolicitudError("");
    setSolicitudesPendientes((prev) => (prev.includes(recurso.id) ? prev : [...prev, recurso.id]));
    setSolicitudSaving(false);
    setSolicitando(null);
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
        <Accordion.Root type="multiple" className="flex flex-col gap-4">
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
                      solicitudPendiente={solicitudesPendientes.includes(r.id)}
                      perfilCompleto={perfilCompleto}
                      onEdit={(rec) => {
                        setEditing(rec);
                        setFormError("");
                        setModalOpen(true);
                      }}
                      onDelete={(rec) => setDeleting(rec)}
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
              ¿Eliminar &laquo;{deleting?.nombre}&raquo; ({deleting?.qr})? Se quitará del inventario.
            </DialogDescription>
          </DialogHeader>
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
