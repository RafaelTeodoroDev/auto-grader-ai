import { generateText } from 'ai';
import { openRouter } from '../configs/open-router';

interface AgentOptions {
  systemPrompt?: string;
  model?: string;
  temperature?: number;
}

class AIAgentService {
  private readonly DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';
  private readonly DEFAULT_SYSTEM_PROMPT = `Você é um assistente de IA especializado em análise de código.
Seu objetivo é ajudar desenvolvedores a entender e trabalhar com repositórios de código.
Seja conciso, objetivo e técnico nas suas respostas.`;

  /**
   * Gera uma resposta do agente baseado em uma query
   */
  async chat(
    userMessage: string,
    options: AgentOptions = {}
  ): Promise<{ response: string; usage?: any }> {
    const {
      systemPrompt = this.DEFAULT_SYSTEM_PROMPT,
      model = this.DEFAULT_MODEL,
      temperature = 0.7,
    } = options;

    try {
      const result = await generateText({
        model: openRouter(model),
        system: systemPrompt,
        prompt: userMessage,
        temperature,
      });

      return {
        response: result.text,
        usage: result.usage,
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw new Error(
        `Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gera uma resposta com contexto de código
   */
  async chatWithCodeContext(
    userMessage: string,
    codeContext: string,
    options: AgentOptions = {}
  ): Promise<{ response: string; usage?: any }> {
    const enhancedPrompt = `Contexto do código:
\`\`\`
${codeContext}
\`\`\`

Pergunta do usuário: ${userMessage}`;

    return this.chat(enhancedPrompt, {
      ...options,
      systemPrompt:
        options.systemPrompt ||
        `${this.DEFAULT_SYSTEM_PROMPT}

Você tem acesso ao código acima. Use-o para responder as perguntas do usuário de forma precisa.`,
    });
  }

  /**
   * Analisa um repositório e fornece insights
   */
  async analyzeRepository(
    repositoryData: { directoryStructure: string; filesMap: Record<string, string> },
    question?: string
  ): Promise<{ response: string; usage?: any }> {
    const filesList = Object.keys(repositoryData.filesMap).join('\n- ');
    const sampleFiles = Object.entries(repositoryData.filesMap)
      .slice(0, 5)
      .map(([name, content]) => `### ${name}\n\`\`\`\n${content.slice(0, 500)}...\n\`\`\``)
      .join('\n\n');

    const prompt = question
      ? `Analisando o repositório. Estrutura:
        ${repositoryData.directoryStructure}

        Arquivos disponíveis:
        - ${filesList}

        Amostra de alguns arquivos:
        ${sampleFiles}

        Pergunta: ${question}`
      : `Analisando o repositório. Estrutura:
        ${repositoryData.directoryStructure}

        Arquivos disponíveis:
        - ${filesList}

        Amostra de alguns arquivos:
        ${sampleFiles}

        Forneça uma análise geral do repositório: tecnologias usadas, estrutura, propósito aparente.`;

    return this.chat(prompt, {
      systemPrompt: `Você é um especialista em análise de repositórios de código.
Analise a estrutura, identifique padrões, tecnologias e forneça insights úteis.`,
      temperature: 0.5,
    });
  }
}

export default new AIAgentService();
