import { pgTable, serial, text, timestamp, vector, integer } from 'drizzle-orm/pg-core';

// Tabela para embeddings de código do repositório
export const codeEmbeddings = pgTable('code_embeddings', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(), // Nome do arquivo
  content: text('content').notNull(), // Conteúdo do chunk
  chunkIndex: integer('chunk_index').notNull(), // Índice do chunk no arquivo
  lineStart: integer('line_start').notNull(), // Linha inicial do chunk
  lineEnd: integer('line_end').notNull(), // Linha final do chunk
  embedding: vector('embedding', { dimensions: 1536 }), // Embedding do OpenAI text-embedding-3-small
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type CodeEmbedding = typeof codeEmbeddings.$inferSelect;
export type NewCodeEmbedding = typeof codeEmbeddings.$inferInsert;
