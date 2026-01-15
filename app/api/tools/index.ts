import { z } from 'zod';
import codeSearchService from '../services/code-search-service';
import { generateObject, generateText } from 'ai';
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

    **INSTRUÇÕES IMPORTANTES:**

    Os requisitos de boas práticas estão organizados em 5 CATEGORIAS principais:
    1. **Qualidade de Código** (7 subtópicos)
    2. **Organização e Estrutura** (4 subtópicos)
    3. **Documentação e Legibilidade** (4 subtópicos)
    4. **Testes** (3 subtópicos)
    5. **Segurança** (5 subtópicos)

    **PROCESSO DE ANÁLISE:**

    Você irá receber o código completo do repositório através das mensagens do usuário.

    ⚠️ CRÍTICO: Você DEVE analisar e retornar TODAS AS 5 CATEGORIAS listadas acima.

    Para CADA UMA DAS 5 CATEGORIAS, você deve:
    1. Analisar internamente TODOS os subtópicos da categoria
    2. Atribuir mentalmente um score (0-100) para cada subtópico
    3. Calcular a MÉDIA desses scores
    4. Retornar o resultado consolidado da categoria

    ---

    **FORMATO DE RESPOSTA OBRIGATÓRIO:**

    <critical_json_formatting_rules>
    - You MUST return ONLY valid JSON that can be parsed without errors.
    - All string values MUST be properly escaped (use \\" for quotes inside JSON strings).
    - ALL special characters MUST follow strict JSON escaping rules.
    - Do NOT truncate the response — include ALL 5 categories.
    - The final JSON MUST be complete, well-formed, and syntactically valid.
    </critical_json_formatting_rules> 

    ⚠️ IMPORTANTE: O exemplo abaixo mostra APENAS UMA categoria para ilustrar o formato. 
    Você DEVE retornar TODAS AS 5 CATEGORIAS no array "categories":

    1. Qualidade de Código
    2. Organização e Estrutura
    3. Documentação e Legibilidade
    4. Testes
    5. Segurança

    Exemplo de estrutura (você deve preencher com TODAS as 5 categorias):
    
    {
      "categories": [
        {
          "title": "Qualidade de Código",
          "score": 85,
          "status": "CONFORME",
          "keyEvidences": [
            "src/database/prismaClient.ts:3 - Uso consistente de const/let em todo o código",
            "src/database/repositories/interfaces/IClientRepository.ts - Interfaces bem definidas"
          ],
          "mainProblems": [
            "src/modules/account/authenticateClient/AuthenticateClientUseCase.ts:13-35 - Violação do Single Responsibility Principle",
            "Nenhum uso do Zod para validação encontrado no código"
          ],
          "recommendations": [
            "Implementar Zod para validação de inputs em todos os endpoints",
            "Separar responsabilidades nos UseCases, extraindo geração de token para serviço específico"
          ]
        },
        {
          "title": "Organização e Estrutura",
          ... análise da segunda categoria ...
        },
        {
          "title": "Documentação e Legibilidade",
          ... análise da terceira categoria ...
        },
        {
          "title": "Testes",
          ... análise da quarta categoria ...
        },
        {
          "title": "Segurança",
          ... análise da quinta categoria ...
        }
      ]
    }

    ---

    **REGRAS IMPORTANTES:**
    1. SEMPRE retorne EXATAMENTE 5 objetos no array "categories" (um para cada categoria listada)
    2. NÃO mostre scores individuais de subtópicos - apenas o score final da categoria
    3. O score da categoria deve ser a média aritmética de todos os subtópicos analisados
    4. Status: CONFORME (score >= 80), PARCIAL (50-79), NÃO CONFORME (< 50)
    5. Cite sempre arquivos e linhas específicas nas evidências e problemas
    6. Seja conciso - foque nos pontos mais relevantes
    7. O exemplo acima é apenas ilustrativo - você DEVE analisar TODAS as 5 categorias

    Comece a análise agora:`;

    console.log(`\n🤖 Gerando análise detalhada com IA...\n`);

    let analysis = null
    try {
      analysis = await generateObject({
        model: openRouter('anthropic/claude-3.5-sonnet'),
        system: analysisPrompt,
        maxOutputTokens: 16000,
        temperature: 0.5,
        output: 'object',
        messages: [
          {
            role: 'user',
            content: `## CÓDIGO COMPLETO DO REPOSITÓRIO: ${codeContext}`
          }
        ],
        schema: z.object({
          categories: z.array(z.object({
            title: z.string(),
            score: z.number().min(0).max(100),
            status: z.enum(['CONFORME', 'PARCIAL', 'NÃO CONFORME']),
            keyEvidences: z.array(z.string()),
            mainProblems: z.array(z.string()),
            recommendations: z.array(z.string()),
          })).min(5).max(5).describe('Deve conter exatamente 5 categorias: Qualidade de Código, Organização e Estrutura, Documentação e Legibilidade, Testes, e Segurança')
        })
      });
    } catch (error) {
      console.error('Erro ao gerar análise de boas práticas:', error);
      return {
        analysis: 'ERRO: Falha ao gerar análise de boas práticas. ' + (error instanceof Error ? error.message : 'Erro desconhecido.'),
        totalChunks,
        filesAnalyzed: Object.keys(codeByFile).length,
      };
    }

    console.log(`✅ Análise concluída!\n`);

    return {
      response: analysis.object.categories,
      totalChunks,
      filesAnalyzed: Object.keys(codeByFile).length,
    };
  },
};

// Exportar apenas a tool de best practices
export const tools = {
  checkBestPractices,
};