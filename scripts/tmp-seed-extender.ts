import { sql } from "drizzle-orm";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { del } from "@vercel/blob";
import { db, closeDb } from "../src/db/index.js";
import { uploadToBlob } from "../src/lib/blob.js";

const IDS_FILE = "scripts/tmp-seed-ids.json";
const QR_BASE = 98401;

async function main() {
  if (process.argv.includes("--clean")) {
    if (!existsSync(IDS_FILE)) {
      console.log("Nada que limpiar (sin archivo de ids).");
      await closeDb();
      return;
    }
    const ids = JSON.parse(readFileSync(IDS_FILE, "utf8")) as {
      prestamos: number[];
      solicitudes: number[];
      recursos: number[];
    };
    // Primero los PDFs en Blob (incluye regenerados por la extensión).
    const urls = (await db.execute(
      sql`SELECT contrato_prestamo_url AS url FROM prestamos WHERE id IN (${sql.join(ids.prestamos.map((id) => sql`${id}`), sql`, `)})`,
    )) as { url: string | null }[];
    for (const { url } of urls) {
      if (!url) continue;
      try {
        await del(url);
      } catch {
        // best-effort (la ruta ya pudo borrarlo al extender)
      }
    }
    const lista = (xs: number[]) => sql.join(xs.map((id) => sql`${id}`), sql`, `);
    if (ids.prestamos.length)
      await db.execute(sql`DELETE FROM prestamos WHERE id IN (${lista(ids.prestamos)})`);
    if (ids.solicitudes.length)
      await db.execute(sql`DELETE FROM solicitudes_prestamo WHERE id IN (${lista(ids.solicitudes)})`);
    if (ids.recursos.length)
      await db.execute(sql`DELETE FROM recursos WHERE id IN (${lista(ids.recursos)})`);
    console.log(
      "Limpieza OK:",
      JSON.stringify({ p: ids.prestamos.length, s: ids.solicitudes.length, r: ids.recursos.length }),
    );
    await closeDb();
    return;
  }

  const tipos = await db.execute(sql`SELECT id FROM tipos_recurso WHERE dependencia_id = 5 ORDER BY id LIMIT 1`);
  if (tipos.length === 0) throw new Error("Dep 5 sin tipos");
  const tipoId = (tipos[0] as { id: number }).id;

  const borrowers = await db.execute(
    sql`SELECT id FROM users WHERE codigo = '220034014' AND deleted_at IS NULL`,
  );
  if (borrowers.length === 0) throw new Error("Estudiante 220034014 no existe");
  const borrowerId = (borrowers[0] as { id: string }).id;

  const clash = await db.execute(sql`SELECT COUNT(*) AS n FROM recursos WHERE qr LIKE '984%'`);
  if ((clash[0] as { n: string }).n !== "0") throw new Error("Rango QR 984xx ocupado, abortando");

  const recursoIds: number[] = [];
  for (let i = 0; i < 2; i++) {
    const r = await db.execute(
      sql`INSERT INTO recursos (qr, tipo_id, nombre, descripcion, disponible) VALUES (${String(QR_BASE + i)}, ${tipoId}, ${`PRUEBA EXT 0${i + 1}`}, ${"Recurso temporal de prueba de extensión."}, false) RETURNING id`,
    );
    recursoIds.push((r[0] as { id: number }).id);
  }

  const s = await db.execute(
    sql`INSERT INTO solicitudes_prestamo (usuario_id, recurso_id, fecha_devolucion, estado) VALUES (${borrowerId}, ${recursoIds[0]}, '2026-12-15', 'aprobado') RETURNING id`,
  );
  const solicitudId = (s[0] as { id: number }).id;

  const prestamoIds: number[] = [];
  const p1 = await db.execute(
    sql`INSERT INTO prestamos (solicitud_id, usuario_id, recurso_id, fecha_devolucion, devuelto) VALUES (${solicitudId}, ${borrowerId}, ${recursoIds[0]}, '2026-12-15', false) RETURNING id`,
  );
  prestamoIds.push((p1[0] as { id: number }).id);
  const p2 = await db.execute(
    sql`INSERT INTO prestamos (usuario_id, recurso_id, fecha_devolucion, devuelto) VALUES (${borrowerId}, ${recursoIds[1]}, '2026-12-15', false) RETURNING id`,
  );
  prestamoIds.push((p2[0] as { id: number }).id);

  // Contrato inicial temporal (PDF mínimo válido): al extender se reemplaza por el
  // real y este se elimina (prueba el del-old). No abrirlo antes: es un dummy.
  const dummy = new File(
    [`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF`],
    "contrato-inicial-tmp.pdf",
    { type: "application/pdf" },
  );
  const { url } = await uploadToBlob(dummy, "contratos_prestamo", "pdf");
  await db.execute(sql`UPDATE prestamos SET contrato_prestamo_url = ${url} WHERE id = ${prestamoIds[0]}`);

  writeFileSync(IDS_FILE, JSON.stringify({ prestamos: prestamoIds, solicitudes: [solicitudId], recursos: recursoIds }));
  console.log(`Seed OK: 2 recursos, 1 solicitud, 2 préstamos (ids ${prestamoIds.join(",")}), contrato inicial subido.`);
  await closeDb();
}

main().catch(async (e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  await closeDb();
  process.exit(1);
});
