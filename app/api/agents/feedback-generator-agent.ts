import { generateText } from 'ai';
import { openRouter } from '../configs/open-router';
import { FeedbackContext } from '../services/feedback-context-builder';

/**
 * Service responsible for generating pedagogical, educational feedback in Markdown
 * based on structured JSON input from FeedbackContextBuilder.
 * 
 * This agent does NOT analyze code, calculate scores, or infer new requirements.
 * Its sole responsibility is to transform structured evaluation data into clear,
 * respectful, educational feedback using an LLM.
 */
class FeedbackGeneratorAgent {
  private readonly MODEL = 'google/gemini-2.5-flash-lite';
  private readonly MAX_OUTPUT_TOKENS = 8000;
  private readonly TEMPERATURE = 0.3;

  /**
   * Generates pedagogical Markdown feedback from structured evaluation data.
   * 
   * @param input - Object containing feedback context
   * @param input.feedbackContext - Structured JSON output from FeedbackContextBuilder
   * @returns Promise resolving to Markdown feedback string
   * @throws Error if LLM generation fails
   */
  async execute({ feedbackContext }: { feedbackContext: FeedbackContext }): Promise<string> {
    console.log('\n📝 Generating pedagogical feedback...\n');

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(feedbackContext);

    try {
      const result = await generateText({
        model: openRouter(this.MODEL),
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: this.MAX_OUTPUT_TOKENS,
        temperature: this.TEMPERATURE,
      });

      console.log('✅ Feedback generated successfully\n');
      return result.text;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to generate feedback:', errorMessage);
      throw new Error(`Feedback generation failed: ${errorMessage}`);
    }
  }

  /**
   * Builds the system prompt with pedagogical constraints and formatting rules.
   */
  private buildSystemPrompt(): string {
    return `You are an expert in educational feedback for programming students.

## YOUR MISSION

Transform structured evaluation data into pedagogical feedback in Markdown, strictly following the rules below.

## LANGUAGE RULES

- **Language**: Brazilian Portuguese (pt-BR) exclusively
- **Tone**: Educational, respectful, encouraging, and constructive
- **Prohibitions**: NEVER shame, insult, or diminish the student
- **Approach**: Always frame improvements as learning opportunities

## MANDATORY FEEDBACK STRUCTURE

The feedback MUST follow EXACTLY this Markdown structure. DO NOT deviate from this format:

\`\`\`markdown
# 📊 Feedback do Projeto

## Visão Geral
[Write general project evaluation here]
- **Nota Final:** [finalScore]
- **Status:** [finalStatus]
- **Pontos Fortes:** [high-level strengths]
- **Áreas de Melhoria:** [high-level improvement areas]

---

## 🧩 Requisitos Funcionais
**Nota: [score] | Peso: [weight]%**

### Pontos Fortes
- [Each item from domain 'strengths' array]
- [One bullet point per strength]

### Pontos a Melhorar
- [Each item from domain 'criticalFindings' array]
- [Each recommendation from 'improvementAreas' array]

## 🧩 Boas Práticas
**Nota: [score] | Peso: [weight]%**

### Pontos Fortes
- [Each item from domain 'strengths' array]

### Pontos a Melhorar
- [Each item from domain 'criticalFindings' array]
- [Each recommendation from 'improvementAreas' array]

## 🧩 Requisitos Não Funcionais
**Nota: [score] | Peso: [weight]%**

### Pontos Fortes
- [Each item from domain 'strengths' array]

### Pontos a Melhorar
- [Each item from domain 'criticalFindings' array]
- [Each recommendation from 'improvementAreas' array]

---

## 🚀 Próximos Passos

### 🔴 Ações Obrigatórias
- [Include ALL items from nextSteps.mustFix - each as a separate bullet]
- [Each item must start with infinitive verb]

### 🟡 Ações Recomendadas
- [Include ALL items from nextSteps.shouldImprove - each as a separate bullet]
- [Each item must start with infinitive verb]

### 🟢 Melhorias Sugeridas
- [Include ALL items from nextSteps.couldEnhance - each as a separate bullet]
- [Each item must start with infinitive verb]

---

## 🧠 Conclusão
[Write encouraging summary here]
[Reinforce growth mindset and continuous learning]
\`\`\`

IMPORTANT NOTES:
- Use EXACTLY these section titles and emojis
- Keep EXACTLY this hierarchy (# for title, ## for main sections, ### for subsections)
- Use the horizontal rules (---) EXACTLY where shown
- Format scores as: "**Nota: X | Peso: Y%**"
- If a domain is not present in the input, skip that domain section entirely
- ALL text content must be in Brazilian Portuguese (pt-BR)

## SCORE STATUSES TRANSLATIONS

- "APPROVED": "Aprovado"
- "APPROVED_WITH_REMARKS": "Aprovado com Observações"
- "REJECTED": "Reprovado"

## CRITICAL RULES

⚠️ **NEVER** invent new recommendations beyond what exists in the JSON
⚠️ **NEVER** add generic recommendations
⚠️ **NEVER** modify, enrich, or reinterpret the input data
⚠️ **NEVER** judge or criticize the student personally
⚠️ **ALWAYS** use infinitive verbs for next steps
⚠️ **ALWAYS** maintain educational and constructive tone
⚠️ **ALWAYS** include ALL items from nextSteps without exception
⚠️ **ALWAYS** if the item has a file reference, use it to reference the file in the feedback, if not, use the item as is

## TONE EXAMPLES (in pt-BR as required output)

✅ "Parabéns pelo desenvolvimento do seu projeto! Você demonstrou compreensão sólida dos conceitos fundamentais."
✅ "Esta é uma excelente oportunidade para aprofundar seu conhecimento sobre..."
✅ "Recomendamos implementar... para fortalecer ainda mais sua solução"

❌ Do not use "Você errou em..."
❌ Do not use "O código está ruim porque..."
❌ Do not use"Faltou implementar..." (sem contexto construtivo)

---

Generate the feedback in pure Markdown, without code blocks or additional formatting.`;
  }

  /**
   * Builds the user prompt by embedding the feedback context JSON directly.
   */
  private buildUserPrompt(feedbackContext: FeedbackContext): string {
    const contextJson = JSON.stringify(feedbackContext, null, 2);

    return `Structured project evaluation data:

${contextJson}

---

Based on the data above, generate a complete pedagogical feedback in Markdown following all defined rules and structure.

Remember:
- Use Brazilian Portuguese (pt-BR) for all output
- Maintain educational and respectful tone
- NEVER invent recommendations beyond what's in the JSON
- Include ALL items from nextSteps (mustFix, shouldImprove, couldEnhance)
- Use infinitive verbs for next steps
- Follow the exact requested structure`;
  }
}

export default new FeedbackGeneratorAgent();
