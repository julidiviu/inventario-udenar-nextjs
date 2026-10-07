ALTER TYPE "public"."tipo_notificacion" ADD VALUE 'VENCIMIENTO';--> statement-breakpoint
CREATE TABLE "avisos_vencimiento" (
	"id" serial PRIMARY KEY NOT NULL,
	"prestamo_id" integer NOT NULL,
	"fecha_devolucion" date NOT NULL,
	"dias_restantes" integer NOT NULL,
	"enviado_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "avisos_vencimiento" ADD CONSTRAINT "avisos_vencimiento_prestamo_id_prestamos_id_fk" FOREIGN KEY ("prestamo_id") REFERENCES "public"."prestamos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "avisos_prestamo_fecha_dias_uniq" ON "avisos_vencimiento" USING btree ("prestamo_id","fecha_devolucion","dias_restantes");--> statement-breakpoint
CREATE INDEX "avisos_fecha_idx" ON "avisos_vencimiento" USING btree ("fecha_devolucion");