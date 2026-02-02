import { z } from 'zod';
import { generateObject } from 'ai';
import { openRouter } from '../configs/open-router';

/**
 * Service for normalizing project requirements
 * Receives requirements in markdown format and normalizes them to a standard JSON format
 * with categories for Best Practices, Functional Requirements, and Non-Functional Requirements
 * Output is in Brazilian Portuguese (PT-BR)
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface RequirementCategory {
  title: string;
  requirements: string[];
  keywords: string[];
}

export interface CategoryGroup {
  categories: RequirementCategory[];
}

export interface NormalizedRequirements {
  best_practices: CategoryGroup;
  functional_requirements: CategoryGroup;
  non_functional_requirements: CategoryGroup;
}

// ============================================
// ZOD SCHEMAS
// ============================================

const requirementCategorySchema = z.object({
  title: z.string().describe('Category title in Brazilian Portuguese (PT-BR)'),
  requirements: z.array(z.string()).describe('List of requirements for this category - copy EXACTLY from input, do not modify'),
  keywords: z.array(z.string()).describe('Relevant keywords for search and categorization (PT/EN)'),
});

const categoryGroupSchema = z.object({
  categories: z.array(requirementCategorySchema).describe('List of organized categories'),
});

const normalizedRequirementsSchema = z.object({
  best_practices: categoryGroupSchema.describe('Best practices and code patterns'),
  functional_requirements: categoryGroupSchema.describe('Functional system requirements'),
  non_functional_requirements: categoryGroupSchema.describe('Non-functional requirements (technologies, performance, etc)'),
});

// ============================================
// SERVICE CLASS
// ============================================

class RequirementsNormalizationAgent {
  private readonly MODEL = 'google/gemini-2.5-flash-lite';
  private readonly SYSTEM_PROMPT = `You are a specialized agent for normalizing software project requirements.

Your task is to analyze project requirements in markdown format and organize them into a standardized JSON format with three main sections:
1. Best Practices (best_practices)
2. Functional Requirements (functional_requirements)
3. Non-Functional Requirements (non_functional_requirements)

## CRITICAL RULE: DO NOT MODIFY REQUIREMENTS

⚠️ IMPORTANT: You must NOT change, rewrite, paraphrase, or create new requirements. 
- Keep every requirement text EXACTLY as provided in the input
- Do not add new requirements that are not in the input
- Do not remove any existing requirements
- Do not combine or split requirements
- Your ONLY job is to ALLOCATE existing requirements to appropriate categories

## CATEGORIZATION RULES

### RULE 1: Preserve structure when already categorized
If the input markdown ALREADY has clear divisions into topics like:
- "Boas Práticas" / "Best Practices"
- "Requisitos Funcionais" / "Functional Requirements"
- "Requisitos Não Funcionais" / "Non Functional Requirements"

→ PRESERVE the existing structure. DO NOT reallocate subtopics between main sections.
→ Keep each subtopic in the section where it appears in the original markdown.

### RULE 2: Reallocate requirements when main topics don't exist
If the markdown does NOT have clear divisions between Best Practices, Functional, and Non-Functional:
→ Analyze each requirement and allocate it based on these classification rules:

**Best Practices** — How the code should be written
   • Describes code organization or writing style, not system behavior
   • Promotes maintainability, readability, scalability, predictability
   • Refers to coding principles/patterns (immutability, separation of concerns, componentization)
   • Does NOT impose specific tools/libraries
   • Can be violated without breaking functionality
   • Key question: "Is this about HOW WELL the system is implemented?"
   • Examples: State management patterns, data transformation (map/filter/reduce), code organization

**Functional Requirements** — What the system does
   • Defines observable system behavior
   • Describes what users can do or system must do
   • Testable via UI, API, or user interaction
   • Represents features, capabilities, flows
   • Affects end-user experience
   • Key question: "If missing, would users say the system doesn't work?"
   • Examples: "User must view list", "System displays total", "After confirmation, show success page"

**Non-Functional Requirements** — Which tools/technologies are required
   • Specifies technologies, libraries, frameworks, architectural constraints
   • Defines HOW the system must be built technically
   • Can be verified by inspecting codebase
   • Acts as technical constraint
   • ⚠️ ANY requirement that only mandates a specific technology = Non-Functional
   • Key question: "Is this about WHICH TOOLS are required?"
   • Examples: React, Vite, styled-components, react-router-dom, LocalStorage, Context API, Zod

### RULE 3: Preserve category sequence
If the markdown has defined categories (e.g., "# Requisitos Funcionais" -> "## Autenticação e Usuários", "## Gestão de Entregas"):
→ Maintain the SAME sequence when creating categories in the JSON.
→ Create only the categories that exist in the markdown.

### RULE 4: Create categories when none exist
If the markdown has main topics but NO subcategories (e.g., "# Requisitos Funcionais" -> list of items without grouping):
→ Analyze the requirements and create logical category groupings based on similarity and context.
→ Give each category a descriptive title in Portuguese.

### RULE 5: Keyword Generation
For each category, generate relevant keywords including:
- Technical terms in Portuguese and English
- Related concepts
- Tools/technologies mentioned
- Term variations (e.g., "estado", "state", "imutabilidade", "immutability")
- Should be related to the category title and the requirements items content

## OUTPUT STRUCTURE

The JSON must follow exactly this structure. ALL text content must be in Brazilian Portuguese (PT-BR):

\`\`\`json
{
  "best_practices": {
    "categories": [
      {
        "title": "Título da Categoria",
        "requirements": ["Requisito 1", "Requisito 2"],
        "keywords": ["keyword1", "keyword2", "keyword3"]
      }
    ]
  },
  "functional_requirements": {
    "categories": [
      {
        "title": "Título da Categoria",
        "requirements": ["Requisito 1", "Requisito 2"],
        "keywords": ["keyword1", "keyword2", "keyword3"]
      }
    ]
  },
  "non_functional_requirements": {
    "categories": [
      {
        "title": "Título da Categoria",
        "requirements": ["Requisito 1", "Requisito 2"],
        "keywords": ["keyword1", "keyword2", "keyword3"]
      }
    ]
  }
}
\`\`\`

## PROCESSING EXAMPLE

**Input:**
\`\`\`markdown
1. Regras principais do sistema
O usuário deve visualizar a listagem de cafés disponíveis.
O usuário pode adicionar cafés ao carrinho.

2. Conceitos e ferramentas a praticar
Estados e imutabilidade
ContextAPI para gerenciamento global
LocalStorage para persistir itens

3. Estrutura esperada do desafio
Página Home com listagem de cafés
Página Carrinho/Checkout
\`\`\`

**Expected output:**
- "Regras principais" → functional_requirements (with subtopics about listing and cart)
- "Conceitos e ferramentas" → best_practices (with subtopics about state, ContextAPI, etc)
- "Estrutura esperada" → functional_requirements or non_functional_requirements (depending on content)

## FINAL INSTRUCTIONS

1. Carefully analyze the input markdown
2. Identify if there's already a division into main topics
3. If yes, preserve the structure and only organize into categories
4. If no, intelligently categorize each item
5. Generate rich and relevant keywords for each category
6. Return ONLY valid JSON, no additional text. You MUST return valid JSON that can be parsed without errors.
7. Ensure the JSON is complete and well-formed. You MUST return valid JSON that can be parsed without errors.
8. ALL output text must be in Brazilian Portuguese (PT-BR)
9. If some topic does not have any requirements, do not create a category for it, but keep the topic in the appropriate section with an empty array of categories.
10. ⚠️ CRITICAL: Requirements text must be copied EXACTLY as in the input, word for word`;

  /**
   * Language configuration for output
   */
  private readonly OUTPUT_LANGUAGE = 'pt-BR';

  /**
   * Normalizes project requirements from markdown format to structured JSON
   * @param markdownInput - String containing requirements in markdown format
   * @returns Normalized JSON object with best_practices, functional_requirements and non_functional_requirements
   * @throws Error if input is invalid or generation fails
   */
  async execute(markdownInput: string): Promise<NormalizedRequirements> {
    // Input validation
    if (!markdownInput || typeof markdownInput !== 'string') {
      throw new Error('Invalid input: markdownInput must be a non-empty string');
    }

    const trimmedInput = markdownInput.trim();
    if (trimmedInput.length === 0) {
      throw new Error('Invalid input: markdownInput cannot be empty');
    }

    console.log('\n🤖 Starting requirements normalization...\n');

    // Try up to 3 times with stronger prompts on failure
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`  Attempt ${attempt}/3...`);
        
        const result = await generateObject({
          model: openRouter(this.MODEL),
          system: attempt === 1 ? this.SYSTEM_PROMPT : this.buildRetrySystemPrompt(attempt),
          maxOutputTokens: 8000,
          temperature: 0.2, // Lower temperature for more deterministic output
          output: 'object',
          messages: [
            {
              role: 'user',
              content: attempt === 1 
                ? `## PROJECT REQUIREMENTS (MARKDOWN):\n\n${trimmedInput}\n\nRemember: Copy requirements EXACTLY as written above. Do not modify, rewrite, or create new requirements. Only allocate them to appropriate categories.`
                : this.buildRetryUserPrompt(trimmedInput, attempt)
            }
          ],
          schema: normalizedRequirementsSchema
        });

        console.log('✅ Requirements normalization completed successfully!\n');

        // Additional result validation
        const normalized = result.object;
        this.validateResult(normalized);

        return normalized;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`  ⚠️  Attempt ${attempt} failed: ${lastError.message}`);
        
        if (attempt < 3) {
          console.log(`  Retrying with stronger prompt...`);
          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // All attempts failed
    console.error('❌ All normalization attempts failed');
    
    if (lastError instanceof Error) {
      throw new Error(`Requirements normalization failed after 3 attempts: ${lastError.message}`);
    }
    
    throw new Error('Unknown error in requirements normalization after 3 attempts');
  }

  private buildRetrySystemPrompt(attempt: number): string {
    const basePrompt = this.SYSTEM_PROMPT;
    
    if (attempt === 2) {
      return basePrompt + `\n\n## CRITICAL REMINDER (Attempt 2)\n\nYour previous response was not valid JSON. You MUST return ONLY a JSON object. NO markdown headers, NO narrative text, NO explanations outside the JSON. Just the raw JSON starting with { and ending with }.`;
    }
    
    return basePrompt + `\n\n## FINAL ATTEMPT (Attempt 3)\n\nThis is your last chance. The system requires valid JSON. If you cannot produce valid JSON, the process will fail.\n\nREMEMBER:\n- Start with {\n- End with }\n- NO text before or after\n- NO markdown\n- Just pure JSON\n- ALL text in Brazilian Portuguese (PT-BR)`;
  }

  private buildRetryUserPrompt(markdownInput: string, attempt: number): string {
    if (attempt === 2) {
      return `ATTEMPT 2 - Return ONLY JSON:\n\n${markdownInput}\n\nREMEMBER: Return ONLY valid JSON. NO markdown, NO headers, just JSON.`;
    }
    
    return `ATTEMPT 3 - LAST CHANCE:\n\n${markdownInput}\n\nReturn valid JSON ONLY. NO other text. JSON format as shown in system instructions.`;
  }

  /**
   * Additional validation of the result to ensure data integrity
   */
  private validateResult(result: NormalizedRequirements): void {
    const sections = ['best_practices', 'functional_requirements', 'non_functional_requirements'] as const;
    
    for (const section of sections) {
      if (!result[section]) {
        throw new Error(`Invalid result: section '${section}' is missing`);
      }

      if (!Array.isArray(result[section].categories)) {
        throw new Error(`Invalid result: '${section}.categories' must be an array`);
      }

      // Validate each category
      for (let i = 0; i < result[section].categories.length; i++) {
        const category = result[section].categories[i];
        
        if (!category.title || typeof category.title !== 'string') {
          throw new Error(`Category ${i} in '${section}' does not have a valid title`);
        }

        if (!Array.isArray(category.requirements) || category.requirements.length === 0) {
          console.warn(`⚠️ Category '${category.title}' in '${section}' has no requirements`);
        }

        if (!Array.isArray(category.keywords) || category.keywords.length === 0) {
          console.warn(`⚠️ Category '${category.title}' in '${section}' has no keywords`);
        }
      }
    }
  }

  /**
   * Utility method to extract statistics from normalized result
   */
  getStatistics(result: NormalizedRequirements): {
    totalCategories: number;
    totalRequirements: number;
    totalKeywords: number;
    breakdown: Record<string, { categories: number; requirements: number }>;
  } {
    const sections = ['best_practices', 'functional_requirements', 'non_functional_requirements'] as const;
    let totalCategories = 0;
    let totalRequirements = 0;
    let totalKeywords = 0;
    const breakdown: Record<string, { categories: number; requirements: number }> = {};

    for (const section of sections) {
      const categories = result[section].categories;
      const sectionCategories = categories.length;
      const sectionRequirements = categories.reduce((sum, cat) => sum + cat.requirements.length, 0);
      
      totalCategories += sectionCategories;
      totalRequirements += sectionRequirements;
      totalKeywords += categories.reduce((sum, cat) => sum + cat.keywords.length, 0);
      
      breakdown[section] = {
        categories: sectionCategories,
        requirements: sectionRequirements
      };
    }

    return {
      totalCategories,
      totalRequirements,
      totalKeywords,
      breakdown
    };
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export default new RequirementsNormalizationAgent();
