// ============================================================================
// TYPES & INTERFACES
// ============================================================================

import { AggregatedScoreResult } from './static-score-aggregator';
import { OrchestratedResults } from './agent-orchestrator-service';

/**
 * Input for the feedback context builder
 */
export interface FeedbackContextInput {
  aggregatedScore: AggregatedScoreResult;
  orchestratedResults: OrchestratedResults;
}

/**
 * Complete feedback context output
 */
export interface FeedbackContext {
  summary: {
    finalScore: number;
    finalStatus: string;
  };
  domains: {
    functional_requirements: DomainFeedback;
    best_practices?: DomainFeedback;
    non_functional_requirements?: DomainFeedback;
  };
  nextSteps: NextSteps;
  metadata: {
    totalFilesAnalyzed: number;
    processingTimeMs: number;
  };
}

/**
 * Feedback structure for a single domain
 */
export interface DomainFeedback {
  score: number;
  weight: number;
  strengths: string[];
  criticalFindings: string[];
  improvementAreas: ImprovementArea[];
}

/**
 * Improvement area with category metadata
 */
export interface ImprovementArea {
  category: string;
  score: number;
  status: 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED';
  recommendations: string[];
}

/**
 * Categorized next steps for the LLM
 */
export interface NextSteps {
  mustFix: string[];
  shouldImprove: string[];
  couldEnhance: string[];
}

/**
 * Internal category type (mirrors structure from agents)
 */
type Category = {
  title: string;
  score: number;
  status: 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED';
  keyEvidences: string[];
  mainIssues: string[];
  recommendations: string[];
};

/**
 * Domain result type from orchestrator
 */
type DomainResult = {
  categories: Category[];
};

// ============================================================================
// PURE HELPER FUNCTIONS
// ============================================================================

/**
 * Extracts strengths from category key evidences
 * Each evidence becomes one strength statement
 */
function extractStrengths(categories: Category[]): string[] {
  return categories.flatMap(cat => cat.keyEvidences);
}

/**
 * Extracts critical findings from category main issues
 * Each issue becomes one critical finding statement
 */
function extractCriticalFindings(categories: Category[]): string[] {
  return categories.flatMap(cat => cat.mainIssues);
}

/**
 * Builds improvement areas from categories
 * Preserves all metadata (category, score, status, recommendations)
 */
function buildImprovementAreas(categories: Category[]): ImprovementArea[] {
  return categories.map(cat => ({
    category: cat.title,
    score: cat.score,
    status: cat.status,
    recommendations: cat.recommendations
  }));
}

/**
 * Deduplicates an array of strings using exact string matching
 */
function deduplicateRecommendations(recommendations: string[]): string[] {
  return Array.from(new Set(recommendations));
}

/**
 * Filters recommendations from categories by status
 */
function filterRecommendationsByStatus(
  categories: Category[],
  statuses: Array<'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED'>
): string[] {
  const filtered = categories
    .filter(cat => statuses.includes(cat.status))
    .flatMap(cat => cat.recommendations);
  return deduplicateRecommendations(filtered);
}

/**
 * Checks if a result is an error result
 */
