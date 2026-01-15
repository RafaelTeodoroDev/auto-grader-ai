import { z } from 'zod';
import codeSearchService from '../services/code-search-service';
import { generateText } from 'ai';
import { openRouter } from '../configs/open-router';
import { helpDeskProject } from '../services/mocks/project';

/**
 * Tool para verificar boas práticas no código
 * A IA irá chamar automaticamente quando detectar que o requisito é sobre boas práticas
 */

const checkBestPracticesParameters = z.object({
  practices: z
    .array(z.string())
    .optional()
    .describe('Lista específica de boas práticas para verificar. Se não fornecido, usa práticas padrão'),
  includeExamples: z
    .boolean()
    .optional()
    .default(true)
    .describe('Se deve incluir exemplos de código na resposta'),
  filesMap: z
    .record(z.string(), z.string())
    .optional()
    .describe('Mapa de arquivos do repositório (nome -> conteúdo). Se fornecido, usa estes dados em vez de buscar no banco'),
});

export const checkBestPractices: any = {
  description: 'Analisa o código do repositório em relação às boas práticas definidas no projeto. Usa o código fornecido via filesMap ou busca no banco de dados.',
  parameters: checkBestPracticesParameters,
  execute: async (params: any) => {
    let codeByFile: Record<string, Array<{ lineStart: number; lineEnd: number; content: string }>>;
    let totalChunks = 0;

    // Se filesMap foi fornecido, usar ele diretamente
    if (params.filesMap && Object.keys(params.filesMap).length > 0) {
      codeByFile = Object.entries(params.filesMap).reduce((acc, [filename, content]) => {
        const lines = (content as string).split('\n');
        acc[filename] = [{
          lineStart: 1,
          lineEnd: lines.length,
          content: content as string,
        }];
        return acc;
      }, {} as Record<string, Array<{ lineStart: number; lineEnd: number; content: string }>>);

      totalChunks = Object.keys(codeByFile).length;
    } else {
      // Fallback: buscar do banco de dados

      const allCode = await codeSearchService.getAllCode(200); // Busca até 200 chunks

      if (allCode.length === 0) {
        return {
          analysis: 'ERRO: Nenhum código foi encontrado no banco de dados. Execute `yarn embed:codebase` primeiro para popular os embeddings.',
        };
      }

      totalChunks = allCode.length;

      // Agrupar código por arquivo
      codeByFile = allCode.reduce((acc, chunk) => {
        if (!acc[chunk.filename]) {
          acc[chunk.filename] = [];
        }
        acc[chunk.filename].push({
          lineStart: chunk.lineStart,
          lineEnd: chunk.lineEnd,
          content: chunk.content,
        });
        return acc;
      }, {} as Record<string, Array<{ lineStart: number; lineEnd: number; content: string }>>);
    }

    // Criar contexto com todo o código
    const codeContext = Object.entries(codeByFile)
      .map(([filename, chunks]) => {
        const sortedChunks = chunks.sort((a, b) => a.lineStart - b.lineStart);
        const fileContent = sortedChunks
          .map(chunk => `  [Linhas ${chunk.lineStart}-${chunk.lineEnd}]\n${chunk.content}`)
          .join('\n\n');
        return `### ${filename}\n${fileContent}`;
      })
      .join('\n\n---\n\n');

    // Analisar com IA
    const analysisPrompt = `Você é um especialista em qualidade de código. Analise o código completo do repositório quanto às seguintes boas práticas:

**Requisitos de Boas Práticas do Projeto:**
${helpDeskProject.instruction_detail.best_praticies}

---

## CÓDIGO COMPLETO DO REPOSITÓRIO:

${codeContext}

---

**INSTRUÇÕES IMPORTANTES:**

Os requisitos de boas práticas estão organizados em 5 CATEGORIAS principais:
1. **Qualidade de Código** (7 subtópicos)
2. **Organização e Estrutura** (4 subtópicos)
3. **Documentação e Legibilidade** (4 subtópicos)
4. **Testes** (3 subtópicos)
5. **Segurança** (5 subtópicos)

**PROCESSO DE ANÁLISE:**

Para cada categoria, você deve:
1. Analisar internamente TODOS os subtópicos da categoria
2. Atribuir mentalmente um score (0-100) para cada subtópico
3. Calcular a MÉDIA desses scores
4. Retornar APENAS o resultado consolidado da categoria

---

**FORMATO DE RESPOSTA OBRIGATÓRIO:**

# [Nome da Categoria]
**Score da Categoria: [0-100]** ← Este é o único score que deve aparecer (média de todos os subtópicos)

## Análise Consolidada:
- **Status Geral**: [✅ CONFORME / ⚠️ PARCIAL / ❌ NÃO CONFORME]
- **Principais Evidências**: 
  - [Arquivo:Linha] - [Exemplo de boa prática encontrada]
  - [Arquivo:Linha] - [Outro exemplo positivo]
- **Principais Problemas**: 
  - [Arquivo:Linha] - [Problema mais crítico encontrado]
  - [Arquivo:Linha] - [Outro problema relevante]
- **Recomendações Prioritárias**: 
  - [Ação específica mais importante]
  - [Segunda ação prioritária]
- **Resumo**: [Breve resumo (2-3 linhas) sobre o estado geral desta categoria no código analisado]

---

**EXEMPLO DE RESPOSTA ESPERADA:**

# Qualidade de Código
**Score da Categoria: 72**

## Análise Consolidada:
- **Status Geral**: ⚠️ PARCIAL
- **Principais Evidências**: 
  - src/database/prismaClient.ts:3 - Uso consistente de const/let em todo o código
  - src/database/repositories/interfaces/IClientRepository.ts - Interfaces bem definidas
- **Principais Problemas**: 
  - src/modules/account/authenticateClient/AuthenticateClientUseCase.ts:13-35 - Violação do Single Responsibility Principle
  - Nenhum uso do Zod para validação encontrado no código
- **Recomendações Prioritárias**: 
  - Implementar Zod para validação de inputs em todos os endpoints
  - Separar responsabilidades nos UseCases, extraindo geração de token para serviço específico
- **Resumo**: O código apresenta boas práticas em nomenclatura e uso de const/let, mas precisa melhorar na separação de responsabilidades, redução de duplicação e implementação de validação com Zod.

---

**REGRAS IMPORTANTES:**
1. NÃO mostre scores individuais de subtópicos - apenas o score final da categoria
2. O score da categoria deve ser a média aritmética de todos os subtópicos analisados
3. Cite sempre arquivos e linhas específicas nas evidências e problemas
4. Seja conciso - foque nos pontos mais relevantes
5. Mantenha o formato exato especificado acima
6. Ao final você terá APENAS 5 scores (um por categoria)

Comece a análise agora:`;

    console.log(`\n🤖 Gerando análise detalhada com IA...\n`);

    const analysis = await generateText({
      model: openRouter('anthropic/claude-3.5-sonnet'),
      prompt: analysisPrompt,
      temperature: 0.3,
    });

    console.log(analysis.text)

    console.log(`✅ Análise concluída!\n`);

    return {
      response: analysis.text,
      totalChunks,
      filesAnalyzed: Object.keys(codeByFile).length,
    };
  },
};

// Exportar apenas a tool de best practices
export const tools = {
  checkBestPractices,
};