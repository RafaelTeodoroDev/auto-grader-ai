import { generateText } from 'ai';
import { openRouter } from '../configs/open-router';
import { checkBestPractices, checkFunctionalRequirements } from '../tools';

interface AgentOptions {
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  enableTools?: boolean;
}

class AIAgentService {
  private readonly DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';
  private readonly DEFAULT_SYSTEM_PROMPT = `Você é um assistente de IA especializado em análise de código e requisitos de projeto.

IMPORTANTE - REGRAS OBRIGATÓRIAS:

**Para Análise Completa de Repositório:**
1. Você DEVE SEMPRE chamar AMBAS as tools: checkBestPractices E checkFunctionalRequirements
2. Chame as duas tools em sequência para obter análise completa
3. Não tente analisar manualmente - SEMPRE use as tools

**Para Análise de Boas Práticas:**
- Use a tool checkBestPractices
- Ela irá analisar qualidade de código, organização, documentação, testes e segurança
- Retorne exatamente o resultado recebido da tool

**Para Análise de Requisitos Funcionais:**
- Use a tool checkFunctionalRequirements
- Ela irá verificar se os requisitos funcionais estão implementados no código
- Retorne exatamente o resultado recebido da tool

**Formato de Resposta:**
- Após receber os resultados das tools, retorne os dados SEM modificações
- NÃO adicione introduções, resumos ou comentários adicionais
- Apenas retorne o conteúdo estruturado das análises

NUNCA pule a chamada das tools quando houver análise de código/requisitos.
SEMPRE retorne o conteúdo completo recebido das tools.`;

  /**
   * Analisa um repositório e fornece insights
   * Suporta análise de boas práticas e requisitos funcionais
   */
  async analyzeRepository(
    repositoryData: { directoryStructure: string; filesMap: Record<string, string> },
    question?: string
  ): Promise<{ response: any; usage?: any; toolCalls?: any[] }> {
    const userMessage = question || `Analise este repositório completamente:
    
1. Execute a tool checkBestPractices para verificar boas práticas de código
2. Execute a tool checkFunctionalRequirements para verificar implementação de requisitos funcionais

Retorne os resultados de AMBAS as análises sem modificações.`;

    // Criar versões modificadas das tools que incluem o filesMap
    const checkBestPracticesWithData = {
      description: checkBestPractices.description,
      parameters: checkBestPractices.parameters,
      execute: async (params: any) => {
        return checkBestPractices.execute({
          ...params,
          filesMap: repositoryData.filesMap,
        });
      },
    };

    const checkFunctionalRequirementsWithData = {
      description: checkFunctionalRequirements.description,
      parameters: checkFunctionalRequirements.parameters,
      execute: async (params: any) => {
        return checkFunctionalRequirements.execute({
          ...params,
          filesMap: repositoryData.filesMap,
        });
      },
    };

    const generateConfig: any = {
      model: openRouter(this.DEFAULT_MODEL),
      system: this.DEFAULT_SYSTEM_PROMPT,
      prompt: userMessage,
      temperature: 0.5,
      toolChoice: 'required',
      tools: {
        checkBestPractices: checkBestPracticesWithData,
        checkFunctionalRequirements: checkFunctionalRequirementsWithData,
      },
      maxSteps: 10, // Aumentar para permitir chamadas de múltiplas tools
    };

    const result = await generateText(generateConfig);

    // Organizar os resultados por tipo de tool
    const bestPracticesResult = result.toolResults.find(
      (tr: any) => tr.toolName === 'checkBestPractices'
    );
    const functionalRequirementsResult = result.toolResults.find(
      (tr: any) => tr.toolName === 'checkFunctionalRequirements'
    );

    return {
      response: {
        bestPractices: bestPracticesResult?.output.response || null,
        functionalRequirements: functionalRequirementsResult?.output.response || null,
        text: result.text, // Manter texto da IA se houver
      },
      usage: result.usage,
      toolCalls: result.toolCalls,
    };
  }
}

export default new AIAgentService();