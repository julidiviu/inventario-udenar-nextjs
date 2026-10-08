CREATE TABLE "cierre_semestre" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"fecha" date NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
