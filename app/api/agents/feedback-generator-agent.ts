import { generateText } from 'ai';
import { openRouter } from '../configs/open-router';
import { FeedbackContext, DomainFeedback, NextSteps } from '../services/feedback-context-builder';

/**
 * Service responsible for generating pedagogical, educational feedback in Markdown
 * based on structured JSON input from FeedbackContextBuilder.
 * 
 * This agent splits feedback generation into three parts:
 * 1. Overview Section (LLM) - General evaluation and high-level insights
 * 2. Domain Sections (Code) - Detailed domain breakdown with scores and items
 * 3. Next Steps Section (LLM) - Actionable items in infinitive verb form
 * 
 * This approach reduces token usage and improves reliability.
 */
class FeedbackGeneratorAgent {
  private readonly MODEL = 'google/gemini-2.5-flash-lite';
  private readonly MAX_OUTPUT_TOKENS = 8000;
  private readonly TEMPERATURE = 0.3;
  private readonly MAX_RETRIES = 3;
  /**
   * Generates pedagogical Markdown feedback from structured evaluation data.
   * 
   * Orchestrates three-part feedback generation:
   * 1. Overview Section (LLM) - General evaluation and high-level insights
   * 2. Domain Sections (Code) - Detailed domain breakdown
   * 3. Next Steps Section (LLM) - Actionable items
   * 
   * @param input - Object containing feedback context
   * @param input.feedbackContext - Structured JSON output from FeedbackContextBuilder
   * @returns Promise resolving to Markdown feedback string
   * @throws Error if generation fails after retries
   */
  async execute({ feedbackContext }: { feedbackContext: FeedbackContext }): Promise<string> {
    console.log('\n📝 Generating pedagogical feedback (3-part approach)...\n');

    try {
      // Part 1: Generate overview section with LLM
      const overviewSection = await this.generateOverviewSection(feedbackContext);

      // Part 2: Generate domain sections with code
      console.log('🧩 Generating domain sections (code-based)...\n');
      const domainSections = this.generateDomainSections(feedbackContext);
      console.log('✅ Domain sections generated successfully\n');

      // Part 3: Generate next steps section with LLM
      const nextStepsSection = await this.generateNextStepsSection(feedbackContext.nextSteps);

      // Assemble all parts into final feedback
      console.log('🔨 Assembling complete feedback...\n');
      const completeFeedback = this.assembleFeedback(
        overviewSection,
        domainSections,
        nextStepsSection
      );

      console.log('✅ Complete feedback generated successfully\n');
      return completeFeedback;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to generate feedback:', errorMessage);
      throw new Error(`Feedback generation failed: ${errorMessage}`);
    }
  }

  /**
   * Strips markdown code fences from the generated text.
   * Removes ```markdown or ``` at the start and ``` at the end.
   * 
   * @param text - Raw text that may contain markdown code fences
   * @returns Cleaned text without code fences
   */
  private stripMarkdownCodeFences(text: string): string {
    return text
      .replace(/^```markdown\s*\n/i, '')
      .replace(/^```\s*\n/, '')
      .replace(/\n```\s*$/, '')
      .trim();
  }

  /**
   * Retries an LLM call up to MAX_RETRIES times with exponential backoff.
   * 
   * @param fn - The async function to retry
   * @param context - Description of the operation for logging
   * @returns The result of the function call
   * @throws Error if all retries fail
   */
  private async retryLLMCall<T>(
    fn: () => Promise<T>, 
    context: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 ${context} - Attempt ${attempt}/${this.MAX_RETRIES}`);
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`⚠️  ${context} failed (attempt ${attempt}/${this.MAX_RETRIES}):`, lastError.message);
        
