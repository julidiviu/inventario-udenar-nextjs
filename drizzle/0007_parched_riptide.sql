ALTER TABLE "prestamos" DROP COLUMN "firmado_url";--> statement-breakpoint
ALTER TABLE "recursos" ADD CONSTRAINT "recursos_qr_check" CHECK ("recursos"."qr" ~ '^[0-9]{1,8}$');