import { z } from 'zod';
import { embed, generateObject } from 'ai';
import { openRouter } from '../configs/open-router';
import { NormalizedRequirements, RequirementCategory } from './requirements-normalization-agent';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface FileSummary {
  path: string;
  size: number;
  type: 'source' | 'test' | 'config' | 'infra' | 'schema';
  summary: {
    head: string;
    imports: string[];
    body_sample: string;
  };
}

type LLMAssessment = 'PRIMARY' | 'SECONDARY' | 'SUPPORTING' | 'IRRELEVANT';

interface FileCandidate {
  path: string;
  embeddingScore: number;
  llmAssessment?: LLMAssessment;
}

interface HybridScoredFile extends FileCandidate {
  llmAssessment: LLMAssessment;
  hybridScore: number;
}

interface EmbeddingPhaseResult {
  best_practices: FileCandidate[];
  functional_requirements: FileCandidate[];
  non_functional_requirements: FileCandidate[];
}

interface LLMPhaseResult {
  best_practices: Array<{ path: string; assessment: LLMAssessment }>;
  functional_requirements: Array<{ path: string; assessment: LLMAssessment }>;
  non_functional_requirements: Array<{ path: string; assessment: LLMAssessment }>;
}

interface RelevanceMappingResult {
  best_practices: HybridScoredFile[];
  functional_requirements: HybridScoredFile[];
  non_functional_requirements: HybridScoredFile[];
  metadata: {
    phase1_total_candidates: number;
    phase2_assessed_files: number;
    final_included_files: number;
    processing_time_ms: number;
  };
}

interface HybridOptions {
  /** Maximum number of top candidates to select from embedding phase (default: 20) */
  embeddingTopK?: number;
  
  /** Minimum similarity score threshold for embedding phase (default: 0.55) */
  embeddingThreshold?: number;
  
  /** Fallback thresholds for adaptive retry when candidate count is too low */
  embeddingRetryThresholds?: number[];
  
  /** Minimum number of candidates required to proceed to LLM phase (default: 10) */
  minCandidatesForPhase2?: number;
  
  /** Maximum tokens per file for embedding generation (default: 6000) */
  maxTokensPerFile?: number;
  
  /** Number of files to process in parallel during embedding (default: 10) */
  parallelBatchSize?: number;
  
  /** Minimum hybrid score threshold - files with scores below this will be filtered out (default: 0.20) */
  hybridScoreThreshold?: number;
}

interface RelevanceMappingInput {
  filteredFilesMap: Record<string, string>;
  filesContentSummary: FileSummary[];
  normalizedRequirements: NormalizedRequirements;
  options?: HybridOptions;
}

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const LLM_WEIGHT: Record<LLMAssessment, number> = {
  PRIMARY: 1.0,
  SECONDARY: 0.75,
  SUPPORTING: 0.5,
  IRRELEVANT: 0.0,
};

const DEFAULT_OPTIONS: Required<HybridOptions> = {
  // Phase 1: Embedding
  embeddingTopK: 20,
  embeddingThreshold: 0.55,
  embeddingRetryThresholds: [0.45, 0.35, 0.25, 0.15],
  minCandidatesForPhase2: 10,
  maxTokensPerFile: 6000,
  parallelBatchSize: 10,
  
  // Phase 3: Hybrid Scoring
  hybridScoreThreshold: 0.20,
};

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const fileAssessmentSchema = z.object({
  path: z.string().describe('Exact file path from the candidate list - must match input exactly'),
  assessment: z.enum(['PRIMARY', 'SECONDARY', 'SUPPORTING', 'IRRELEVANT'])
    .describe('Relevance level: PRIMARY (1.0), SECONDARY (0.75), SUPPORTING (0.5), IRRELEVANT (0.0)'),
}).describe('Single file assessment with path and relevance level');

