import { z } from 'zod';
import { generateObject } from 'ai';
import { openRouter } from '../configs/open-router';
import { CategoryGroup } from '../services/requirements-normalization-agent';

interface AgentInput {
  relevantFiles: Record<string, string>;
  requirements: CategoryGroup;
}

interface FunctionalRequirementsResult {
  categories: Array<{
    title: string;
    score: number;
    status: 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED';
    keyEvidences: string[];
    mainIssues: string[];
    recommendations: string[];
  }>;
}

class FunctionalRequirementsAgent {
  private readonly MODEL = 'anthropic/claude-3.5-sonnet';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;
  
  async evaluate(input: AgentInput): Promise<FunctionalRequirementsResult> {
    console.log(`\n🤖 Starting functional requirements evaluation...\n`);
    
    const codeContext = this.formatFiles(input.relevantFiles);
    const systemPrompt = this.buildSystemPrompt(input.requirements);
    
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      console.log(`  📝 Attempt ${attempt}/${this.MAX_RETRIES}...`);
      
      try {
        const result = await generateObject({
          model: openRouter(this.MODEL),
          system: systemPrompt,
          maxOutputTokens: 16000,
          temperature: 0.5,
          output: 'object',
          messages: [
            {
              role: 'user',
              content: `## CODE TO ANALYZE\n\n${codeContext}`
            }
          ],
          schema: this.getSchema()
        });
        
        console.log(`✅ Functional requirements evaluation completed!\n`);
        return result.object;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`  ❌ Attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY_MS * attempt;
          console.log(`  ⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    console.error(`❌ Functional requirements agent failed after ${this.MAX_RETRIES} attempts`);
    throw new Error(`Functional requirements agent failed: ${lastError?.message || 'Unknown error'}`);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private buildSystemPrompt(requirements: CategoryGroup): string {
    const requirementsJson = JSON.stringify(requirements, null, 2);
    
    const exampleCategories = requirements.categories.map(cat => ({
      title: cat.title,
      score: 80,
      status: "PARTIAL",
      keyEvidences: [
        `src/example.ts:25-40 - Implementação parcial de ${cat.title}`
      ],
      mainIssues: [
        `Funcionalidade X de ${cat.title} não implementada`
      ],
      recommendations: [
        `Implementar funcionalidade X para completar ${cat.title}`
      ]
    }));
    
    const exampleOutputJson = JSON.stringify({ categories: exampleCategories }, null, 2);
    
    return `You are an expert code analyst specialized in functional requirements verification.

## YOUR TASK

Analyze pre-filtered code files to verify if functional requirements are implemented. The code provided is the most relevant subset identified by semantic analysis.

Check for feature implementation, user stories, system behavior, and business rules.

---

## REQUIREMENT CATEGORIES TO ANALYZE

${requirementsJson}

---

## ANALYSIS PROCESS

For each category above:

1. **Read all requirements** in that category
2. **Search the code** for evidence of implementation
3. **Score the category** (0-100) based on:
   - Percentage of requirements implemented
   - Completeness of implementation
   - Quality of the solution

4. **Determine status**:
   - "IMPLEMENTED": score >= 95 (all requirements implemented, with or without minor recommendations)
   - "PARTIAL": score 50-94 (some requirements implemented, others missing)
   - "NOT_IMPLEMENTED": score < 50 (most requirements not found)

5. **Gather evidence**: Cite specific file:line showing implementations
6. **Identify issues**: List missing features, incomplete implementations (with details)
7. **Recommend actions**: Practical implementation steps (in Portuguese PT-BR)

---

## CRITICAL OUTPUT RULES

⚠️ Return ONLY valid JSON (no markdown fences, no explanations)
⚠️ Match the number of categories from input exactly
⚠️ All text fields in Brazilian Portuguese (PT-BR)
⚠️ Always reference file:line in evidence and issues
⚠️ Be specific about what's implemented and what's missing

---

## EXPECTED OUTPUT FORMAT

${exampleOutputJson}

---

Begin analysis. Return only the JSON object.`;
  }
  
  private formatFiles(files: Record<string, string>): string {
    return Object.entries(files)
      .map(([path, content]) => `
### File: ${path}

\`\`\`
${content}
\`\`\`
`.trim())
      .join('\n\n---\n\n');
  }
  
  private getSchema() {
    return z.object({
      categories: z.array(z.object({
        title: z.string(),
        score: z.number().min(0).max(100),
        status: z.enum(['IMPLEMENTED', 'PARTIAL', 'NOT_IMPLEMENTED']),
        keyEvidences: z.array(z.string()),
        mainIssues: z.array(z.string()),
        recommendations: z.array(z.string()),
      }))
    });
  }
}

export type { FunctionalRequirementsResult };
export default new FunctionalRequirementsAgent();
