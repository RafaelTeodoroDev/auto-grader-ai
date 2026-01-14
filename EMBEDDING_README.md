# Sistema de Embedding de Codebase

Sistema completo para gerar embeddings de código usando OpenAI e pgvector.

## ⚡ Quick Start

```bash
# 1. Adicione sua OpenAI API key no .env
echo "OPENAI_API_KEY=sk-your-key" >> .env

# 2. Execute o embedding
yarn embed:codebase
```

## 📋 O que foi implementado

### 1. Schema do Banco de Dados
- Tabela `code_embeddings` com suporte a pgvector
- Campos: filename, content, chunk_index, line_start, line_end, embedding
- Embeddings com 1536 dimensões (OpenAI text-embedding-3-small)

### 2. Serviço de Embedding
- Divisão de arquivos em chunks de 20 linhas
- Geração de embeddings usando OpenAI
- Armazenamento no PostgreSQL com pgvector
- Rastreamento de linha inicial e final de cada chunk

### 3. Script CLI
- Busca automática de arquivos do repositório
- Processamento em lote com logs detalhados
- Limpeza de embeddings antigos antes de reprocessar

## 🚀 Como usar

### 1. Configure a API Key da OpenAI

```bash
# Edite o arquivo .env
OPENAI_API_KEY=sk-your-api-key-here
```

### 2. Execute o comando de embedding

```bash
yarn embed:codebase
```

## 📊 Output esperado

```
🔍 Buscando dados do repositório...

📦 45 arquivos encontrados

🗑️  0 embeddings anteriores removidos

🚀 Iniciando embedding de 45 arquivos...

📄 Processando src/index.ts: 5 chunks
  ✓ Chunk 1/5 (linhas 1-20)
  ✓ Chunk 2/5 (linhas 21-40)
  ...

✅ Processo concluído!
  Total de arquivos: 45
  Sucesso: 45
  Falhas: 0

🎉 Todos os arquivos foram processados com sucesso!
```

## 🔧 Comandos disponíveis

```bash
# Gerar embeddings
yarn embed:codebase

# Ver banco de dados visualmente
yarn db:studio

# Regenerar migration
yarn db:generate

# Aplicar migration
yarn db:push
```

## 📁 Estrutura criada

```
app/
  api/
    db/
      schema.ts         # Schema com tabela code_embeddings
      index.ts          # Conexão com banco
    services/
      embedding-service.ts  # Serviço de chunking e embedding
      codebase-service.ts   # Serviço de busca de código

scripts/
  embed-codebase.ts     # CLI para gerar embeddings

drizzle/
  0000_aberrant_cannonball.sql  # Migration do schema
```

## 🔍 Busca Semântica

O serviço `code-search-service.ts` permite buscar código por similaridade:

```typescript
import codeSearchService from '@/app/api/services/code-search-service';

// Buscar código similar
const results = await codeSearchService.searchSimilarCode(
  'função de autenticação de usuário',
  5
);

// Buscar dentro de um arquivo específico
const fileResults = await codeSearchService.searchInFile(
  'src/auth/login.ts',
  'validação de senha',
  3
);

// Obter contexto completo dos arquivos mais relevantes
const context = await codeSearchService.getFileContext(
  'como fazer upload de arquivos',
  3
);
```

## 💡 Próximos passos

1. ✅ ~~Implementar busca semântica por similaridade~~
2. Criar agente de IA para usar os embeddings
3. Adicionar requisitos e contexto ao agente
4. Criar tool calls para interação