const llmPhaseSchema = z.object({
  best_practices: z.array(fileAssessmentSchema)
    .describe('Array of file assessments for best practices - must include ALL candidate files for this type'),
  functional_requirements: z.array(fileAssessmentSchema)
    .describe('Array of file assessments for functional requirements - must include ALL candidate files for this type'),
  non_functional_requirements: z.array(fileAssessmentSchema)
    .describe('Array of file assessments for non-functional requirements - must include ALL candidate files for this type'),
}).describe('Complete relevance assessment containing all files across all three requirement types');

// ============================================================================
// SERVICE CLASS
// ============================================================================

class RelevanceMappingService {
  private readonly EMBEDDING_MODEL = 'text-embedding-3-small';
  private readonly AGENT_MODEL = 'anthropic/claude-3-haiku';

  /**
   * Main entry point for hybrid relevance mapping.
   * Combines embedding-based filtering with LLM assessment to determine file relevance.
   * 
   * @param input - The input containing filtered files, content summaries, and normalized requirements
   * @returns Promise<RelevanceMappingResult> - The final relevance mapping with hybrid scores
   * @throws Error if the relevance mapping process fails
   */
  async execute(input: RelevanceMappingInput): Promise<RelevanceMappingResult> {
    const { filteredFilesMap, filesContentSummary, normalizedRequirements, options } = input;
    const config = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    console.log('\n🔍 Starting hybrid relevance mapping...\n');

    try {
      // Phase 1: Embedding-based filtering
      const phase1Results = await this.embeddingPhase(
        filteredFilesMap,
        normalizedRequirements,
        config
      );

      // Phase 2: LLM assessment
      const phase2Results = await this.llmPhase(
        filesContentSummary,
        normalizedRequirements,
        phase1Results,
        config
      );

      // Phase 3: Hybrid scoring and filtering
      const finalResults = this.hybridScoringPhase(
        phase1Results,
        phase2Results,
        config
      );

      const processingTime = Date.now() - startTime;
      console.log(`\n✅ Relevance mapping completed in ${processingTime}ms\n`);

      return {
        ...finalResults,
        metadata: {
          phase1_total_candidates: this.countCandidates(phase1Results),
          phase2_assessed_files: this.countCandidates(phase2Results),
          final_included_files: this.countIncluded(finalResults),
          processing_time_ms: processingTime,
        }
      };
    } catch (error) {
      console.error('❌ Error in relevance mapping:', error);
      throw new Error(`Relevance mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // PHASE 1: EMBEDDING-BASED FILTERING
  // ============================================================================

  /**
   * Phase 1: Embedding-based filtering.
   * Generates embeddings for files and requirements, then computes similarity scores.
   * 
   * @param filteredFilesMap - Map of file paths to their content
   * @param normalizedRequirements - Normalized requirements grouped by type
   * @param config - Configuration options for the embedding phase
   * @returns Promise<EmbeddingPhaseResult> - Top candidates for each requirement type
   */
  private async embeddingPhase(
    filteredFilesMap: Record<string, string>,
    normalizedRequirements: NormalizedRequirements,
    config: Required<HybridOptions>
  ): Promise<EmbeddingPhaseResult> {
    console.log('📊 Phase 1: Embedding-based filtering...');

    // 1. Generate category query embeddings
    const categoryEmbeddings = await this.generateCategoryEmbeddings(normalizedRequirements, config);

    // 2. Generate file embeddings (parallel batches)
    const fileEmbeddings = await this.generateFileEmbeddings(filteredFilesMap, config);

    // 3. Compute similarities
    const similarities = this.computeSimilarities(fileEmbeddings, categoryEmbeddings);

    // 4. Select top candidates with adaptive thresholding
    const candidates = this.selectTopCandidates(similarities, config);

    console.log(`✓ Phase 1 complete. Candidates: BP=${candidates.best_practices.length}, FR=${candidates.functional_requirements.length}, NFR=${candidates.non_functional_requirements.length}`);

    return candidates;
  }

  /**
   * Generates embeddings for each requirement category.
   * 
   * @param normalizedRequirements - Normalized requirements grouped by type
   * @param config - Configuration options
   * @returns Promise<Record<string, Array<{ category: string; embedding: number[] }>>> - Embeddings for each category by requirement type
   */
  private async generateCategoryEmbeddings(
    normalizedRequirements: NormalizedRequirements,
    config: Required<HybridOptions>
  ): Promise<Record<string, Array<{ category: string; embedding: number[] }>>> {
    const categoryEmbeddings: Record<string, Array<{ category: string; embedding: number[] }>> = {
      best_practices: [],
      functional_requirements: [],
      non_functional_requirements: [],
    };

    for (const [reqType, group] of Object.entries(normalizedRequirements)) {
      for (const category of group.categories) {
        const query = this.buildCategoryQuery(category);
        const embedding = await this.generateEmbedding(query);
        categoryEmbeddings[reqType].push({ category: category.title, embedding });
      }
    }

    return categoryEmbeddings;
  }

  /**
   * Generates embeddings for all files in parallel batches.
   * 
   * @param filteredFilesMap - Map of file paths to their content
   * @param config - Configuration options including batch size and token limits
   * @returns Promise<Array<{ path: string; embedding: number[] }>> - Array of file embeddings
   */
  private async generateFileEmbeddings(
    filteredFilesMap: Record<string, string>,
    config: Required<HybridOptions>
  ): Promise<Array<{ path: string; embedding: number[] }>> {
    const files = Object.entries(filteredFilesMap);
    const fileEmbeddings: Array<{ path: string; embedding: number[] }> = [];

    // Process in parallel batches
    for (let i = 0; i < files.length; i += config.parallelBatchSize) {
      const batch = files.slice(i, i + config.parallelBatchSize);
      
      const batchPromises = batch.map(async ([path, content]) => {
        const truncated = this.truncateToTokenLimit(content, config.maxTokensPerFile);
        const fileText = `File: ${path}\n\n${truncated}`;
        const embedding = await this.generateEmbedding(fileText);
        return { path, embedding };
      });

      const batchResults = await Promise.all(batchPromises);
      fileEmbeddings.push(...batchResults);

      console.log(`  ✓ Embedded ${Math.min((i + config.parallelBatchSize), files.length)}/${files.length} files`);
    }

    return fileEmbeddings;
  }

  /**
   * Computes cosine similarity between file embeddings and category embeddings.
   * 
   * @param fileEmbeddings - Array of file embeddings
   * @param categoryEmbeddings - Embeddings for each requirement category
   * @returns Record<string, Record<string, number>> - Similarity scores for each file by requirement type
   */
  private computeSimilarities(
    fileEmbeddings: Array<{ path: string; embedding: number[] }>,
    categoryEmbeddings: Record<string, Array<{ category: string; embedding: number[] }>>
  ): Record<string, Record<string, number>> {
    const similarities: Record<string, Record<string, number>> = {
      best_practices: {},
      functional_requirements: {},
      non_functional_requirements: {},
    };

    for (const [reqType, categoryEmbs] of Object.entries(categoryEmbeddings)) {
      for (const file of fileEmbeddings) {
        const maxSimilarity = Math.max(
          ...categoryEmbs.map(cat => this.cosineSimilarity(file.embedding, cat.embedding))
        );
        similarities[reqType][file.path] = maxSimilarity;
      }
    }

    return similarities;
  }

  /**
   * Selects top candidates based on similarity scores with adaptive thresholding.
   * 
   * @param similarities - Similarity scores for each file by requirement type
   * @param config - Configuration options including thresholds and topK
   * @returns EmbeddingPhaseResult - Top candidates for each requirement type
   */
  private selectTopCandidates(
    similarities: Record<string, Record<string, number>>,
    config: Required<HybridOptions>
  ): EmbeddingPhaseResult {
    const result: EmbeddingPhaseResult = {
      best_practices: [],
      functional_requirements: [],
      non_functional_requirements: [],
    };

    for (const [reqType, fileSims] of Object.entries(similarities)) {
      let threshold = config.embeddingThreshold;
      let candidates: FileCandidate[] = [];

      // Try with default threshold first
      candidates = this.filterAndSortByThreshold(fileSims, threshold, config.embeddingTopK);

      // Adaptive thresholding if we have too few candidates
      if (candidates.length < config.minCandidatesForPhase2) {
        for (const retryThreshold of config.embeddingRetryThresholds) {
          console.warn(`  ⚠️  ${reqType}: Only ${candidates.length} candidates at threshold ${threshold}. Retrying with ${retryThreshold}...`);
          threshold = retryThreshold;
          candidates = this.filterAndSortByThreshold(fileSims, threshold, config.embeddingTopK);
          
          if (candidates.length >= config.minCandidatesForPhase2) {
            break;
          }
        }
      }

      result[reqType as keyof EmbeddingPhaseResult] = candidates;
    }

    return result;
  }

  /**
   * Filters and sorts files by similarity threshold, returning top K candidates.
   * 
   * @param fileSims - Map of file paths to similarity scores
   * @param threshold - Minimum similarity score to include
   * @param topK - Maximum number of candidates to return
   * @returns FileCandidate[] - Filtered and sorted candidates
   */
  private filterAndSortByThreshold(
    fileSims: Record<string, number>,
    threshold: number,
    topK: number
  ): FileCandidate[] {
    return Object.entries(fileSims)
      .filter(([_, sim]) => sim >= threshold)
      .sort(([_, simA], [__, simB]) => simB - simA)
      .slice(0, topK)
      .map(([path, embeddingScore]) => ({ path, embeddingScore }));
  }

  // ============================================================================
  // PHASE 2: LLM ASSESSMENT
  // ============================================================================

  /**
   * Phase 2: LLM assessment.
   * Uses an LLM to assess the relevance of candidate files with retry logic.
   * 
   * @param filesContentSummary - Summaries of file contents
   * @param normalizedRequirements - Normalized requirements grouped by type
   * @param phase1Results - Results from the embedding phase
   * @param config - Configuration options
   * @returns Promise<LLMPhaseResult> - LLM assessments for each file
   */
  private async llmPhase(
    filesContentSummary: FileSummary[],
    normalizedRequirements: NormalizedRequirements,
    phase1Results: EmbeddingPhaseResult,
    config: Required<HybridOptions>
  ): Promise<LLMPhaseResult> {
    console.log('\n🤖 Phase 2: LLM assessment...');

    // Filter filesContentSummary to only Phase 1 candidates
    const candidatePaths = new Set([
      ...phase1Results.best_practices.map(f => f.path),
      ...phase1Results.functional_requirements.map(f => f.path),
      ...phase1Results.non_functional_requirements.map(f => f.path),
    ]);

    const filteredSummaries = filesContentSummary.filter(f => candidatePaths.has(f.path));

    // Build prompt
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(
      filteredSummaries,
      normalizedRequirements,
      phase1Results
    );

    console.log(`📤 Sending prompt to LLM (${userPrompt.length} chars, ${filteredSummaries.length} files)...`);

    // Try up to 3 times with stronger prompts on failure
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`  Attempt ${attempt}/3...`);
        
        const result = await generateObject({
          model: openRouter(this.AGENT_MODEL),
          system: attempt === 1 ? systemPrompt : this.buildRetrySystemPrompt(attempt),
          messages: [{ 
            role: 'user', 
            content: attempt === 1 ? userPrompt : this.buildRetryUserPrompt(filteredSummaries, attempt)
          }],
          temperature: 0.1, // Lower temperature for more deterministic output
          maxOutputTokens: 8000,
          output: 'object',
          schema: llmPhaseSchema,
        });

        const output = result.object as LLMPhaseResult;
        
        // Validate that all files are included
        this.validateLlmOutput(output, candidatePaths);
        
        console.log('✓ Phase 2 complete. LLM assessment received.');
        return output;
        
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
    console.error('❌ All LLM attempts failed. Falling back to embedding scores only.');
    
    // Fallback: Create IRRELEVANT assessments for all files
    return this.createFallbackAssessment(phase1Results);
  }

  /**
   * Builds a system prompt for retry attempts with stronger instructions.
   * 
   * @param attempt - The current retry attempt number (2 or 3)
   * @returns string - The retry system prompt
   */
  private buildRetrySystemPrompt(attempt: number): string {
    const basePrompt = this.buildSystemPrompt();
    
    if (attempt === 2) {
      return basePrompt + `\n\n## CRITICAL REMINDER (Attempt 2)\n\nYour previous response was not valid JSON. You MUST return ONLY a JSON object. NO markdown headers like ## or ###. NO narrative text. Just the raw JSON starting with { and ending with }.`;
    }
    
    return basePrompt + `\n\n## FINAL ATTEMPT (Attempt 3)\n\nThis is your last chance. The system requires valid JSON. If you cannot produce valid JSON, the process will fail.\n\nREMEMBER:\n- Start with {\n- End with }\n- NO text before or after\n- NO markdown\n- Just pure JSON`;
  }

  /**
   * Builds a user prompt for retry attempts with simplified instructions.
   * 
   * @param filesContentSummary - Summaries of file contents to assess
   * @param attempt - The current retry attempt number (2 or 3)
   * @returns string - The retry user prompt
   */
  private buildRetryUserPrompt(filesContentSummary: FileSummary[], attempt: number): string {
    const totalFiles = filesContentSummary.length;
    
    if (attempt === 2) {
      return `ATTEMPT 2 - Return ONLY JSON:\n\nAssess these ${totalFiles} files and return ONLY a JSON object.\n\nFILES:\n${filesContentSummary.map(f => f.path).join('\n')}\n\nREMEMBER: NO markdown, NO headers, just JSON.`;
    }
    
    return `ATTEMPT 3 - LAST CHANCE:\n\nReturn valid JSON for these ${totalFiles} files:\n${filesContentSummary.map(f => f.path).join('\n')}\n\nJSON format required as shown in system instructions.`;
  }

  /**
   * Validates that the LLM output contains all expected files.
   * 
   * @param output - The LLM phase result to validate
   * @param expectedPaths - Set of file paths that should be in the output
   * @throws Error if files are missing or extra files are present
   */
  private validateLlmOutput(output: LLMPhaseResult, expectedPaths: Set<string>): void {
    const allPaths = new Set([
      ...output.best_practices.map(f => f.path),
      ...output.functional_requirements.map(f => f.path),
      ...output.non_functional_requirements.map(f => f.path),
    ]);
    
    const missing = [...expectedPaths].filter(f => !allPaths.has(f));
    const extra = [...allPaths].filter(f => !expectedPaths.has(f));
    
    if (missing.length > 0) {
      console.warn(`⚠️  LLM output missing ${missing.length} files:`, missing.slice(0, 5));
    }
    
    if (extra.length > 0) {
      console.warn(`⚠️  LLM output has ${extra.length} extra files:`, extra.slice(0, 5));
    }
    
    if (missing.length > 0 || extra.length > 0) {
      throw new Error(`LLM output validation failed: ${missing.length} missing, ${extra.length} extra files`);
    }
  }

  /**
   * Creates a fallback assessment when LLM calls fail.
   * Assigns assessments based on embedding scores.
   * 
   * @param phase1Results - Results from the embedding phase
   * @returns LLMPhaseResult - Fallback assessments for all files
   */
  private createFallbackAssessment(phase1Results: EmbeddingPhaseResult): LLMPhaseResult {
    console.log('⚠️  Using fallback: Marking all files as SECONDARY based on embedding scores');
    
    const assessFile = (file: FileCandidate) => ({
      path: file.path,
      assessment: (file.embeddingScore > 0.6 ? 'PRIMARY' : file.embeddingScore > 0.4 ? 'SECONDARY' : 'SUPPORTING') as LLMAssessment,
    });
    
    return {
      best_practices: phase1Results.best_practices.map(assessFile),
      functional_requirements: phase1Results.functional_requirements.map(assessFile),
      non_functional_requirements: phase1Results.non_functional_requirements.map(assessFile),
    };
  }

  /**
   * Builds the system prompt for the LLM assessment.
   * 
   * @returns string - The system prompt with instructions and format requirements
   */
  private buildSystemPrompt(): string {
    return `You are a specialized agent for assessing file relevance to requirement categories.

## CRITICAL: JSON OUTPUT ONLY

You MUST return ONLY a valid JSON object. NO markdown, NO headers, NO narrative text, NO explanations outside the JSON.

## REQUIRED JSON FORMAT

{
  "best_practices": [
    {
      "path": "exact/file/path.ts",
      "assessment": "PRIMARY"
    }
  ],
  "functional_requirements": [
    {
      "path": "exact/file/path.ts",
      "assessment": "SECONDARY"
    }
  ],
  "non_functional_requirements": [
    {
      "path": "exact/file/path.ts",
      "assessment": "SUPPORTING"
    }
  ]
}

## RELEVANCE LEVELS

PRIMARY (weight: 1.0) - Files that DIRECTLY implement requirements. Core functionality, main business logic. Missing these makes evaluation incomplete.

SECONDARY (weight: 0.75) - Files that SUPPORT requirements. Helper utilities, related services. Useful but not essential.

SUPPORTING (weight: 0.5) - Files with TANGENTIAL relevance. Provides context but not critical.

IRRELEVANT (weight: 0.0) - Files with NO meaningful relevance. Should be excluded.

## EMBEDDING SCORES

You will receive similarity scores (0-1) for each file. These indicate semantic match strength:
- 0.7-1.0: Strong match
- 0.5-0.7: Moderate match  
- 0.25-0.5: Weak match

Use these as signals, not absolute truth. A high score file might still be IRRELEVANT. A low score file might be PRIMARY if it has critical implementation.

## CRITICAL RULES

1. Return ONLY valid JSON - no markdown ## headers, no explanations, no text outside {}
2. Include EVERY candidate file in the output
3. Use EXACT file paths from input
4. Assessment must be exactly: PRIMARY, SECONDARY, SUPPORTING, or IRRELEVANT
5. When uncertain, choose the higher relevance level
6. The JSON must be parseable and complete`;
  }

  /**
   * Builds the user prompt for the LLM assessment.
   * 
   * @param filesContentSummary - Summaries of file contents
   * @param normalizedRequirements - Normalized requirements grouped by type
   * @param phase1Results - Results from the embedding phase including scores
   * @returns string - The user prompt with task and file information
   */
  private buildUserPrompt(
    filesContentSummary: FileSummary[],
    normalizedRequirements: NormalizedRequirements,
    phase1Results: EmbeddingPhaseResult
  ): string {
    const totalFiles = filesContentSummary.length;
    
    return `TASK: Assess ${totalFiles} candidate files and return ONLY JSON.

REQUIREMENTS:
${this.formatNormalizedRequirements(normalizedRequirements)}

CANDIDATE FILES (${totalFiles} total):
${this.formatFilesSummaries(filesContentSummary)}

EMBEDDING SCORES:
${this.formatEmbeddingScores(phase1Results)}

INSTRUCTIONS:
1. Assess EVERY file above
2. Return ONLY the JSON object shown in your system instructions
3. NO markdown headers (##), NO narrative text, NO explanations outside JSON
4. Include ALL ${totalFiles} files in your output
5. Use exact file paths from the candidate list`;
  }

  // ============================================================================
  // PHASE 3: HYBRID SCORING & FILTERING
  // ============================================================================

  /**
   * Phase 3: Hybrid scoring and filtering.
   * Combines embedding scores with LLM assessments to compute final hybrid scores.
   * 
   * @param phase1Results - Results from the embedding phase
   * @param phase2Results - Results from the LLM assessment phase
   * @param config - Configuration options
   * @returns Omit<RelevanceMappingResult, 'metadata'> - Final scored results without metadata
   */
  private hybridScoringPhase(
    phase1Results: EmbeddingPhaseResult,
    phase2Results: LLMPhaseResult,
    config: Required<HybridOptions>
  ): Omit<RelevanceMappingResult, 'metadata'> {
    console.log('\n🎯 Phase 3: Hybrid scoring and filtering...');

    const result: Omit<RelevanceMappingResult, 'metadata'> = {
      best_practices: [],
      functional_requirements: [],
      non_functional_requirements: [],
    };

    for (const reqType of ['best_practices', 'functional_requirements', 'non_functional_requirements'] as const) {
      const phase1Files = phase1Results[reqType];
      const phase2Files = phase2Results[reqType];

      // Merge results
      const merged = this.mergePhaseResults(phase1Files, phase2Files);

      // Compute hybrid scores
      const scored = merged.map(file => this.computeHybridScore(file));

      // Sort by hybrid score
      scored.sort((a, b) => b.hybridScore - a.hybridScore);

      // Filter files below the threshold
      const filtered = scored.filter(file => file.hybridScore >= config.hybridScoreThreshold);

      result[reqType] = filtered;

      console.log(`  ✓ ${reqType}: ${filtered.length} files included (filtered ${scored.length - filtered.length} below threshold)`);
    }

    return result;
  }

  /**
   * Merges Phase 1 and Phase 2 results, adding LLM assessments to file candidates.
   * 
   * @param phase1Files - File candidates from the embedding phase
   * @param phase2Files - LLM assessments for files
   * @returns FileCandidate[] - Merged candidates with LLM assessments
   */
  private mergePhaseResults(
    phase1Files: FileCandidate[],
    phase2Files: Array<{ path: string; assessment: LLMAssessment }>
  ): FileCandidate[] {
    const phase2Map = new Map(phase2Files.map(f => [f.path, f]));

    return phase1Files.map(file => {
      const phase2Data = phase2Map.get(file.path);
      return {
        ...file,
        llmAssessment: phase2Data?.assessment,
      };
    });
  }

  /**
   * Computes the hybrid score by combining embedding score with LLM assessment weight.
   * 
   * @param file - File candidate with embedding score and optional LLM assessment
   * @returns HybridScoredFile - File with computed hybrid score
   */
  private computeHybridScore(
    file: FileCandidate
  ): HybridScoredFile {
    const llmAssessment = file.llmAssessment || 'IRRELEVANT';
    const hybridScore = file.embeddingScore * LLM_WEIGHT[llmAssessment];

    return {
      ...file,
      llmAssessment,
      hybridScore,
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Truncates content to approximate token limit.
   * Uses a simple approximation of 1 token ≈ 4 characters.
   * 
   * @param content - The content to truncate
   * @param maxTokens - Maximum number of tokens allowed
   * @returns string - Truncated content
   */
  private truncateToTokenLimit(content: string, maxTokens: number): string {
    // Simple approximation: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    return content.length > maxChars 
      ? content.substring(0, maxChars) + '\n\n// ... (truncated)'
      : content;
  }

  /**
   * Generates an embedding vector for the given text using the configured embedding model.
   * 
   * @param text - The text to embed
   * @returns Promise<number[]> - The embedding vector
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: openRouter.textEmbeddingModel(this.EMBEDDING_MODEL),
      value: text,
    });
    return embedding;
  }

  /**
   * Calculates cosine similarity between two vectors.
   * 
   * @param vecA - First vector
   * @param vecB - Second vector
   * @returns number - Cosine similarity score between -1 and 1
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Builds a query string for a requirement category to be used for embedding.
   * 
   * @param category - The requirement category with title, keywords, and requirements
   * @returns string - The constructed query string
   */
  private buildCategoryQuery(category: RequirementCategory): string {
    const requirements = category.requirements.slice(0, 5).join('. ');
    const keywords = category.keywords.join(', ');
    return `${category.title}. Keywords: ${keywords}. Requirements: ${requirements}`;
  }

  /**
   * Formats normalized requirements into a readable string for prompts.
   * 
   * @param normalizedRequirements - Normalized requirements grouped by type
   * @returns string - Formatted requirements string
   */
  private formatNormalizedRequirements(normalizedRequirements: NormalizedRequirements): string {
    const sections: string[] = [];

    for (const [reqType, group] of Object.entries(normalizedRequirements)) {
      const typeLabel = reqType.replace(/_/g, ' ').toUpperCase();
      const categories = group.categories.map((cat: RequirementCategory) => {
        const reqs = cat.requirements.map((r: string) => `  - ${r}`).join('\n');
        const keywords = cat.keywords.join(', ');
        return `### ${cat.title}\nKeywords: ${keywords}\nRequirements:\n${reqs}`;
      }).join('\n\n');
      
      sections.push(`## ${typeLabel}\n\n${categories}`);
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * Formats file summaries into a readable string for prompts.
   * 
   * @param filesContentSummary - Array of file summaries
   * @returns string - Formatted file summaries string
   */
  private formatFilesSummaries(filesContentSummary: FileSummary[]): string {
    return filesContentSummary.map(file => {
      const imports = file.summary.imports.length > 0 
        ? `\nImports:\n${file.summary.imports.join('\n')}` 
        : '';
      
      return `### ${file.path}\nType: ${file.type}\nSize: ${file.size} bytes\n\n**Head:**\n\`\`\`\n${file.summary.head}\n\`\`\`${imports}\n\n**Body Sample:**\n\`\`\`\n${file.summary.body_sample}\n\`\`\``;
    }).join('\n\n---\n\n');
  }

  /**
   * Formats embedding scores into a readable string for prompts.
   * 
   * @param phase1Results - Results from the embedding phase
   * @returns string - Formatted embedding scores string
   */
  private formatEmbeddingScores(phase1Results: EmbeddingPhaseResult): string {
    const sections: string[] = [];

    for (const [reqType, files] of Object.entries(phase1Results)) {
      const typeLabel = reqType.replace(/_/g, ' ').toUpperCase();
      const scores = files.map((f: FileCandidate) => `  - ${f.path}: ${f.embeddingScore.toFixed(3)}`).join('\n');
      sections.push(`### ${typeLabel}\n${scores}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Counts the total number of candidates across all requirement types.
   * 
   * @param result - The phase result containing candidates
   * @returns number - Total count of candidates
   */
  private countCandidates(result: EmbeddingPhaseResult | LLMPhaseResult): number {
    return result.best_practices.length + 
           result.functional_requirements.length + 
           result.non_functional_requirements.length;
  }

  /**
   * Counts the total number of included files across all requirement types.
   * 
   * @param result - The final results containing scored files
   * @returns number - Total count of included files
   */
  private countIncluded(result: Omit<RelevanceMappingResult, 'metadata'>): number {
    return result.best_practices.length +
           result.functional_requirements.length +
           result.non_functional_requirements.length;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export default new RelevanceMappingService();
export type { RelevanceMappingResult, HybridScoredFile, HybridOptions, RelevanceMappingInput };
export { RelevanceMappingService };
