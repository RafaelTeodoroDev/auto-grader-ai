import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import 'dotenv/config';

// Configuração da conexão
const connectionString = process.env.DATABASE_URL ||
  `postgres://${process.env.DATABASE_USER || 'postgres'}:${process.env.DATABASE_PASSWORD || 'postgres'}@${process.env.DATABASE_HOST || 'localhost'}:${process.env.DATABASE_PORT || '5432'}/${process.env.DATABASE_NAME || 'meu_app_ai'}`;

// Cliente postgres
const client = postgres(connectionString, {
  max: 10, // Máximo de conexões no pool
  idle_timeout: 20,
  connect_timeout: 10,
});

// Instância do Drizzle
export const db = drizzle(client, { schema });

// Exportar o tipo do db para usar em outros lugares
export type Database = typeof db;
