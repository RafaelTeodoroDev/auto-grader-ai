import { z } from 'zod';
import codeSearchService from '../services/code-search-service';
import { generateObject } from 'ai';
import { openRouter } from '../configs/open-router';
import { helpDeskProject } from '../services/mocks/project';

/**
 * Tool para verificar requisitos funcionais no código
 * Usa busca semântica híbrida para encontrar implementações relevantes
 */

const checkFunctionalRequirementsParameters = z.object({
  requirements: z
    .array(z.string())
    .optional()
    .describe('Lista específica de IDs de requisitos para verificar (ex: ["1", "5", "10"])'),
  includeEvidence: z
    .boolean()
    .optional()
    .default(true)
    .describe('Se deve incluir evidências de código na resposta'),
  filesMap: z
    .record(z.string(), z.string())
    .optional()
    .describe('Mapa de arquivos do repositório (nome -> conteúdo). Se fornecido, usa estes dados em vez de buscar no banco'),
  searchDepth: z
    .number()
    .optional()
    .default(10)
    .describe('Número de chunks relevantes a buscar por categoria na busca semântica')
});

export const checkFunctionalRequirements: any = {
  description: 'Analisa se os requisitos funcionais do projeto estão implementados no código. Usa busca semântica híbrida para encontrar implementações relevantes.',
  parameters: checkFunctionalRequirementsParameters,
  execute: async (params: any) => {
    console.log(`\n🔍 Iniciando análise de requisitos funcionais...\n`);

    // ETAPA 1: Parse dos requisitos funcionais do projeto
    const functionalRequirementsText = helpDeskProject.instruction_detail.functional_requirements;

    // Extrair categorias do texto (manualmente estruturadas baseadas no formato conhecido)
    const categories = [
      {
        title: "Autenticação e Usuários",
        requirements: [
          "O sistema deve permitir o cadastro de clientes com username e senha",
          "O sistema deve permitir o cadastro de entregadores (deliveryman) com username e senha",
          "O sistema deve autenticar clientes através de username e senha",
          "O sistema deve autenticar entregadores através de username e senha",
          "O sistema deve utilizar a biblioteca argon2 para hash de senhas"
        ],
        keywords: ["autenticação", "cadastro", "login", "jwt", "token", "cliente", "entregador", "deliveryman", "username", "senha", "password", "auth", "register", "signup"]
      },
      {
        title: "Gestão de Entregas",
        requirements: [
          "Clientes devem poder criar novas entregas especificando o nome do item",
          "Clientes devem poder visualizar suas próprias entregas",
          "Entregadores devem poder visualizar entregas disponíveis",
          "Entregadores devem poder aceitar entregas disponíveis",
          "Entregadores devem poder visualizar suas entregas aceitas",
          "Entregadores devem poder marcar entregas como concluídas",
          "O sistema deve registrar data/hora de criação das entregas",
          "O sistema deve registrar uma foto do momento da entrega"
        ],
        keywords: ["entrega", "delivery", "criar", "visualizar", "aceitar", "concluir", "finalizar", "item", "data", "hora", "timestamp", "create", "list", "accept", "complete", "finish"]
      },
      {
        title: "Regras de Negócio",
        requirements: [
          "Não deve permitir cadastro de usernames duplicados para clientes",
          "Não deve permitir cadastro de usernames duplicados para entregadores",
          "Senhas devem ser armazenadas criptografadas",
          "Apenas entregadores autenticados podem visualizar entregas disponíveis",
          "Apenas clientes autenticados podem criar entregas",
          "Entregadores devem poder serem avaliados pelos clientes",
          "Mostrar localização do entregador em tempo real para o cliente"
        ],
        keywords: ["validação", "regra", "duplicado", "unique", "criptografia", "hash", "bcrypt", "autenticado", "authenticated", "middleware", "guard", "permission", "authorization"]
      },
      {
        title: "Notificações",
        requirements: [
          "O sistema deve enviar notificações via Kafka quando novos entregadores são cadastrados"
        ],
        keywords: ["notificação", "notification", "kafka", "mensagem", "message", "evento", "event", "queue", "fila"]
      },
      {
        title: "Validações e Tratamento de Erros",
        requirements: [
          "O sistema deve validar dados de entrada",
          "O sistema deve retornar mensagens de erro apropriadas",
          "O sistema deve tratar erros assíncronos"
        ],
        keywords: ["validação", "validation", "erro", "error", "try", "catch", "throw", "exception", "zod", "joi", "async", "await"]
      }
    ];

    console.log(`📋 Total de categorias: ${categories.length}`);
    console.log(`📋 Total de requisitos: ${categories.reduce((sum, cat) => sum + cat.requirements.length, 0)}\n`);

    // ETAPA 2: Busca Híbrida por Categoria (Opção C)
    let contextByCategory: any[] = [];

    if (params.filesMap && Object.keys(params.filesMap).length > 0) {
      console.log(`📦 Usando filesMap fornecido (${Object.keys(params.filesMap).length} arquivos)\n`);

      // Se filesMap foi fornecido, usar busca semântica nos arquivos fornecidos
      for (const category of categories) {
        const searchQuery = `${category.title} ${category.keywords.join(' ')}`;

        console.log(`🔎 Buscando arquivos relevantes para: ${category.title}`);

        try {
          // Buscar chunks similares usando busca semântica
          const relevantChunks = await codeSearchService.searchSimilarCode(
            searchQuery,
            params.searchDepth || 10
          );

          // Coletar nomes de arquivos únicos
          const relevantFileNames = [...new Set(relevantChunks.map(c => c.filename))];

          console.log(`  ✓ Encontrados ${relevantFileNames.length} arquivos relevantes\n`);

          // Pegar conteúdo completo dos arquivos relevantes do filesMap
          const relevantFilesContent: Record<string, string> = {};
          for (const filename of relevantFileNames) {
            if (params.filesMap[filename]) {
              relevantFilesContent[filename] = params.filesMap[filename];
            }
          }

          // Se não encontrou nenhum arquivo relevante na busca semântica, pegar todos os arquivos
          const finalFilesContent = Object.keys(relevantFilesContent).length > 0
            ? relevantFilesContent
            : params.filesMap;

          contextByCategory.push({
            category: category.title,
            requirements: category.requirements,
            relevantFiles: Object.keys(finalFilesContent),
            codeContext: finalFilesContent
          });
        } catch (error) {
          console.log(`  ⚠️ Erro na busca semântica para ${category.title}, usando todos os arquivos\n`);
          // Fallback: usar todos os arquivos
          contextByCategory.push({
            category: category.title,
            requirements: category.requirements,
            relevantFiles: Object.keys(params.filesMap),
            codeContext: params.filesMap
          });
        }
      }
    } else {
      console.log(`💾 Buscando código do banco de dados...\n`);

      // Fallback: buscar do banco de dados com busca semântica
      for (const category of categories) {
        const searchQuery = `${category.title} ${category.keywords.join(' ')}`;

        console.log(`🔎 Buscando no banco: ${category.title}`);

        try {
          const relevantChunks = await codeSearchService.searchSimilarCode(
            searchQuery,
            params.searchDepth || 10
          );

          if (relevantChunks.length === 0) {
            console.log(`  ⚠️ Nenhum chunk encontrado para ${category.title}\n`);
            continue;
          }

          console.log(`  ✓ Encontrados ${relevantChunks.length} chunks relevantes\n`);

          // Agrupar por arquivo
          const fileMap = new Map<string, string>();
          for (const chunk of relevantChunks) {
            if (!fileMap.has(chunk.filename)) {
              fileMap.set(chunk.filename, '');
            }
            fileMap.set(
              chunk.filename,
              fileMap.get(chunk.filename) + `\n[Linhas ${chunk.lineStart}-${chunk.lineEnd}]\n${chunk.content}\n`
            );
          }

          const relevantFilesContent: Record<string, string> = Object.fromEntries(fileMap);

          contextByCategory.push({
            category: category.title,
            requirements: category.requirements,
            relevantFiles: Array.from(fileMap.keys()),
            codeContext: relevantFilesContent
          });
        } catch (error) {
          console.log(`  ⚠️ Erro na busca para ${category.title}: ${error}\n`);
        }
      }

      if (contextByCategory.length === 0) {
        return {
          response: 'ERRO: Nenhum código foi encontrado no banco de dados. Execute o embed do codebase primeiro ou forneça filesMap.',
          totalRequirements: categories.reduce((sum, cat) => sum + cat.requirements.length, 0),
          filesAnalyzed: 0,
        };
      }
    }

    // ETAPA 3: Preparar contexto formatado para a IA
    const formattedContext = contextByCategory.map((ctx, idx) => {
      const filesContent = Object.entries(ctx.codeContext)
        .map(([filename, content]) => {
          return `#### Arquivo: ${filename}\n\`\`\`\n${content}\n\`\`\``;
        })
        .join('\n\n');

      return `### CATEGORIA ${idx + 1}: ${ctx.category}

**Requisitos desta categoria:**
${ctx.requirements.map((req: string, i: number) => `${i + 1}. ${req}`).join('\n')}

**Arquivos relevantes encontrados:** ${ctx.relevantFiles.join(', ')}

**Código relevante:**
${filesContent}

---
`;
    }).join('\n\n');

    // ETAPA 4: Análise com IA usando generateObject
    const analysisPrompt = `Você é um especialista em análise de requisitos funcionais e implementação de software.

**CONTEXTO DO PROJETO:**
${helpDeskProject.description}

**REQUISITOS FUNCIONAIS COMPLETOS:**
${functionalRequirementsText}

---

**SUA TAREFA:**

Você receberá código relevante organizado por categoria de requisitos funcionais.

Para CADA UMA DAS 5 CATEGORIAS abaixo, analise se os requisitos estão implementados:

1. **Autenticação e Usuários** (5 requisitos)
2. **Gestão de Entregas** (8 requisitos)
3. **Regras de Negócio** (7 requisitos)
4. **Notificações** (1 requisito)
5. **Validações e Tratamento de Erros** (3 requisitos)

---

**PROCESSO DE ANÁLISE:**

Para cada categoria:
1. Analise TODOS os requisitos listados na categoria
2. Verifique no código fornecido se cada requisito está implementado
3. Calcule o percentual de implementação: (requisitos implementados / total de requisitos) × 100
4. Identifique evidências específicas (arquivo:linha) que comprovam a implementação
5. Liste requisitos que faltam ou estão parcialmente implementados
6. Sugira recomendações práticas

---

**CRITÉRIOS DE STATUS:**
- **IMPLEMENTADO**: ≥ 95% dos requisitos da categoria implementados
- **PARCIAL**: 50-94% dos requisitos implementados
- **NÃO IMPLEMENTADO**: < 50% dos requisitos implementados

---

**FORMATO DE RESPOSTA OBRIGATÓRIO:**

<critical_json_formatting_rules>
- You MUST return ONLY valid JSON that can be parsed without errors
- All string values MUST be properly escaped (use \\" for quotes inside JSON strings)
- ALL special characters MUST follow strict JSON escaping rules
- Do NOT truncate the response — include ALL 5 categories
- The final JSON MUST be complete, well-formed, and syntactically valid
</critical_json_formatting_rules>

Você DEVE retornar EXATAMENTE 5 categorias no array "categories".

Exemplo de estrutura (você deve preencher com TODAS as 5 categorias):

{
  "categories": [
    {
      "title": "Autenticação e Usuários",
      "score": 80,
      "status": "IMPLEMENTADO",
      "implementedRequirements": [
        "Cadastro de clientes com username e senha",
        "Cadastro de entregadores com username e senha",
        "Autenticação de clientes",
        "Autenticação de entregadores"
      ],
      "missingRequirements": [
        "Geração de tokens JWT não encontrada ou sem expiração adequada"
      ],
      "keyEvidences": [
        "src/modules/account/authenticateClient/AuthenticateClientController.ts:15-30 - Autenticação de clientes implementada",
        "src/modules/account/authenticateDeliveryman/AuthenticateDeliverymanController.ts:15-30 - Autenticação de entregadores",
        "src/modules/account/createClient/CreateClientController.ts:20-45 - Cadastro de clientes"
      ],
      "recommendations": [
        "Implementar expiração de tokens JWT com configuração adequada",
        "Adicionar refresh token para melhor segurança"
      ]
    },
    {
      "title": "Gestão de Entregas",
      ... análise da segunda categoria ...
    },
    {
      "title": "Regras de Negócio",
      ... análise da terceira categoria ...
    },
    {
      "title": "Notificações",
      ... análise da quarta categoria ...
    },
    {
      "title": "Validações e Tratamento de Erros",
      ... análise da quinta categoria ...
    }
  ]
}

---

**REGRAS IMPORTANTES:**
1. SEMPRE retorne EXATAMENTE 5 objetos no array "categories"
2. O score deve refletir o percentual real de implementação dos requisitos
3. Seja específico nas evidências - cite arquivos e linhas exatas
4. Liste claramente quais requisitos estão implementados e quais faltam
5. Recomendações devem ser práticas e acionáveis
6. Analise TODO o código fornecido antes de concluir

Comece a análise agora:`;

    console.log(`🤖 Gerando análise detalhada de requisitos funcionais com IA...\n`);

    let analysis = null;
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
            content: `## CÓDIGO RELEVANTE POR CATEGORIA:\n\n${formattedContext}`
          }
        ],
        schema: z.object({
          categories: z.array(z.object({
            title: z.string(),
            score: z.number().min(0).max(100),
            status: z.enum(['IMPLEMENTADO', 'PARCIAL', 'NÃO IMPLEMENTADO']),
            implementedRequirements: z.array(z.string()),
            missingRequirements: z.array(z.string()),
            keyEvidences: z.array(z.string()),
            recommendations: z.array(z.string()),
          })).min(5).max(5).describe('Deve conter exatamente 5 categorias: Autenticação e Usuários, Gestão de Entregas, Regras de Negócio, Notificações, e Validações e Tratamento de Erros')
        })
      });
    } catch (error) {
      console.error('❌ Erro ao gerar análise de requisitos funcionais:', error);
      return {
        response: 'ERRO: Falha ao gerar análise de requisitos funcionais. ' + (error instanceof Error ? error.message : 'Erro desconhecido.'),
        totalRequirements: categories.reduce((sum, cat) => sum + cat.requirements.length, 0),
        filesAnalyzed: contextByCategory.length,
      };
    }

    console.log(`✅ Análise de requisitos funcionais concluída!\n`);

    const totalFiles = [...new Set(contextByCategory.flatMap(ctx => ctx.relevantFiles))].length;

    return {
      response: analysis.object.categories,
      totalRequirements: categories.reduce((sum, cat) => sum + cat.requirements.length, 0),
      filesAnalyzed: totalFiles,
    };
  },
};
