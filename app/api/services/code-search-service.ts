import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '@/app/api/db';
import { codeEmbeddings } from '@/app/api/db/schema';
import { sql } from 'drizzle-orm';

/**
 * Serviço para buscar código similar usando embeddings
 */
class CodeSearchService {
  private readonly EMBEDDING_MODEL = 'text-embedding-3-small';

  /**
   * Busca os chunks de código mais similares a uma query
   * @param query - Texto da busca (ex: "função de autenticação", "como fazer upload de arquivo")
   * @param limit - Número máximo de resultados
   * @returns Array de chunks ordenados por similaridade
   */
  async searchSimilarCode(
    query: string,
    limit: number = 5
  ): Promise<
    Array<{
      filename: string;
      content: string;
      lineStart: number;
      lineEnd: number;
      similarity: number;
    }>
  > {
    // Gerar embedding da query
    const { embedding } = await embed({
      model: openai.embedding(this.EMBEDDING_MODEL),
      value: query,
    });

    // Buscar chunks mais similares usando operador de distância do pgvector
    // <-> é o operador de distância L2 (Euclidean)
    // Quanto menor a distância, maior a similaridade
    const results = await db.execute(sql`
      SELECT 
        filename,
        content,
        line_start as "lineStart",
        line_end as "lineEnd",
        1 - (embedding <-> ${JSON.stringify(embedding)}::vector) as similarity
      FROM code_embeddings
      ORDER BY embedding <-> ${JSON.stringify(embedding)}::vector
      LIMIT ${limit}
    `);

    return results as any;
  }

  /**
   * Busca código similar dentro de um arquivo específico
   */
  async searchInFile(
    filename: string,
    query: string,
    limit: number = 3
  ): Promise<
    Array<{
      content: string;
      lineStart: number;
      lineEnd: number;
      similarity: number;
    }>
  > {
    const { embedding } = await embed({
      model: openai.embedding(this.EMBEDDING_MODEL),
      value: query,
    });

    const results = await db.execute(sql`
      SELECT 
        content,
        line_start as "lineStart",
        line_end as "lineEnd",
        1 - (embedding <-> ${JSON.stringify(embedding)}::vector) as similarity
      FROM code_embeddings
      WHERE filename = ${filename}
      ORDER BY embedding <-> ${JSON.stringify(embedding)}::vector
      LIMIT ${limit}
    `);

    return results as any;
  }

  /**
   * Obtém contexto completo de um arquivo baseado em uma query
   * Retorna os chunks relevantes com contexto adicional
   */
  async getFileContext(
    query: string,
    topFiles: number = 3
  ): Promise<
    Array<{
      filename: string;
      relevantChunks: Array<{
        content: string;
        lineRange: string;
        similarity: number;
      }>;
    }>
  > {
    const similarChunks = await this.searchSimilarCode(query, topFiles * 3);

    // Agrupar por arquivo
    const fileMap = new Map<
      string,
      Array<{
        content: string;
        lineRange: string;
        similarity: number;
      }>
    >();

    for (const chunk of similarChunks) {
      if (!fileMap.has(chunk.filename)) {
        fileMap.set(chunk.filename, []);
      }

      fileMap.get(chunk.filename)!.push({
        content: chunk.content,
        lineRange: `${chunk.lineStart}-${chunk.lineEnd}`,
        similarity: chunk.similarity,
      });
    }

    // Converter para array e pegar top N arquivos
    const result = Array.from(fileMap.entries())
      .map(([filename, chunks]) => ({
        filename,
        relevantChunks: chunks.slice(0, topFiles),
      }))
      .slice(0, topFiles);

    return result;
  }
}

export default new CodeSearchService();
