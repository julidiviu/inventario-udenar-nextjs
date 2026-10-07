import { NextResponse } from "next/server";
import { and, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  avisosVencimiento,
  dependencias,
  notificaciones,
  prestamos,
  recursos,
  tiposRecurso,
  users,
} from "@/db/schema";
import {
  etiquetaVencimiento,
  plantillaResumenVencimientos,
  plantillaVencimiento,
  sendEmail,
  type ItemResumenVencimiento,
} from "@/lib/email";
import { formatFechaCO } from "@/lib/dates";
import { hoyBogota, toISODate } from "@/lib/recursos";

export const dynamic = "force-dynamic";

// Vercel Cron usa UTC: 01:00 UTC = 8:00pm Bogotá (UTC-5 fijo, sin horario de verano).
// El schedule vive en vercel.json; este endpoint también acepta disparo manual con el secreto.

function nombreCompleto(firstName: string | null, lastName: string | null, codigo: string): string {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || `Cód. ${codigo}`;
}

/**
 * GET /api/cron/vencimientos — Authorization: Bearer <CRON_SECRET>.
 * Vercel envía ese header solo si CRON_SECRET existe en el proyecto.
 * Avisos de préstamos que vencen en 3 días, mañana u hoy:
 * campanita (estudiante + admin, 1 fila por préstamo) + email
 * (individual al estudiante, resumen agrupado al admin, solo con contenido).
 */
export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return NextResponse.json({ error: "Cron no configurado." }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const hoy = toISODate(hoyBogota());
  const base = Date.parse(`${hoy}T12:00:00Z`);
  const admin = alias(users, "admin");

  const candidatos = await db
    .select({
      prestamoId: prestamos.id,
      recurso: recursos.nombre,
      fechaDevolucion: prestamos.fechaDevolucion,
      usuarioId: prestamos.usuarioId,
      usuarioEmail: users.email,
      usuarioFirstName: users.firstName,
      usuarioLastName: users.lastName,
      usuarioCodigo: users.codigo,
      usuarioRol: users.rol,
      adminId: dependencias.administradorId,
      adminEmail: admin.email,
      adminFirstName: admin.firstName,
      adminLastName: admin.lastName,
      adminCodigo: admin.codigo,
      adminActivo: admin.isActive,
    })
    .from(prestamos)
    .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
    .innerJoin(users, eq(prestamos.usuarioId, users.id))
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .innerJoin(dependencias, eq(tiposRecurso.dependenciaId, dependencias.id))
    .leftJoin(admin, eq(dependencias.administradorId, admin.id))
    .where(
      and(
        eq(prestamos.devuelto, false),
        eq(users.isActive, true),
        isNull(dependencias.deletedAt),
        gte(prestamos.fechaDevolucion, hoy),
      ),
    );

  const enVentana = candidatos
    .map((c) => ({
      ...c,
      dias: Math.round((Date.parse(`${c.fechaDevolucion}T12:00:00Z`) - base) / 86400000),
    }))
    .filter((c) => c.dias === 0 || c.dias === 1 || c.dias === 3);

  let procesados = 0;
  let omitidos = 0;
  const avisados: typeof enVentana = [];
  for (const c of enVentana) {
    // Una sola tx por préstamo: aviso + filas de campanita entran juntas o ninguna.
    try {
      await db.transaction(async (tx) => {
        const ins = await tx
          .insert(avisosVencimiento)
          .values({ prestamoId: c.prestamoId, fechaDevolucion: c.fechaDevolucion, diasRestantes: c.dias })
          .onConflictDoNothing()
          .returning({ id: avisosVencimiento.id });
        if (ins.length === 0) throw new Error("omitido");
        const etiqueta = etiquetaVencimiento(c.dias);
        const fecha = formatFechaCO(c.fechaDevolucion);
        const solicitante = nombreCompleto(c.usuarioFirstName, c.usuarioLastName, c.usuarioCodigo);
        const filas: (typeof notificaciones.$inferInsert)[] = [
          {
            usuarioId: c.usuarioId,
            tipo: "VENCIMIENTO",
            mensaje: `Tu préstamo del recurso '${c.recurso}' vence ${etiqueta} (${fecha}).`,
            url: "/mis-prestamos?estado=pendiente",
          },
        ];
        if (c.adminId) {
          filas.push({
            usuarioId: c.adminId,
            tipo: "VENCIMIENTO",
            mensaje: `El préstamo del recurso '${c.recurso}' a ${solicitante} vence ${etiqueta} (${fecha}).`,
            url: "/prestamos?estado=pendiente",
          });
        }
        await tx.insert(notificaciones).values(filas);
      });
      procesados++;
      avisados.push(c);
    } catch (err) {
      if (err instanceof Error && err.message === "omitido") omitidos++;
      else throw err;
    }
  }

  // Emails post-commit, solo para avisos recién insertados.
  let emailsEstudiante = 0;
  const porAdmin = new Map<string, { email: string; nombre: string; items: ItemResumenVencimiento[] }>();
  for (const a of avisados) {
    const solicitante = nombreCompleto(a.usuarioFirstName, a.usuarioLastName, a.usuarioCodigo);
    if (a.usuarioEmail) {
      const t = plantillaVencimiento({
        nombre: solicitante,
        rol: a.usuarioRol,
        recurso: a.recurso,
        fechaDevolucion: a.fechaDevolucion,
        diasRestantes: a.dias,
      });
      if ((await sendEmail({ toEmail: a.usuarioEmail, toName: solicitante, ...t })).sent) emailsEstudiante++;
    }
    if (a.adminId && a.adminEmail && a.adminActivo) {
      const g = porAdmin.get(a.adminId) ?? {
        email: a.adminEmail,
        nombre: nombreCompleto(a.adminFirstName, a.adminLastName, a.adminCodigo ?? ""),
        items: [],
      };
      g.items.push({ recurso: a.recurso, solicitante, fechaDevolucion: a.fechaDevolucion, diasRestantes: a.dias });
      porAdmin.set(a.adminId, g);
    }
  }
  let emailsAdmin = 0;
  for (const g of porAdmin.values()) {
    const t = plantillaResumenVencimientos({ adminNombre: g.nombre, items: g.items });
    if ((await sendEmail({ toEmail: g.email, toName: g.nombre, ...t })).sent) emailsAdmin++;
  }

  // Limpieza: avisos viejos y de préstamos ya devueltos (tabla de corto plazo, no historial).
  const corte = new Date(hoyBogota());
  corte.setDate(corte.getDate() - 7);
  await db.delete(avisosVencimiento).where(lt(avisosVencimiento.fechaDevolucion, toISODate(corte)));
  const devueltos = await db
    .select({ id: prestamos.id })
    .from(prestamos)
    .where(eq(prestamos.devuelto, true));
  if (devueltos.length > 0) {
    await db.delete(avisosVencimiento).where(
      inArray(
        avisosVencimiento.prestamoId,
        devueltos.map((d) => d.id),
      ),
    );
  }

  const resumen = { ok: true, hoy, procesados, omitidos, emailsEstudiante, emailsAdmin };
  console.log("[cron:vencimientos]", JSON.stringify(resumen));
  return NextResponse.json(resumen);
}
