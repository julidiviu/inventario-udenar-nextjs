/** Correo transaccional vía Brevo API HTTP (fetch, sin SMTP: apto para serverless/Vercel). */
import { formatFechaCO } from "./dates";

export interface EmailDestino {
  toEmail: string;
  toName?: string | null;
  subject: string;
  html: string;
  text: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Envío best-effort: nunca lanza, el flujo de negocio ya hizo commit.
 * En no-producción redirige a EMAIL_TEST (con nota del destinatario real);
 * sin EMAIL_TEST en dev no envía nada (fail-safe, jamás spamea reales).
 */
export async function sendEmail(opts: EmailDestino): Promise<{ sent: boolean; to: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;
  if (!apiKey || !fromEmail) {
    console.warn("[email] BREVO_API_KEY o EMAIL_FROM sin configurar; correo omitido.");
    return { sent: false, to: opts.toEmail };
  }
  const esProd = process.env.NODE_ENV === "production";
  const testEmail = process.env.EMAIL_TEST || null;
  // EMAIL_REAL=1 fuerza destinatario real en dev (ventana de prueba controlada con datos reales).
  const real = esProd || process.env.EMAIL_REAL === "1";
  const to = !real && testEmail ? testEmail : opts.toEmail;
  const subject = !real && testEmail ? `[Prueba] ${opts.subject}` : opts.subject;
  const banner = !real && testEmail
    ? `<div style="background:#fef3c7;color:#92400e;font-size:12px;padding:8px 16px;">Correo de prueba — destinatario real: ${esc(opts.toEmail)}</div>`
    : "";
  const html = opts.html.replace(/<body[^>]*>/, (m) => `${m}${banner}`);

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: process.env.EMAIL_FROM_NAME || "SisPréstamos", email: fromEmail },
        to: [{ email: to, name: opts.toName || undefined }],
        subject,
        htmlContent: html,
        textContent: opts.text,
      }),
    });
    if (!res.ok) {
      console.error("[email] Brevo respondió", res.status, (await res.text()).slice(0, 200));
      return { sent: false, to };
    }
    return { sent: true, to };
  } catch (err) {
    console.error("[email] fallo de red (best-effort):", err instanceof Error ? err.message : err);
    return { sent: false, to };
  }
}

/** Base absoluta para los links del correo (en Vercel: URL de producción). */
function appUrl(path: string): string {
  return `${(process.env.APP_URL || "").replace(/\/+$/, "")}${path}`;
}

export interface RechazoArgs {
  nombre: string;
  rol: string;
  recurso: string;
  adminNombre: string;
}

