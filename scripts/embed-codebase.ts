#!/usr/bin/env node

/**
 * Script CLI para gerar embeddings do codebase
 * Uso: yarn embed:codebase
 */

import codebaseService from '../app/api/services/codebase-service';
import embeddingService from '../app/api/services/embedding-service';

async function main() {
  console.log('🔍 Buscando dados do repositório...\n');

  try {
    // Buscar dados do repositório
    const repoData = await codebaseService.getRepositoryData();

    if (!repoData) {
      console.error('❌ Falha ao buscar dados do repositório');
      process.exit(1);
    }

    const { filesMap } = repoData;
    const files = Object.entries(filesMap).map(([filename, content]) => ({
      filename,
      content: content as string,
    }));

    console.log(`📦 ${files.length} arquivos encontrados\n`);

    // Limpar embeddings anteriores (opcional - comentar se quiser manter histórico)
    const deleted = await embeddingService.clearAllEmbeddings();
    if (deleted > 0) {
      console.log(`🗑️  ${deleted} embeddings anteriores removidos\n`);
    }

    // Gerar embeddings
    const result = await embeddingService.embedFiles(files);

    // Resultado final
    if (result.failed === 0) {
      console.log('🎉 Todos os arquivos foram processados com sucesso!');
      process.exit(0);
    } else {
      console.log(`⚠️  Processo concluído com ${result.failed} falhas`);
      process.exit(1);
    }
  } catch (error) {
    console.error(
      '\n❌ Erro durante o processo:',
      error instanceof Error ? error.message : error
    );
    console.error('\nStack trace:', error);
    process.exit(1);
  }
}

main();
