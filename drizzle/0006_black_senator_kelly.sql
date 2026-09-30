ALTER TABLE "dependencias" DROP CONSTRAINT "dependencias_codigo_unique";--> statement-breakpoint
ALTER TABLE "dependencias" DROP CONSTRAINT "dependencias_nombre_unique";--> statement-breakpoint
ALTER TABLE "dependencias" DROP CONSTRAINT "dependencias_administrador_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "dependencias_codigo_activas_uniq" ON "dependencias" USING btree ("codigo") WHERE "dependencias"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "dependencias_nombre_activas_uniq" ON "dependencias" USING btree ("nombre") WHERE "dependencias"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "dependencias_admin_activas_uniq" ON "dependencias" USING btree ("administrador_id") WHERE "dependencias"."deleted_at" IS NULL;