        if (attempt < this.MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`⏳ Retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }
    
    throw new Error(`${context} failed after ${this.MAX_RETRIES} attempts: ${lastError?.message}`);
  }

  /**
   * Maps domain key to Portuguese title
   */
  private getDomainTitle(domainKey: string): string {
    const titles: Record<string, string> = {
      'functional_requirements': 'Requisitos Funcionais',
      'best_practices': 'Boas Práticas',
      'non_functional_requirements': 'Requisitos Não Funcionais'
    };
    return titles[domainKey] || domainKey;
  }

  /**
   * Maps domain key to emoji
   */
  private getDomainEmoji(domainKey: string): string {
    return '🧩'; // All domains use the same emoji
  }

  /**
   * Generates all domain sections using code (not LLM).
   * Iterates through domains in order and formats them with scores and items.
   * 
   * @param feedbackContext - Complete feedback context
   * @returns Markdown string with all domain sections
   */
  private generateDomainSections(feedbackContext: FeedbackContext): string {
    const sections: string[] = [];
    
    // Order: functional_requirements → best_practices → non_functional_requirements
    const orderedKeys: Array<'functional_requirements' | 'best_practices' | 'non_functional_requirements'> = [
      'functional_requirements',
      'best_practices', 
      'non_functional_requirements'
    ];
    
    for (const key of orderedKeys) {
      const domainData = feedbackContext.domains[key];
      if (domainData) {
        sections.push(this.generateSingleDomain(key, domainData));
      }
    }
    
    return sections.join('\n\n');
  }

  /**
   * Generates a single domain section with its score, strengths, and improvements.
   * 
   * @param domainKey - Domain identifier
   * @param domainData - Domain feedback data
   * @returns Markdown string for this domain
   */
  private generateSingleDomain(domainKey: string, domainData: DomainFeedback): string {
    const title = this.getDomainTitle(domainKey);
    const emoji = this.getDomainEmoji(domainKey);
    
    let markdown = `## ${emoji} ${title}\n`;
    markdown += `**Nota: ${domainData.score} | Peso: ${Math.round(domainData.weight * 100)}%**\n\n`;
    
    // Pontos Fortes
    if (domainData.strengths.length > 0) {
      markdown += `### Pontos Fortes\n`;
      domainData.strengths.forEach(strength => {
        markdown += `- ${strength}\n`;
      });
      markdown += '\n';
    }
    
    // Pontos a Melhorar: criticalFindings FIRST, then all recommendations
    const improvements = [
      ...domainData.criticalFindings,
      // ...domainData.improvementAreas.flatMap(area => area.recommendations)
    ];
    
    if (improvements.length > 0) {
      markdown += `### Pontos a Melhorar\n`;
      improvements.forEach(item => {
        markdown += `- ${item}\n`;
      });
    }
    
    return markdown.trim();
  }

  /**
   * Aggregates data from all domains for the overview section.
   * Collects all strengths and improvement areas across domains.
   * 
   * @param feedbackContext - Complete feedback context
   * @returns Aggregated data for overview generation
   */
  private aggregateOverviewData(feedbackContext: FeedbackContext) {
    const allStrengths: string[] = [];
    const allImprovements: string[] = [];

    // Iterate through all domains
    const domains = [
      feedbackContext.domains.functional_requirements,
      feedbackContext.domains.best_practices,
      feedbackContext.domains.non_functional_requirements
    ].filter(Boolean); // Remove undefined domains

    for (const domain of domains) {
      if (domain) {
        // Collect strengths
        allStrengths.push(...domain.strengths);
        
        // Collect improvements: criticalFindings + all recommendations
        allImprovements.push(...domain.criticalFindings);
        allImprovements.push(
          ...domain.improvementAreas.flatMap(area => area.recommendations)
        );
      }
    }

    return {
      finalScore: feedbackContext.summary.finalScore,
      finalStatus: feedbackContext.summary.finalStatus,
      strengths: allStrengths,
      improvementAreas: allImprovements
    };
  }

