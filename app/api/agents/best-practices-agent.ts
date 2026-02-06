import { z } from 'zod';
import { generateObject } from 'ai';
import { openRouter } from '../configs/open-router';
import { CategoryGroup } from '../services/requirements-normalization-agent';

interface AgentInput {
  relevantFiles: Record<string, string>;
  requirements: CategoryGroup;
}

interface BestPracticesResult {
  categories: Array<{
    title: string;
    score: number;
    status: 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED';
    keyEvidences: string[];
    mainIssues: string[];
    recommendations: string[];
  }>;
}

class BestPracticesAgent {
  private readonly MODEL = 'anthropic/claude-sonnet-4.5';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;
  
  async evaluate(input: AgentInput): Promise<BestPracticesResult> {
    console.log(`\n🤖 Starting best practices evaluation...\n`);
    
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
        
        console.log(`✅ Best practices evaluation completed!\n`);
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
    
    console.error(`❌ Best practices agent failed after ${this.MAX_RETRIES} attempts`);
    throw new Error(`Best practices agent failed: ${lastError?.message || 'Unknown error'}`);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private buildSystemPrompt(requirements: CategoryGroup): string {
    const requirementsJson = JSON.stringify(requirements, null, 2);
    
    const exampleCategories = requirements.categories.map(cat => ({
      title: cat.title,
      score: 85,
      status: "IMPLEMENTED",
      keyEvidences: [
        `src/example.ts:10 - Exemplo de evidência para ${cat.title}`
      ],
      mainIssues: [
        `Exemplo de problema encontrado em ${cat.title}`
      ],
      recommendations: [
        `Recomendação específica para melhorar ${cat.title}`
      ]
    }));
    
    const exampleOutputJson = JSON.stringify({ categories: exampleCategories }, null, 2);
    
    return `You are an expert code analyst specialized in code quality and best practices.

## YOUR TASK

Analyze pre-filtered code files against best practices requirements. The code provided is the most relevant subset identified by semantic analysis.

Evaluate code quality, organization, documentation, testing practices, and security patterns.

---

## REQUIREMENT CATEGORIES TO ANALYZE

${requirementsJson}

---

## ANALYSIS PROCESS

For each category above:

1. **Read all requirements** in that category
2. **Examine the code** for compliance with each requirement
3. **Score the category** (0-100) based on:
   - Percentage of requirements met
   - Quality and consistency of implementation
   - Presence of anti-patterns or violations

4. **Determine status**:
   - "IMPLEMENTED": score >= 80 (strong compliance)
   - "PARTIAL": score 50-79 (some compliance, room for improvement)
   - "NOT_IMPLEMENTED": score < 50 (poor compliance)

5. **Gather evidence**: Cite specific file:line showing good practices
6. **Identify issues**: List violations, anti-patterns, missing practices (with file:line)
7. **Recommend actions**: Practical steps to improve (in Portuguese PT-BR)

---

## OUTPUT FIELD DEFINITIONS

When populating the output for each category, follow these guidelines:

**keyEvidences** (array of strings):
- Include ONLY files/requirements that the user successfully implemented
- Each item should reference a specific file:line where the requirement is satisfied
- If a requirement is missing or not implemented, do NOT include it here
- Write in Portuguese PT-BR
- Example: "src/auth.ts:15-20 - Funcionalidade de login implementada conforme requisito"

**mainIssues** (array of strings):
- Include ONLY requirements that are specified in the requirements but NOT found/implemented in the code
- If the issue is related to a specific file, reference it with file:line format
- If the issue is generic and not tied to a specific file, write without file reference
- Write in Portuguese PT-BR
- Examples:
  - With file reference: "src/auth.ts:15-20 - Funcionalidade de Login não usou JWT"
  - Without file reference: "Não implementou cadastro de clientes"

**recommendations** (array of strings):
- Provide actionable suggestions to fix the items listed in mainIssues
- Each recommendation should guide the user on how to implement the missing requirement
- Focus on practical, specific steps the user should take
- Write in Portuguese PT-BR
- Example: "Implementar funcionalidade de reset de senha usando tokens temporários"

---

## IMPORTANT: ENVIRONMENT VARIABLES FILES

⚠️ CRITICAL: Do NOT flag the absence of environment variable files (.env, .env.local, etc.) as an issue.
⚠️ It is EXPECTED and BEST PRACTICE that students do NOT commit these files to Git repositories.
⚠️ This applies to environment files in ANY programming language (.env, .env.local, appsettings.json with secrets, config.yml with secrets, etc.)

Documentation/example files ARE allowed and encouraged:
✅ .env.example, .env.sample, .env.template (Node.js/JavaScript)
✅ appsettings.example.json (C#/.NET)
✅ config.example.yml, config.sample.yml (various languages)
✅ Any file with .example, .sample, .template suffix or similar naming that documents required configuration

You may:
✅ Check if environment variables are USED in the code (process.env, configuration objects, etc.)
✅ Recommend creating documentation files like .env.example (if missing and would be helpful)
✅ Flag hardcoded secrets/credentials in the code itself - this SHOULD negatively impact the score
✅ Verify the presence of .env.example or similar documentation files

You must NOT:
❌ Flag missing .env, .env.local, .env.production or similar actual environment files as issues
❌ Penalize scores for absence of actual environment files (but DO penalize for hardcoded secrets)
❌ Add recommendations to "create .env file" or "implement .env"
❌ List "Não há implementação de variáveis de ambiente (.env)" as a mainIssue

Scoring guidance:
- Absence of actual .env files: NO score impact (this is correct behavior)
- Hardcoded secrets in code: SHOULD reduce score significantly
- Missing .env.example documentation: MAY suggest as improvement (minor impact)

Example of CORRECT vs INCORRECT feedback:
✅ CORRECT: "Recomenda-se criar um arquivo .env.example para documentar as variáveis necessárias"
✅ CORRECT: "Chave secreta hardcoded no código - deve ser movida para variável de ambiente"
❌ INCORRECT: "Não há implementação de variáveis de ambiente (.env)"
❌ INCORRECT: "Falta arquivo .env"

---

## CRITICAL OUTPUT RULES

⚠️ Return ONLY valid JSON (no markdown fences, no explanations)
⚠️ Match the number of categories from input exactly
⚠️ All text fields in Brazilian Portuguese (PT-BR)
⚠️ Always reference file:line in evidence and issues
⚠️ Be specific and actionable in recommendations

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

export type { BestPracticesResult };
export default new BestPracticesAgent();
