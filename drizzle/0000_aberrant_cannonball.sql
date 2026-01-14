CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "code_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"line_start" integer NOT NULL,
	"line_end" integer NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL
);