  /**
   * Builds the system prompt for overview generation.
   */
  private buildOverviewSystemPrompt(): string {
    return `You are an expert in educational feedback for programming students.

## YOUR MISSION

Generate ONLY the "Visão Geral" (Overview) section of a project feedback in Markdown.

## LANGUAGE RULES

- **Language**: Brazilian Portuguese (pt-BR) exclusively
- **Tone**: Educational, respectful, encouraging, and constructive
- **Prohibitions**: NEVER shame, insult, or diminish the student
- **Approach**: Always frame improvements as learning opportunities

## EXACT OUTPUT FORMAT

You must generate EXACTLY this structure:

\`\`\`markdown
# 📊 Feedback do Projeto

## Visão Geral
[Write 2-3 sentences of general project evaluation here based on the score and status]

- **Nota Final:** [finalScore, between 0 and 100]
- **Status:** [finalStatus]
- **Pontos Fortes:** [Synthesize 2-4 high-level strengths from the provided list, one word per strength separated by comma]
- **Áreas de Melhoria:** [Synthesize 2-4 high-level improvement areas from the provided list, one word per improvement area separated by comma]
\`\`\`

## SCORE STATUSES TRANSLATIONS

- "APPROVED": "Aprovado"
- "APPROVED_WITH_REMARKS": "Aprovado com Observações"
- "REJECTED": "Reprovado"

## CRITICAL RULES

⚠️ **NEVER** invent new information beyond what exists in the provided data
⚠️ **NEVER** add generic or vague statements
⚠️ **ALWAYS** maintain educational and constructive tone
⚠️ **ALWAYS** synthesize insights from the provided strengths and improvement areas
⚠️ **ALWAYS** keep the overview concise (2-4 items per list)

## TONE EXAMPLES (in pt-BR)

✅ "Parabéns pelo desenvolvimento do seu projeto! Você demonstrou compreensão sólida dos conceitos fundamentais."
✅ "Esta é uma excelente oportunidade para aprofundar seu conhecimento sobre..."
✅ "Seu projeto apresenta uma estrutura bem organizada e implementação cuidadosa."

❌ Do not use "Você errou em..."
❌ Do not use "O código está ruim porque..."
❌ Do not use "Faltou implementar..." (sem contexto construtivo)

---

Generate the overview section in pure Markdown, without code blocks or additional formatting.`;
  }

  /**
   * Builds the user prompt for overview generation with aggregated data.
   */
  private buildOverviewUserPrompt(overviewData: {
    finalScore: number;
    finalStatus: string;
    strengths: string[];
    improvementAreas: string[];
  }): string {
    return `Project evaluation summary:

**Final Score:** ${overviewData.finalScore}
**Final Status:** ${overviewData.finalStatus}

**All Strengths from Domains:**
${overviewData.strengths.map(s => `- ${s}`).join('\n')}

**All Improvement Areas from Domains:**
${overviewData.improvementAreas.map(i => `- ${i}`).join('\n')}

---

Based on this data, generate the "Visão Geral" section following all defined rules.

Remember:
- Use Brazilian Portuguese (pt-BR) for all output
- Maintain educational and respectful tone
- Synthesize 2-4 high-level strengths from the provided list
- Synthesize 2-4 high-level improvement areas from the provided list
- DO NOT invent information beyond what's provided
- Follow the exact requested structure`;
  }

  /**
   * Generates the overview section using LLM with retry mechanism.
   * 
   * @param feedbackContext - Complete feedback context
   * @returns Overview section in Markdown
   */
  private async generateOverviewSection(feedbackContext: FeedbackContext): Promise<string> {
    console.log('\n📝 Generating overview section...\n');

    const overviewData = this.aggregateOverviewData(feedbackContext);
    const systemPrompt = this.buildOverviewSystemPrompt();
    const userPrompt = this.buildOverviewUserPrompt(overviewData);

    const result = await this.retryLLMCall(
      async () => {
        const response = await generateText({
          model: openRouter(this.MODEL),
          system: systemPrompt,
          prompt: userPrompt,
          maxOutputTokens: this.MAX_OUTPUT_TOKENS,
          temperature: this.TEMPERATURE,
        });
        return response.text;
      },
      'Overview generation'
    );

    console.log('✅ Overview section generated successfully\n');
    return this.stripMarkdownCodeFences(result);
  }

