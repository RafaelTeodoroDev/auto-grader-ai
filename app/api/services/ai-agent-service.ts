import { generateText } from 'ai';
import { openRouter } from '../configs/open-router';
import { checkBestPractices } from '../tools';

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
1. Você DEVE SEMPRE chamar a tool checkBestPractices quando houver requisitos de boas práticas
2. Não tente analisar boas práticas manualmente - SEMPRE use a tool checkBestPractices
3. A tool checkBestPractices irá buscar o código completo e analisar automaticamente
4. Após receber o resultado da tool, você DEVE retornar EXATAMENTE o conteúdo do campo "analysis" que a tool retornou, SEM modificações, resumos ou comentários adicionais
5. NÃO adicione introduções como "Aqui está a análise" - apenas retorne o conteúdo puro da análise

NUNCA pule a chamada da tool checkBestPractices quando houver requisitos de qualidade/boas práticas.
SEMPRE retorne o conteúdo completo do campo "analysis" recebido da tool.`;

  /**
   * Analisa um repositório e fornece insights
   * Agora com suporte automático a tools para análise de boas práticas
   */
  async analyzeRepository(
    repositoryData: { directoryStructure: string; filesMap: Record<string, string> },
    question?: string
  ): Promise<{ response: string; usage?: any; toolCalls?: any[] }> {
    const userMessage = question || `Analise este repositório e verifique se todos os requisitos de boas práticas foram atendidos.
    Execute a tool checkBestPractices e retorne APENAS o conteúdo do campo "analysis" que ela retornar, sem nenhuma modificação ou texto adicional.`;

    // Criar uma versão modificada da tool que inclui o filesMap
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

    const generateConfig: any = {
      model: openRouter(this.DEFAULT_MODEL),
      system: this.DEFAULT_SYSTEM_PROMPT,
      prompt: userMessage,
      temperature: 0.5,
      tools: {
        checkBestPractices: checkBestPracticesWithData,
      },
      maxSteps: 5,
    };

    const result = await generateText(generateConfig);
    console.log(result.toolResults, 'toolResults');
    console.log(result.toolResults.map((tr: any) => tr.output.response).join('\n'), 'toolResults values');
    return {
      response: result.toolResults.length > 0
        ? result.toolResults.map((tr: any) => tr.output.response).join('\n')
        : result.text,
      usage: result.usage,
      toolCalls: result.toolCalls,
    };
  }
}

export default new AIAgentService();