import { embed } from 'ai';
import { db } from '@/app/api/db';
import { codeEmbeddings } from '@/app/api/db/schema';
import { openRouter } from '../configs/open-router';

interface FileData {
  filename: string;
  content: string;
}

interface ChunkData {
  filename: string;
  content: string;
  chunkIndex: number;
  lineStart: number;
  lineEnd: number;
}

class EmbeddingService {
  private readonly CHUNK_SIZE = 20; // 20 linhas por chunk
  private readonly EMBEDDING_MODEL = 'text-embedding-3-small';

  /**
   * Divide o conteúdo de um arquivo em chunks de N linhas
   */
  private chunkFileContent(filename: string, content: string): ChunkData[] {
    const lines = content.split('\n');
    const chunks: ChunkData[] = [];

    for (let i = 0; i < lines.length; i += this.CHUNK_SIZE) {
      const chunkLines = lines.slice(i, i + this.CHUNK_SIZE);
      const chunkContent = chunkLines.join('\n');

      chunks.push({
        filename,
        content: chunkContent,
        chunkIndex: Math.floor(i / this.CHUNK_SIZE),
        lineStart: i + 1, // Linhas começam em 1
        lineEnd: Math.min(i + this.CHUNK_SIZE, lines.length),
      });
    }

    return chunks;
  }
  /**
   * Gera embedding para um chunk de texto
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: openRouter.textEmbeddingModel(this.EMBEDDING_MODEL),
      value: text,
    });


    return embedding;
  }

  /**
   * Processa um arquivo: divide em chunks, gera embeddings e salva no banco
   */
  async embedFile(filename: string, content: string): Promise<number> {
    const chunks = this.chunkFileContent(filename, content);
    let embeddedCount = 0;

    console.log(`📄 Processando ${filename}: ${chunks.length} chunks`);

    for (const chunk of chunks) {
      try {
        const embedding = await this.generateEmbedding(chunk.content);

        await db.insert(codeEmbeddings).values({
          filename: chunk.filename,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          lineStart: chunk.lineStart,
          lineEnd: chunk.lineEnd,
          embedding: embedding,
        });

        embeddedCount++;
        console.log(
          `  ✓ Chunk ${chunk.chunkIndex + 1}/${chunks.length} (linhas ${chunk.lineStart}-${chunk.lineEnd})`
        );
      } catch (error) {
        console.error(
          `  ✗ Erro no chunk ${chunk.chunkIndex}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        );
      }
    }

    return embeddedCount;
  }

  /**
   * Processa múltiplos arquivos
   */
  async embedFiles(files: FileData[]): Promise<{
    total: number;
    success: number;
    failed: number;
  }> {
    console.log(`\n🚀 Iniciando embedding de ${files.length} arquivos...\n`);

    let success = 0;
    let failed = 0;

    for (const file of files) {
      try {
        const chunksEmbedded = await this.embedFile(
          file.filename,
          file.content
        );
        if (chunksEmbedded > 0) {
          success++;
        }
      } catch (error) {
        console.error(
          `❌ Erro ao processar ${file.filename}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        );
        failed++;
      }
    }

    console.log(`\n✅ Processo concluído!`);
    console.log(`  Total de arquivos: ${files.length}`);
    console.log(`  Sucesso: ${success}`);
    console.log(`  Falhas: ${failed}\n`);

    return { total: files.length, success, failed };
  }

  /**
   * Limpa todos os embeddings do banco (útil para reprocessar)
   */
  async clearAllEmbeddings(): Promise<number> {
    await db.delete(codeEmbeddings);
    return 0; // Drizzle não retorna count no delete
  }
}

export default new EmbeddingService();
