import { and, count, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema/auth";
import { recursos, tiposRecurso } from "@/db/schema/inventario";
import { prestamos } from "@/db/schema/prestamos";
import { hoyBogota, toISODate } from "@/lib/recursos";

export interface TopItem {
  nombre: string;
  total: number;
}

export interface DemandaDia {
  dia: string;
  total: number;
}

export interface Estadisticas {
  recursosDisponibles: number;
  recursosPrestados: number;
  totalPrestamos: number;
  prestamosMes: number;
  /** Días promedio (1 decimal). Null si no hay préstamos terminados con fecha real. */
  promedioDuracion: number | null;
  /** % devueltos sobre el total. Null sin préstamos. */
  tasaDevoluciones: number | null;
  /** % retrasados sobre los pendientes. Null sin pendientes. */
  tasaRetrasos: number | null;
  recursosPopulares: TopItem[];
  usuariosActivos: TopItem[];
  demandaPorDia: DemandaDia[];
}

/** Dom..Sáb en el orden de extract(dow): 0=Domingo. */
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function redondeo1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Agregados de la dependencia para /estadisticas.
 * Los recursos se acotan vía tiposRecurso.dependenciaId (recursos no tiene dependencia_id).
 */
export async function getEstadisticas(dependenciaId: number): Promise<Estadisticas> {
  const enDep = eq(tiposRecurso.dependenciaId, dependenciaId);
  const prestamosDep = and(enDep);
  const hoy = hoyBogota();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioSiguiente = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
  // extract(dow) ya devuelve 0=Dom..6=Sáb en hora de Colombia.
  const dowExpr = sql<number>`extract(dow from (${prestamos.fechaPrestamo} at time zone 'America/Bogota'))`;

  const [
    [{ n: disponibles }],
    [{ n: prestados }],
    [{ n: total }],
    [{ n: mes }],
    [{ prom }],
    [{ n: devueltos }],
    [{ n: retrasados }],
    topRecursos,
    topUsuarios,
    demandaRows,
  ] = await Promise.all([
    db
      .select({ n: count() })
      .from(recursos)
      .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
      .where(and(enDep, eq(recursos.disponible, true))),
    db
      .select({ n: count() })
      .from(recursos)
      .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
      .where(and(enDep, eq(recursos.disponible, false))),
    db
      .select({ n: count() })
      .from(prestamos)
      .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
      .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
      .where(prestamosDep),
    db
      .select({ n: count() })
      .from(prestamos)
      .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
      .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
      .where(and(prestamosDep, gte(prestamos.fechaPrestamo, inicioMes), lt(prestamos.fechaPrestamo, inicioSiguiente))),
    // Solo terminados con fecha real (fecha_devolucion es la pactada, no sirve).
    db
      .select({
        prom: sql<string | null>`avg(extract(epoch from (${prestamos.fechaDevolucionReal} - ${prestamos.fechaPrestamo})) / 86400)`,
      })
      .from(prestamos)
      .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
      .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
      .where(and(prestamosDep, eq(prestamos.devuelto, true), isNotNull(prestamos.fechaDevolucionReal))),
    db
      .select({ n: count() })
      .from(prestamos)
      .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
      .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
      .where(and(prestamosDep, eq(prestamos.devuelto, true))),
    db
      .select({ n: count() })
      .from(prestamos)
      .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
      .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
      .where(and(prestamosDep, eq(prestamos.devuelto, false), sql`${prestamos.fechaDevolucion} < ${toISODate(hoy)}`)),
    db
      .select({ nombre: recursos.nombre, total: count() })
      .from(prestamos)
      .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
      .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
      .where(prestamosDep)
      .groupBy(recursos.id, recursos.nombre)
      .orderBy(desc(count()))
      .limit(5),
    db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        codigo: users.codigo,
        total: count(),
      })
      .from(prestamos)
      .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
      .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
      .innerJoin(users, eq(prestamos.usuarioId, users.id))
      .where(prestamosDep)
      .groupBy(prestamos.usuarioId, users.firstName, users.lastName, users.codigo)
      .orderBy(desc(count()))
      .limit(5),
    db
      .select({ dow: dowExpr, total: count() })
      .from(prestamos)
      .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
      .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
      .where(prestamosDep)
      .groupBy(dowExpr),
  ]);

  const pendientes = total - devueltos;
  const porDia = new Map<number, number>(demandaRows.map((r) => [Number(r.dow), r.total]));

  return {
    recursosDisponibles: disponibles,
    recursosPrestados: prestados,
    totalPrestamos: total,
    prestamosMes: mes,
    promedioDuracion: prom === null ? null : redondeo1(Number(prom)),
    tasaDevoluciones: total === 0 ? null : redondeo1((devueltos / total) * 100),
    tasaRetrasos: pendientes === 0 ? null : redondeo1((retrasados / pendientes) * 100),
    recursosPopulares: topRecursos.map((r) => ({ nombre: r.nombre, total: r.total })),
    usuariosActivos: topUsuarios.map((u) => ({
      nombre: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || `Cód. ${u.codigo}`,
      total: u.total,
    })),
    demandaPorDia: DIAS.map((dia, i) => ({ dia, total: porDia.get(i) ?? 0 })),
  };
}
