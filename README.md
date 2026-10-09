# Sistema Web para la Gestión de Préstamos e Inventario de Recursos Académicos

Sistema desarrollado como proyecto de grado para la Universidad de Nariño, cuyo propósito es gestionar el inventario de recursos académicos y el préstamo de equipos entre estudiantes, docentes y administradores.

Reescritura del proyecto anterior (Django + Django REST Framework) en Next.js con App Router.

---

# Tecnologías utilizadas

- TypeScript
- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- Drizzle ORM + postgres-js
- PostgreSQL (Neon, vía Vercel Marketplace)
- Vercel Blob (archivos: fotos, firmas, contratos PDF)
- jose (sesión JWT HS256 en cookie httpOnly, 2 horas)
- bcryptjs (hash de contraseñas)
- Brevo API HTTP (correos transaccionales, sin SDK)
- @react-pdf/renderer (contratos de préstamo en PDF)
- recharts (estadísticas)
- react-day-picker, react-signature-canvas
- Vercel (app + Cron Jobs)

---

# Acceso al sistema

El proyecto se encuentra desplegado en Vercel.

## URL

https://inventario-udenar-nextjs.vercel.app

Chequeo de salud: `GET /api/health` → `{"ok":true,"db":"up"}`.

---

# Credenciales de prueba

El ingreso es con **código** y **contraseña** (no con email). La sesión dura 2 horas.

## Superadministrador

Administra dependencias, administradores, usuarios y el cierre de semestre.

| Campo | Valor |
|-------|-------|
| Código | **12345** |
| Contraseña | **12345678** |

## Administrador de dependencia

Corresponde al administrador de una dependencia académica (por ejemplo, Director del Departamento de Sistemas), desde donde se administran recursos y préstamos.

| Campo | Valor |
|-------|-------|
| Código | **123455** |
| Contraseña | **123456785** |

Con este usuario es posible:

- Administrar el inventario de recursos.
- Registrar nuevos recursos.
- Gestionar solicitudes y préstamos.
- Aprobar o rechazar solicitudes.
- Devolver y extender préstamos.
- Generar contratos en PDF.
- Consultar estadísticas.

## Usuario estudiante

| Campo | Valor |
|-------|-------|
| Código | **220034014** |
| Contraseña | **220034014** |

Este usuario permite visualizar el funcionamiento del sistema desde la perspectiva de un estudiante: solicitar préstamos, ver mis solicitudes y mis préstamos, y completar el perfil (foto, teléfono y firma).

---

# Restauración de datos

Si la base de datos se reinicia o se pierde la información, el sistema **no** crea usuarios automáticamente durante el despliegue. El punto de partida es el script re-ejecutable:

```bash
npm run db:seed:admin
```

Crea administradores (y su dependencia si no existe). Funciona en modo interactivo (pregunta por consola) o con flags `--rol --codigo --email --nombres --apellidos --dep-codigo --dep-nombre --password --yes` (ver `scripts/seed-admin.ts --help`).

El orden recomendado es el siguiente:

1. Ejecutar el seed para crear el superadmin (y la dependencia si se indica).
2. Iniciar sesión con el superadmin.
3. Crear la dependencia académica (si no se creó con el seed).
4. Crear el usuario administrador y asignarle la dependencia.
5. Iniciar sesión con ese administrador.
6. Registrar recursos.
7. Crear usuarios estudiantes o docentes (o ellos se registran solos).
8. Comenzar a utilizar nuevamente el sistema.

---

# Características principales

- Gestión de inventario por dependencia (tipos y recursos con QR).
- Solicitud de préstamos por estudiantes y docentes (fecha de devolución ≥ 5 días hábiles).
- Aprobación, rechazo y cancelación de solicitudes.
- Préstamos con devolución y extensión de fecha.
- Contratos de préstamo en PDF (generación automática al aprobar).
- Gestión de usuarios, administradores y dependencias (borrado lógico).
- Administración por dependencias.
- Estadísticas por dependencia.
- Cierre de semestre (tope de fecha para solicitudes y extensiones).
- Notificaciones en campanita + correos transaccionales (solicitud, aprobada, rechazada, devuelta, extendida, vencimiento).
- Cron diario de vencimientos (8:00 p. m. hora Colombia).
- Perfil con foto, teléfono y firma (canvas o subida).
- Autenticación propia con JWT en cookie httpOnly.
- Tema claro/oscuro sin dependencias.

---

# Despliegue

El sistema fue desplegado utilizando:

- Vercel (app Next.js + Cron Jobs, `0 1 * * *` UTC = 8:00 p. m. en Colombia)
- Neon Postgres (vía Vercel Marketplace; URL con pooler para la app, URL directa solo para migraciones)
- Vercel Blob (store **público** para fotos, firmas y contratos)
- Brevo (correos transaccionales)

---

# Desarrollo local

```bash
npm install
docker compose up -d   # Postgres 16 "inventario_postgres" en :5433
cp .env.example .env.local  # y diligenciar: DATABASE_URL, AUTH_SECRET (≥32), BLOB_READ_WRITE_TOKEN, BREVO_*, APP_URL, CRON_SECRET
npm run db:migrate      # o db:push
npm run db:seed:admin
npm run dev             # http://localhost:3000
```

Verificación: `npx tsc --noEmit` → `npm run lint` → `npm run build`.

Notas:

- Drizzle-kit no lee `.env.local`: usar siempre los scripts `db:*` (ya envueltos con `dotenv-cli`).
- `next dev` sí lee `.env.local`, pero exige reinicio ante variables nuevas.
- La DB usa zona horaria `America/Bogota` (los `timestamptz` se guardan en UTC pero `now()`/fechas usan fecha Colombia).

---

# Autor

Julian Esteban Cañar Lituma

Ingeniería de Sistemas

Universidad de Nariño
