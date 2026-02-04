import {
  bestPracticesAgent,
  functionalRequirementsAgent,
  nonFunctionalRequirementsAgent,
  BestPracticesResult,
  FunctionalRequirementsResult,
  NonFunctionalRequirementsResult,
} from '../agents';
import { NormalizedRequirements } from './requirements-normalization-agent';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface HybridScoredFile {
  path: string;
  embeddingScore: number;
  llmAssessment: 'PRIMARY' | 'SECONDARY' | 'SUPPORTING' | 'IRRELEVANT';
  hybridScore: number;
  included: boolean;
}

interface RelevanceMappingResult {
  best_practices?: HybridScoredFile[];
  functional_requirements?: HybridScoredFile[];
  non_functional_requirements?: HybridScoredFile[];
  metadata: {
    phase1_total_candidates: number;
    phase2_assessed_files: number;
    final_included_files: number;
    processing_time_ms: number;
  };
}

interface OrchestrateInput {
  relevantFilesByRequirement: RelevanceMappingResult;
  filteredFilesMap: Record<string, string>;
  normalizedRequirements: NormalizedRequirements;
}

interface AgentErrorResult {
  error: true;
  message: string;
  category: string;
}

interface OrchestratedResults {
  best_practices: BestPracticesResult | AgentErrorResult | null;
  functional_requirements: FunctionalRequirementsResult | AgentErrorResult | null;
  non_functional_requirements: NonFunctionalRequirementsResult | AgentErrorResult | null;
  metadata: {
    processedCategories: string[];
    totalFilesAnalyzed: number;
    processingTimeMs: number;
  };
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class AgentOrchestratorService {
  /**
   * Orchestrates the execution of all evaluation agents
   * @param params Input containing relevant files, filtered files map, and normalized requirements
   * @returns Orchestrated results from all agents with metadata
   */
  async orchestrate(params: OrchestrateInput): Promise<OrchestratedResults> {
    console.log('\n🎯 Starting Agent Orchestration...\n');
    const startTime = Date.now();
    
    // Step 1: Extract relevant files by category
    const bestPracticesFiles = this.extractRelevantFiles(
      params.relevantFilesByRequirement.best_practices,
      params.filteredFilesMap
    );
    
    const functionalFiles = this.extractRelevantFiles(
      params.relevantFilesByRequirement.functional_requirements,
      params.filteredFilesMap
    );
    
    const nonFunctionalFiles = this.extractRelevantFiles(
      params.relevantFilesByRequirement.non_functional_requirements,
      params.filteredFilesMap
    );
    
    console.log(`📊 File extraction summary:`);
    console.log(`   Best Practices: ${bestPracticesFiles ? Object.keys(bestPracticesFiles).length : 0} files`);
    console.log(`   Functional Requirements: ${functionalFiles ? Object.keys(functionalFiles).length : 0} files`);
    console.log(`   Non-Functional Requirements: ${nonFunctionalFiles ? Object.keys(nonFunctionalFiles).length : 0} files\n`);
    
    // Step 2: Build parallel promises (only for categories with files)
    const promises: Array<Promise<any>> = [];
    const categoryMap: string[] = [];
    
    if (bestPracticesFiles) {
      promises.push(
        this.executeBestPracticesAgent(
          bestPracticesFiles,
          params.normalizedRequirements.best_practices
        ).catch(err => this.handleAgentError('best_practices', err))
      );
      categoryMap.push('best_practices');
    }
    
    if (functionalFiles) {
      promises.push(
        this.executeFunctionalAgent(
          functionalFiles,
          params.normalizedRequirements.functional_requirements
        ).catch(err => this.handleAgentError('functional_requirements', err))
      );
      categoryMap.push('functional_requirements');
    }
    
    if (nonFunctionalFiles) {
      promises.push(
        this.executeNonFunctionalAgent(
          nonFunctionalFiles,
          params.normalizedRequirements.non_functional_requirements
        ).catch(err => this.handleAgentError('non_functional_requirements', err))
      );
      categoryMap.push('non_functional_requirements');
    }
    
    // Step 3: Execute in parallel
    console.log(`⚡ Executing ${promises.length} agent(s) in parallel...\n`);
    const results = await Promise.all(promises);
    
    // Step 4: Map results to correct categories
    const mappedResults: Partial<{
      best_practices: BestPracticesResult | AgentErrorResult;
      functional_requirements: FunctionalRequirementsResult | AgentErrorResult;
      non_functional_requirements: NonFunctionalRequirementsResult | AgentErrorResult;
    }> = {};
    
    categoryMap.forEach((category, index) => {
      mappedResults[category as keyof typeof mappedResults] = results[index];
    });
    
    // Step 5: Aggregate and return
    const processingTimeMs = Date.now() - startTime;
    
    console.log(`✅ Agent orchestration completed in ${processingTimeMs}ms\n`);
    
    return {
      best_practices: mappedResults.best_practices || null,
      functional_requirements: mappedResults.functional_requirements || null,
      non_functional_requirements: mappedResults.non_functional_requirements || null,
      metadata: {
        processedCategories: categoryMap,
        totalFilesAnalyzed: this.countUniqueFiles([
          bestPracticesFiles,
          functionalFiles,
          nonFunctionalFiles
        ]),
        processingTimeMs
      }
    };
  }
  
  /**
   * Extracts relevant files from the filtered files map
   * @param scoredFiles Array of files with hybrid scores
   * @param filesMap Complete map of file paths to content
   * @returns Map of relevant files or null if none found
   */
  private extractRelevantFiles(
    scoredFiles: HybridScoredFile[] | undefined,
    filesMap: Record<string, string>
  ): Record<string, string> | null {
    if (!scoredFiles || scoredFiles.length === 0) {
      return null;
    }
    
    const relevant: Record<string, string> = {};
    
    for (const file of scoredFiles) {
      // Only include files marked as included and present in filesMap
      if (file.included && filesMap[file.path]) {
        relevant[file.path] = filesMap[file.path];
      }
    }
    
    return Object.keys(relevant).length > 0 ? relevant : null;
  }
  
  /**
   * Executes the best practices agent
   */
  private async executeBestPracticesAgent(
    files: Record<string, string>,
    requirements: any
  ): Promise<BestPracticesResult> {
    console.log(`  🔍 Evaluating best practices (${Object.keys(files).length} files)...`);
    const result = await bestPracticesAgent.evaluate({ relevantFiles: files, requirements });
    console.log(`  ✅ Best practices evaluation complete`);
    return result;
  }
  
  /**
   * Executes the functional requirements agent
   */
  private async executeFunctionalAgent(
    files: Record<string, string>,
    requirements: any
  ): Promise<FunctionalRequirementsResult> {
    console.log(`  🔍 Evaluating functional requirements (${Object.keys(files).length} files)...`);
    const result = await functionalRequirementsAgent.evaluate({ relevantFiles: files, requirements });
    console.log(`  ✅ Functional requirements evaluation complete`);
    return result;
  }
  
  /**
   * Executes the non-functional requirements agent
   */
  private async executeNonFunctionalAgent(
    files: Record<string, string>,
    requirements: any
  ): Promise<NonFunctionalRequirementsResult> {
    console.log(`  🔍 Evaluating non-functional requirements (${Object.keys(files).length} files)...`);
    const result = await nonFunctionalRequirementsAgent.evaluate({ relevantFiles: files, requirements });
    console.log(`  ✅ Non-functional requirements evaluation complete`);
    return result;
  }
  
  /**
   * Handles errors from agent execution
   */
  private handleAgentError(category: string, error: Error): AgentErrorResult {
    console.error(`  ❌ Error in ${category} agent:`, error.message);
    return {
      error: true,
      message: error.message,
      category
    };
  }
  
  /**
   * Counts unique files across all categories
   */
  private countUniqueFiles(fileMaps: Array<Record<string, string> | null>): number {
    const uniquePaths = new Set<string>();
    
    for (const fileMap of fileMaps) {
      if (fileMap) {
        Object.keys(fileMap).forEach(path => uniquePaths.add(path));
      }
    }
    
    return uniquePaths.size;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export default new AgentOrchestratorService();
export type {
  OrchestrateInput,
  OrchestratedResults,
  AgentErrorResult,
  RelevanceMappingResult,
};