  /**
   * Builds the system prompt for next steps generation.
   */
  private buildNextStepsSystemPrompt(): string {
    return `You are an expert in educational feedback for programming students.

## YOUR MISSION

Generate ONLY the "Próximos Passos" (Next Steps) section of a project feedback in Markdown.

Transform the provided action items into clear, actionable steps in infinitive verb form.

## LANGUAGE RULES

- **Language**: Brazilian Portuguese (pt-BR) exclusively
- **Tone**: Educational, respectful, encouraging, and constructive
- **Approach**: Frame each action as a learning opportunity

## EXACT OUTPUT FORMAT

You must generate EXACTLY this structure:

\`\`\`markdown
## 🚀 Próximos Passos

### 🔴 Ações Obrigatórias
- [Transform each mustFix item into infinitive verb action]
- [Preserve file references if present: path/to/file.ts:1-20]
- [Each item on a separate bullet point]

### 🟡 Ações Recomendadas
- [Transform each shouldImprove item into infinitive verb action]
- [Preserve file references if present]
- [Each item on a separate bullet point]

### 🟢 Melhorias Sugeridas
- [Transform each couldEnhance item into infinitive verb action]
- [Preserve file references if present]
- [Each item on a separate bullet point]
\`\`\`

## CRITICAL RULES

⚠️ **ALWAYS** start each action with an infinitive verb (e.g., "Implementar", "Corrigir", "Adicionar", "Refatorar")
⚠️ **ALWAYS** preserve file references if present in the original item (format: path/to/file.ts:1-20)
⚠️ **NEVER** skip or omit any provided item
⚠️ **NEVER** add new actions beyond what's provided
⚠️ **NEVER** change the technical meaning of the action
⚠️ **ALWAYS** maintain educational and constructive tone
⚠️ **ALWAYS** keep actions clear, specific, and actionable

## TRANSFORMATION EXAMPLES

Input: "src/middleware/auth.ts:15-30 - Middleware de autenticação não está validando corretamente os tokens"
Output: "Corrigir a validação de tokens no middleware de autenticação em src/middleware/auth.ts:15-30"

Input: "src/database/connection.ts:10-20 - Adicionar tratamento de erros para conexões com o banco de dados"
Output: "Implementar tratamento de erros para conexões com o banco de dados em src/database/connection.ts:10-20"

Input: "Considerar implementar caching para dados acessados frequentemente"
Output: "Implementar cache para dados acessados frequentemente"

---

Generate the next steps section in pure Markdown, without code blocks or additional formatting.`;
  }

  /**
   * Builds the user prompt for next steps generation.
   */
  private buildNextStepsUserPrompt(nextSteps: NextSteps): string {
    return `Action items to transform into next steps:

**Ações Obrigatórias (mustFix):**
${nextSteps.mustFix.length > 0 ? nextSteps.mustFix.map(item => `- ${item}`).join('\n') : '- Nenhuma ação obrigatória'}

**Ações Recomendadas (shouldImprove):**
${nextSteps.shouldImprove.length > 0 ? nextSteps.shouldImprove.map(item => `- ${item}`).join('\n') : '- Nenhuma ação recomendada'}

**Melhorias Sugeridas (couldEnhance):**
${nextSteps.couldEnhance.length > 0 ? nextSteps.couldEnhance.map(item => `- ${item}`).join('\n') : '- Nenhuma melhoria sugerida'}

---

Based on these items, generate the "Próximos Passos" section following all defined rules.

Remember:
- Use Brazilian Portuguese (pt-BR) for all output
- Transform each item to start with an infinitive verb
- Preserve file references if present (format: path/to/file.ts:1-20)
- DO NOT skip any items
- DO NOT add new actions
- Maintain educational and constructive tone
- Follow the exact requested structure`;
  }

  /**
   * Generates the next steps section using LLM with retry mechanism.
   * 
   * @param nextSteps - Categorized next steps data
   * @returns Next steps section in Markdown
   */
  private async generateNextStepsSection(nextSteps: NextSteps): Promise<string> {
    console.log('\n🚀 Generating next steps section...\n');

    const systemPrompt = this.buildNextStepsSystemPrompt();
    const userPrompt = this.buildNextStepsUserPrompt(nextSteps);

    const result = await this.retryLLMCall(
      async () => {
        const response = await generateText({
          model: openRouter(this.MODEL),
          system: systemPrompt,
          prompt: userPrompt,
          maxOutputTokens: this.MAX_OUTPUT_TOKENS,
          temperature: this.TEMPERATURE,
        });
        return response.text;
      },
      'Next steps generation'
    );

    console.log('✅ Next steps section generated successfully\n');
    return this.stripMarkdownCodeFences(result);
  }

  /**
   * Assembles the complete feedback by combining all three parts.
   * 
   * @param overview - Overview section (LLM generated)
   * @param domains - Domain sections (code generated)
   * @param nextSteps - Next steps section (LLM generated)
   * @returns Complete feedback in Markdown format
   */
  private assembleFeedback(overview: string, domains: string, nextSteps: string): string {
    const parts = [
      overview.trim(),
      '---',
      domains.trim(),
      '---',
      nextSteps.trim()
    ];
    
    return parts.join('\n\n');
  }


}

export default new FeedbackGeneratorAgent();
