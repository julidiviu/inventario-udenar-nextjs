"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DemandaDia, TopItem } from "@/lib/estadisticas";

const VERDE_OSCURO = "#0c7c3c";
const VERDE = "#14a34d";
const VERDE_PROFUNDO = "#0a5c2e";

/** Acorta etiquetas largas del eje Y sin romper el layout. */
function acortar(v: string): string {
  return v.length > 20 ? `${v.slice(0, 19)}…` : v;
}

function TooltipContenido({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <span className="font-semibold">{label}</span>: {String(payload[0]?.value ?? "—")}
    </div>
  );
}

function SinDatos() {
  return (
    <div className="flex h-72 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
      Sin datos suficientes.
    </div>
  );
}

/** Barras horizontales para los tops (recursos y usuarios). */
export function GraficoTop({ datos, color }: { datos: TopItem[]; color: "oscuro" | "claro" }) {
  if (datos.length === 0) return <SinDatos />;
  return (
    <div className="h-72 text-zinc-500 dark:text-zinc-400">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ left: 8, right: 40 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.2} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: "currentColor", fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="nombre"
            width={150}
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickFormatter={acortar}
          />
          <Tooltip content={<TooltipContenido />} cursor={{ fill: "currentColor", fillOpacity: 0.08 }} />
          <Bar dataKey="total" fill={color === "oscuro" ? VERDE_OSCURO : VERDE} radius={[0, 8, 8, 0]}>
            <LabelList dataKey="total" position="right" fill="currentColor" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras verticales Lun..Dom con los 7 días siempre presentes. */
export function GraficoDemanda({ datos }: { datos: DemandaDia[] }) {
  if (datos.every((d) => d.total === 0)) return <SinDatos />;
  return (
    <div className="h-72 text-zinc-500 dark:text-zinc-400">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 16 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.2} vertical={false} />
          <XAxis dataKey="dia" interval={0} tick={{ fill: "currentColor", fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fill: "currentColor", fontSize: 12 }} />
          <Tooltip content={<TooltipContenido />} cursor={{ fill: "currentColor", fillOpacity: 0.08 }} />
          <Bar dataKey="total" fill={VERDE_PROFUNDO} radius={[8, 8, 0, 0]}>
            <LabelList dataKey="total" position="top" fill="currentColor" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
