CREATE TYPE "public"."estado_solicitud" AS ENUM('pendiente', 'aprobado', 'rechazado');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('admin', 'estudiante', 'profesor');--> statement-breakpoint
CREATE TYPE "public"."tipo_notificacion" AS ENUM('SOLICITUD', 'APROBADA', 'RECHAZADA', 'DEVUELTA');--> statement-breakpoint
CREATE TABLE "dependencias" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"imagen_url" text,
	"administrador_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "dependencias_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "dependencias_nombre_unique" UNIQUE("nombre"),
	CONSTRAINT "dependencias_administrador_id_unique" UNIQUE("administrador_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"password_hash" text NOT NULL,
	"rol" "rol" DEFAULT 'estudiante' NOT NULL,
	"cedula" varchar(20) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"programa" varchar(100),
	"telefono" varchar(20),
	"foto_url" text,
	"firma_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "users_cedula_unique" UNIQUE("cedula")
);
--> statement-breakpoint
CREATE TABLE "recursos" (
	"id" serial PRIMARY KEY NOT NULL,
	"qr" text NOT NULL,
	"tipo_id" integer NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"descripcion" text NOT NULL,
	"foto_url" text,
	"disponible" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "recursos_qr_unique" UNIQUE("qr")
);
--> statement-breakpoint
CREATE TABLE "tipos_recurso" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"dependencia_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" "tipo_notificacion" NOT NULL,
	"mensaje" text NOT NULL,
	"url" varchar(255),
	"leida" boolean DEFAULT false NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prestamos" (
	"id" serial PRIMARY KEY NOT NULL,
	"solicitud_id" integer,
	"usuario_id" uuid NOT NULL,
	"recurso_id" integer NOT NULL,
	"fecha_prestamo" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_devolucion" date NOT NULL,
	"fecha_devolucion_real" timestamp with time zone,
	"firmado_url" text,
	"contrato_prestamo_url" text,
	"devuelto" boolean DEFAULT false NOT NULL,
	CONSTRAINT "prestamos_solicitud_id_unique" UNIQUE("solicitud_id"),
	CONSTRAINT "prestamos_fecha_check" CHECK (fecha_devolucion >= fecha_prestamo::date)
);
--> statement-breakpoint
CREATE TABLE "solicitudes_prestamo" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"recurso_id" integer NOT NULL,
	"fecha_solicitud" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_devolucion" date NOT NULL,
	"estado" "estado_solicitud" DEFAULT 'pendiente' NOT NULL,
	"contrato_solicitud_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "solicitudes_fecha_check" CHECK (fecha_devolucion >= fecha_solicitud::date)
);
--> statement-breakpoint
ALTER TABLE "dependencias" ADD CONSTRAINT "dependencias_administrador_id_users_id_fk" FOREIGN KEY ("administrador_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recursos" ADD CONSTRAINT "recursos_tipo_id_tipos_recurso_id_fk" FOREIGN KEY ("tipo_id") REFERENCES "public"."tipos_recurso"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tipos_recurso" ADD CONSTRAINT "tipos_recurso_dependencia_id_dependencias_id_fk" FOREIGN KEY ("dependencia_id") REFERENCES "public"."dependencias"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_solicitud_id_solicitudes_prestamo_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes_prestamo"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_recurso_id_recursos_id_fk" FOREIGN KEY ("recurso_id") REFERENCES "public"."recursos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_prestamo" ADD CONSTRAINT "solicitudes_prestamo_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_prestamo" ADD CONSTRAINT "solicitudes_prestamo_recurso_id_recursos_id_fk" FOREIGN KEY ("recurso_id") REFERENCES "public"."recursos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tipos_recurso_nombre_dependencia_uniq" ON "tipos_recurso" USING btree ("nombre","dependencia_id");--> statement-breakpoint
CREATE INDEX "notificaciones_usuario_leida_fecha_idx" ON "notificaciones" USING btree ("usuario_id","leida","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "prestamos_recurso_activo_uniq" ON "prestamos" USING btree ("recurso_id") WHERE "prestamos"."devuelto" = false;--> statement-breakpoint
CREATE INDEX "prestamos_devuelto_idx" ON "prestamos" USING btree ("devuelto");--> statement-breakpoint
CREATE UNIQUE INDEX "solicitudes_usuario_recurso_pendiente_uniq" ON "solicitudes_prestamo" USING btree ("usuario_id","recurso_id") WHERE "solicitudes_prestamo"."estado" = 'pendiente';--> statement-breakpoint
CREATE INDEX "solicitudes_estado_idx" ON "solicitudes_prestamo" USING btree ("estado");