function isErrorResult(result: unknown): boolean {
  return result !== null && 
         typeof result === 'object' && 
         'error' in result && 
         (result as { error: boolean }).error === true;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class FeedbackContextBuilder {
  /**
   * Builds feedback context from evaluation results
   * Pure, deterministic transformation - no AI, no external calls
   * 
   * @param input - Aggregated score and orchestrated results
   * @returns Structured feedback context for LLM consumption
   */
  execute(input: FeedbackContextInput): FeedbackContext {
    console.log('\n🏗️  Building feedback context...\n');
    
    const { aggregatedScore, orchestratedResults } = input;
    
    // Build domain feedback for each present domain
    const domains = this.buildDomainFeedback(aggregatedScore, orchestratedResults);
    
    // Extract and categorize next steps
    const nextSteps = this.buildNextSteps(orchestratedResults);
    
    console.log('✅ Feedback context built successfully\n');
    
    return {
      summary: {
        finalScore: aggregatedScore.finalScore,
        finalStatus: aggregatedScore.finalStatus
      },
      domains,
      nextSteps,
      metadata: aggregatedScore.metadata
    };
  }
  
  /**
   * Builds domain-specific feedback for all present domains
   */
  private buildDomainFeedback(
    aggregatedScore: AggregatedScoreResult,
    orchestratedResults: OrchestratedResults
  ): FeedbackContext['domains'] {
    // Handle functional_requirements (required domain, but could be error)
    const functionalResult = orchestratedResults.functional_requirements && !isErrorResult(orchestratedResults.functional_requirements)
      ? orchestratedResults.functional_requirements as DomainResult
      : null;
    
    const domains: FeedbackContext['domains'] = {
      functional_requirements: this.buildSingleDomainFeedback(
        'functional_requirements',
        aggregatedScore,
        functionalResult
      )
    };
    
    // Add optional domains only if present and not an error
    if (orchestratedResults.best_practices && !isErrorResult(orchestratedResults.best_practices)) {
      domains.best_practices = this.buildSingleDomainFeedback(
        'best_practices',
        aggregatedScore,
        orchestratedResults.best_practices as DomainResult
      );
    }
    
    if (orchestratedResults.non_functional_requirements && !isErrorResult(orchestratedResults.non_functional_requirements)) {
      domains.non_functional_requirements = this.buildSingleDomainFeedback(
        'non_functional_requirements',
        aggregatedScore,
        orchestratedResults.non_functional_requirements as DomainResult
      );
    }
    
    return domains;
  }
  
  /**
   * Builds feedback for a single domain
   */
  private buildSingleDomainFeedback(
    domainKey: 'functional_requirements' | 'best_practices' | 'non_functional_requirements',
    aggregatedScore: AggregatedScoreResult,
    domainResult: DomainResult | null
  ): DomainFeedback {
    // Get score and weight from aggregated result
    const score = aggregatedScore.domainScores[domainKey] ?? 0;
    const weight = aggregatedScore.domainWeights[domainKey];
    
    // If domain result is null, return empty feedback
    if (!domainResult) {
      return {
        score,
        weight,
        strengths: [],
        criticalFindings: [],
        improvementAreas: []
      };
    }
    
    const categories = domainResult.categories;
    
    return {
      score,
      weight,
      strengths: extractStrengths(categories),
      criticalFindings: extractCriticalFindings(categories),
      improvementAreas: buildImprovementAreas(categories)
    };
  }
  
  /**
   * Builds categorized next steps
   * 
   * mustFix: functional_requirements with PARTIAL or NOT_IMPLEMENTED
   * shouldImprove: any domain with PARTIAL or NOT_IMPLEMENTED
   * couldEnhance: any domain with IMPLEMENTED
   */
  private buildNextSteps(orchestratedResults: OrchestratedResults): NextSteps {
    // Extract categories from each domain (only if not error results)
    const functionalCategories = (orchestratedResults.functional_requirements && !isErrorResult(orchestratedResults.functional_requirements))
      ? (orchestratedResults.functional_requirements as DomainResult).categories 
      : [];
    
    const bestPracticesCategories = (orchestratedResults.best_practices && !isErrorResult(orchestratedResults.best_practices))
      ? (orchestratedResults.best_practices as DomainResult).categories 
      : [];
    
    const nonFunctionalCategories = (orchestratedResults.non_functional_requirements && !isErrorResult(orchestratedResults.non_functional_requirements))
      ? (orchestratedResults.non_functional_requirements as DomainResult).categories 
      : [];
    
    // All categories combined (for shouldImprove and couldEnhance)
    const allCategories = [
      ...functionalCategories,
      ...bestPracticesCategories,
      ...nonFunctionalCategories
    ];

    const allCategoriesExceptFunctional = [
      ...bestPracticesCategories,
      ...nonFunctionalCategories
    ];
    
    // mustFix: only from functional_requirements, PARTIAL or NOT_IMPLEMENTED
    const mustFix = filterRecommendationsByStatus(
      functionalCategories,
      ['PARTIAL', 'NOT_IMPLEMENTED']
    );
    
    // shouldImprove: from all domains, PARTIAL or NOT_IMPLEMENTED
    const shouldImprove = filterRecommendationsByStatus(
      allCategoriesExceptFunctional,
      ['PARTIAL', 'NOT_IMPLEMENTED']
    );
    
    // couldEnhance: from all domains, IMPLEMENTED only
    const couldEnhance = filterRecommendationsByStatus(
      allCategories,
      ['IMPLEMENTED']
    );
    
    return {
      mustFix,
      shouldImprove,
      couldEnhance
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export default new FeedbackContextBuilder();