/** Plantilla RECHAZADA: HTML con tablas + CSS inline (los clientes de correo ignoran Tailwind). */
export function plantillaSolicitudRechazada(args: RechazoArgs): Pick<EmailDestino, "subject" | "html" | "text"> {
  const nombre = esc(args.nombre);
  const recurso = esc(args.recurso);
  const admin = esc(args.adminNombre);
  const rol = esc(args.rol);
  const subject = `Solicitud rechazada: ${args.recurso}`;
  const verUrl = appUrl("/mis-solicitudes?estado=rechazada");
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3fff7;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
<tr><td style="background:#0c7c3c;color:#ffffff;padding:20px 24px;">
<div style="font-size:18px;font-weight:bold;">Sistema de Préstamos</div>
<div style="font-size:13px;color:#d6ffe8;">Recursos educativos</div>
</td></tr>
<tr><td style="padding:24px;color:#171717;font-size:15px;line-height:1.5;">
<p>Hola ${nombre} (${rol}),</p>
<p>Tu solicitud de préstamo del recurso <strong>'${recurso}'</strong> ha sido <strong>rechazada</strong> por ${admin}.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3fff7;border:1px solid #e5e7eb;border-radius:6px;margin:16px 0;">
<tr><td style="padding:12px 16px;font-size:14px;">
<div><strong>Recurso:</strong> ${recurso}</div>
<div><strong>Estado:</strong> Rechazada</div>
<div><strong>Revisado por:</strong> ${admin}</div>
</td></tr>
</table>
<p>Si tienes dudas, acércate a la dependencia correspondiente.</p>
<p><a href="${verUrl}" style="display:inline-block;background:#0c7c3c;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:bold;">Ver mis solicitudes</a></p>
</td></tr>
<tr><td style="padding:16px 24px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">
Este correo es automático, no responder. Remitente: SisPréstamos UDENAR.
</td></tr>
</table>
</td></tr></table>
</body></html>`;
  const text = `Hola ${args.nombre} (${args.rol}): tu solicitud del recurso '${args.recurso}' fue rechazada por ${args.adminNombre}. Ver: ${verUrl}`;
  return { subject, html, text };
}

/** Marco común de las plantillas (los clientes de correo ignoran Tailwind: tablas + inline). */
function marco(m: { saludo: string; intro: string; filas: string; ctaTexto: string; ctaUrl: string }): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3fff7;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
<tr><td style="background:#0c7c3c;color:#ffffff;padding:20px 24px;">
<div style="font-size:18px;font-weight:bold;">Sistema de Préstamos</div>
<div style="font-size:13px;color:#d6ffe8;">Recursos educativos</div>
</td></tr>
<tr><td style="padding:24px;color:#171717;font-size:15px;line-height:1.5;">
<p>${m.saludo}</p>
<p>${m.intro}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3fff7;border:1px solid #e5e7eb;border-radius:6px;margin:16px 0;">
<tr><td style="padding:12px 16px;font-size:14px;">${m.filas}</td></tr>
</table>
<p><a href="${m.ctaUrl}" style="display:inline-block;background:#0c7c3c;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:bold;">${m.ctaTexto}</a></p>
</td></tr>
<tr><td style="padding:16px 24px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">
Este correo es automático, no responder. Remitente: SisPréstamos UDENAR.
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function fila(label: string, value: string): string {
  return `<div><strong>${label}:</strong> ${esc(value)}</div>`;
}

/** SOLICITUD nueva → admin de la dependencia. */
export function plantillaSolicitudCreada(a: { adminNombre: string; solicitante: string; recurso: string; fechaDevolucion: string }): Pick<EmailDestino, "subject" | "html" | "text"> {
  const fecha = formatFechaCO(a.fechaDevolucion);
  const url = appUrl("/solicitudes?estado=pendiente");
  const html = marco({
    saludo: `Hola ${esc(a.adminNombre)},`,
    intro: `${esc(a.solicitante)} ha solicitado el préstamo del recurso <strong>'${esc(a.recurso)}'</strong>.`,
    filas: fila("Solicitante", a.solicitante) + fila("Recurso", a.recurso) + fila("Devolución solicitada", fecha),
    ctaTexto: "Revisar solicitudes",
    ctaUrl: url,
  });
  return { subject: `Nueva solicitud: ${a.recurso}`, html, text: `Hola ${a.adminNombre}: ${a.solicitante} solicitó '${a.recurso}' (devolución ${fecha}). Ver: ${url}` };
}

/** APROBADA → estudiante/profesor solicitante. */
export function plantillaSolicitudAprobada(a: { nombre: string; rol: string; recurso: string; fechaDevolucion: string; adminNombre: string }): Pick<EmailDestino, "subject" | "html" | "text"> {
  const fecha = formatFechaCO(a.fechaDevolucion);
  const url = appUrl("/mis-prestamos?estado=pendiente");
  const html = marco({
    saludo: `Hola ${esc(a.nombre)} (${esc(a.rol)}),`,
    intro: `Tu solicitud de préstamo del recurso <strong>'${esc(a.recurso)}'</strong> fue <strong>aprobada</strong> por ${esc(a.adminNombre)}. Fecha máxima de devolución: <strong>${esc(fecha)}</strong>.`,
    filas: fila("Recurso", a.recurso) + fila("Fecha máxima de devolución", fecha) + fila("Aprobado por", a.adminNombre),
    ctaTexto: "Ver mis préstamos",
    ctaUrl: url,
  });
  return { subject: `Préstamo aprobado: ${a.recurso} — devolución ${fecha}`, html, text: `Hola ${a.nombre} (${a.rol}): tu solicitud de '${a.recurso}' fue aprobada por ${a.adminNombre}. Devuelve máximo el ${fecha}. Ver: ${url}` };
}

/** DEVUELTA → prestatario. */
export function plantillaPrestamoDevuelto(a: { nombre: string; rol: string; recurso: string }): Pick<EmailDestino, "subject" | "html" | "text"> {
  const url = appUrl("/mis-prestamos?estado=devuelto");
  const html = marco({
    saludo: `Hola ${esc(a.nombre)} (${esc(a.rol)}),`,
    intro: `Tu préstamo del recurso <strong>'${esc(a.recurso)}'</strong> ha sido <strong>devuelto satisfactoriamente</strong>.`,
    filas: fila("Recurso", a.recurso) + fila("Estado", "Devuelto"),
    ctaTexto: "Ver mis préstamos",
    ctaUrl: url,
  });
  return { subject: `Devolución registrada: ${a.recurso}`, html, text: `Hola ${a.nombre} (${a.rol}): tu préstamo de '${a.recurso}' fue devuelto satisfactoriamente. Ver: ${url}` };
}

/** EXTENDIDA → prestatario. */
export function plantillaPrestamoExtendido(a: { nombre: string; rol: string; recurso: string; nuevaFecha: string }): Pick<EmailDestino, "subject" | "html" | "text"> {
  const fecha = formatFechaCO(a.nuevaFecha);
  const url = appUrl("/mis-prestamos?estado=pendiente");
  const html = marco({
    saludo: `Hola ${esc(a.nombre)} (${esc(a.rol)}),`,
    intro: `Tu préstamo del recurso <strong>'${esc(a.recurso)}'</strong> ha sido <strong>extendido</strong>. Nueva fecha máxima de devolución: <strong>${esc(fecha)}</strong>.`,
    filas: fila("Recurso", a.recurso) + fila("Nueva fecha de devolución", fecha),
    ctaTexto: "Ver mis préstamos",
    ctaUrl: url,
  });
  return { subject: `Préstamo extendido: ${a.recurso} — nueva fecha ${fecha}`, html, text: `Hola ${a.nombre} (${a.rol}): tu préstamo de '${a.recurso}' fue extendido hasta el ${fecha}. Ver: ${url}` };
}

/** Etiqueta de plazo para vencimientos (misma en campanita y correo). */
export function etiquetaVencimiento(diasRestantes: number): string {
  return diasRestantes <= 0 ? "hoy" : diasRestantes === 1 ? "mañana" : `en ${diasRestantes} días`;
}

/** VENCIMIENTO individual → estudiante/profesor prestatario. */
export function plantillaVencimiento(a: { nombre: string; rol: string; recurso: string; fechaDevolucion: string; diasRestantes: number }): Pick<EmailDestino, "subject" | "html" | "text"> {
  const fecha = formatFechaCO(a.fechaDevolucion);
  const etiqueta = etiquetaVencimiento(a.diasRestantes);
  const url = appUrl("/mis-prestamos?estado=pendiente");
  const html = marco({
    saludo: `Hola ${esc(a.nombre)} (${esc(a.rol)}),`,
    intro: `Tu préstamo del recurso <strong>'${esc(a.recurso)}'</strong> vence <strong>${esc(etiqueta)}</strong> (${esc(fecha)}).`,
    filas: fila("Recurso", a.recurso) + fila("Fecha de devolución", fecha) + fila("Estado", `Vence ${etiqueta}`),
    ctaTexto: "Ver mis préstamos",
    ctaUrl: url,
  });
  return { subject: `Tu préstamo vence ${etiqueta}: ${a.recurso}`, html, text: `Hola ${a.nombre} (${a.rol}): tu préstamo de '${a.recurso}' vence ${etiqueta} (${fecha}). Ver: ${url}` };
}

export interface ItemResumenVencimiento {
  recurso: string;
  solicitante: string;
  fechaDevolucion: string;
  diasRestantes: number;
}

/** Resumen diario agrupado → admin de la dependencia (solo se envía con contenido). */
export function plantillaResumenVencimientos(a: { adminNombre: string; items: ItemResumenVencimiento[] }): Pick<EmailDestino, "subject" | "html" | "text"> {
  const url = appUrl("/prestamos?estado=pendiente");
  const ordenados = [...a.items].sort((x, y) => x.diasRestantes - y.diasRestantes);
  const bloques = ordenados
    .map(
      (it) =>
        `<div style="padding:8px 0;border-bottom:1px solid #e5e7eb;"><strong>'${esc(it.recurso)}'</strong> — ${esc(it.solicitante)}<br><span style="color:#6b7280;">Vence ${esc(etiquetaVencimiento(it.diasRestantes))} (${esc(formatFechaCO(it.fechaDevolucion))})</span></div>`,
    )
    .join("");
  const html = marco({
    saludo: `Hola ${esc(a.adminNombre)},`,
    intro: `Tienes <strong>${ordenados.length} préstamo(s)</strong> próximos a vencer en tu dependencia:`,
    filas: bloques,
    ctaTexto: "Ver préstamos",
    ctaUrl: url,
  });
  const text = `Hola ${a.adminNombre}: ${ordenados.length} préstamo(s) por vencer:\n${ordenados.map((it) => `- '${it.recurso}' (${it.solicitante}): vence ${etiquetaVencimiento(it.diasRestantes)} (${formatFechaCO(it.fechaDevolucion)})`).join("\n")}\nVer: ${url}`;
  return { subject: `Resumen de vencimientos: ${ordenados.length} préstamo(s)`, html, text };
}
