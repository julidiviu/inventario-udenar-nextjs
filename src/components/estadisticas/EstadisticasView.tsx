"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  History,
  PackageCheck,
  PackageX,
  type LucideIcon,
} from "lucide-react";
import type { Estadisticas } from "@/lib/estadisticas";
import { PageHeader } from "@/components/ui/PageHeader";
import { GraficoDemanda, GraficoTop } from "./graficos";

function fmtPct(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(1)} %`;
}

function Kpi({
  icono: Icono,
  titulo,
  valor,
}: {
  icono: LucideIcon;
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Icono className="h-4 w-4 text-brand-700 dark:text-brand-500" />
        {titulo}
      </div>
      <div className="mt-1 text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">{valor}</div>
    </div>
  );
}

function Panel({
  titulo,
  children,
  ancho,
}: {
  titulo: string;
  children: React.ReactNode;
  ancho?: boolean;
}) {
  return (
    <section
      className={`rounded-[20px] border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-lg sm:p-6 dark:border-zinc-800 dark:bg-zinc-900 ${
        ancho ? "lg:col-span-2" : ""
      }`}
    >
      <h2 className="mb-4 text-base font-bold text-zinc-900 dark:text-zinc-50">{titulo}</h2>
      {children}
    </section>
  );
}

export function EstadisticasView({
  stats,
  dependenciaNombre,
}: {
  stats: Estadisticas;
  dependenciaNombre: string;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader title={`Estadísticas — ${dependenciaNombre}`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icono={PackageCheck} titulo="Recursos disponibles" valor={String(stats.recursosDisponibles)} />
        <Kpi icono={PackageX} titulo="Recursos prestados" valor={String(stats.recursosPrestados)} />
        <Kpi icono={History} titulo="Total préstamos" valor={String(stats.totalPrestamos)} />
        <Kpi icono={CalendarDays} titulo="Préstamos este mes" valor={String(stats.prestamosMes)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi
          icono={Clock}
          titulo="Duración promedio"
          valor={stats.promedioDuracion === null ? "—" : `${stats.promedioDuracion} días`}
        />
        <Kpi icono={CheckCircle2} titulo="Tasa de devoluciones" valor={fmtPct(stats.tasaDevoluciones)} />
        <Kpi icono={AlertTriangle} titulo="Tasa de retrasos" valor={fmtPct(stats.tasaRetrasos)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel titulo="Recursos más prestados">
          <GraficoTop datos={stats.recursosPopulares} color="oscuro" />
        </Panel>
        <Panel titulo="Usuarios más activos">
          <GraficoTop datos={stats.usuariosActivos} color="claro" />
        </Panel>
        <Panel titulo="Demanda de préstamos por día de la semana" ancho>
          <GraficoDemanda datos={stats.demandaPorDia} />
        </Panel>
      </div>
    </div>
  );
}
