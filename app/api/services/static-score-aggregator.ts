// Types are redefined locally to avoid coupling with agent internals

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Category evaluation result from AI agents
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
 * Categories result containing an array of categories
 */
type CategoriesResult = {
  categories: Category[];
};

/**
 * Input for the static score aggregator - matches OrchestratedResults output
 */
export interface AggregatorInput {
  best_practices: CategoriesResult | null;
  functional_requirements: CategoriesResult;
  non_functional_requirements: CategoriesResult | null;
  metadata: {
    processedCategories: string[];
    totalFilesAnalyzed: number;
    processingTimeMs: number;
  };
}

/**
 * Score classification status
 */
export type FinalStatus = 'APPROVED' | 'APPROVED_WITH_REMARKS' | 'REJECTED';

/**
 * Domain scores with optional fields for null domains
 */
type DomainScores = {
  functional_requirements: number;
  best_practices?: number;
  non_functional_requirements?: number;
};

/**
 * Domain weights after normalization (always includes all three keys)
 */
type DomainWeights = {
  best_practices: number;
  functional_requirements: number;
  non_functional_requirements: number;
};

/**
 * Final aggregated score result
 */
export interface AggregatedScoreResult {
  finalScore: number;
  finalStatus: FinalStatus;
  domainScores: DomainScores;
  domainWeights: DomainWeights;
  metadata: {
    totalFilesAnalyzed: number;
    processingTimeMs: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Base weights for each domain before normalization
 */
const DOMAIN_WEIGHTS = {
  best_practices: 0.15,
  functional_requirements: 0.60,
  non_functional_requirements: 0.25,
} as const;

// ============================================================================
// PURE HELPER FUNCTIONS
// ============================================================================

/**
 * Computes the average score across categories
 * Returns 0 if no categories exist
 */
function computeAverageScore(categories: Category[]): number {
  if (categories.length === 0) {
    return 0;
  }
  const sum = categories.reduce((acc, cat) => acc + cat.score, 0);
  return sum / categories.length;
}

/**
 * Normalizes weights based on which domains are present
 * Missing domains get weight 0, present domains are renormalized to sum to 1
 */
function normalizeWeights(present: {
  best_practices: boolean;
  functional_requirements: boolean;
  non_functional_requirements: boolean;
}): DomainWeights {
  // Calculate sum of weights for present domains only
  const weightSum =
    (present.best_practices ? DOMAIN_WEIGHTS.best_practices : 0) +
    (present.functional_requirements ? DOMAIN_WEIGHTS.functional_requirements : 0) +
    (present.non_functional_requirements
      ? DOMAIN_WEIGHTS.non_functional_requirements
      : 0);

  // Fallback: if no weights present (should not happen with FR required)
  if (weightSum === 0) {
    return {
      best_practices: 0,
      functional_requirements: 1,
      non_functional_requirements: 0,
    };
  }

  return {
    best_practices: present.best_practices
      ? DOMAIN_WEIGHTS.best_practices / weightSum
      : 0,
    functional_requirements: present.functional_requirements
      ? DOMAIN_WEIGHTS.functional_requirements / weightSum
      : 0,
    non_functional_requirements: present.non_functional_requirements
      ? DOMAIN_WEIGHTS.non_functional_requirements / weightSum
      : 0,
  };
}

/**
 * Computes final status based on score
 * >= 85: APPROVED, >= 70: APPROVED_WITH_REMARKS, else: REJECTED
 */
function computeFinalStatus(score: number): FinalStatus {
  if (score >= 85) {
    return 'APPROVED';
  }
  if (score >= 70) {
    return 'APPROVED_WITH_REMARKS';
  }
  return 'REJECTED';
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class StaticScoreAggregator {
  /**
   * Aggregates scores from agent evaluations
   * Pure, deterministic function with no side effects
   * Null domains are ignored via weight renormalization
   *
   * @param input - Aggregated results from agent orchestration
   * @returns Final aggregated score with domain breakdown
   */
  execute(input: AggregatorInput): AggregatedScoreResult {
    // Determine which domains are present
    const bestPracticesPresent = input.best_practices !== null;
    const nonFunctionalPresent = input.non_functional_requirements !== null;

    // Normalize weights based on present domains
    const normalizedWeights = normalizeWeights({
      best_practices: bestPracticesPresent,
      functional_requirements: true,
      non_functional_requirements: nonFunctionalPresent,
    });

    // Compute domain scores (only for present domains)
    const bestPracticesAvg = bestPracticesPresent && input.best_practices
      ? computeAverageScore(input.best_practices.categories)
      : undefined;

    const functionalAvg = computeAverageScore(
      input.functional_requirements.categories,
    );

    const nonFunctionalAvg = nonFunctionalPresent
      ? computeAverageScore(input.non_functional_requirements?.categories ?? [])
      : undefined;

    // Build domainScores object (optional fields for null domains)
    const domainScores: DomainScores = {
      functional_requirements: functionalAvg,
    };

    if (bestPracticesPresent) {
      domainScores.best_practices = bestPracticesAvg!;
    }

    if (nonFunctionalPresent) {
      domainScores.non_functional_requirements = nonFunctionalAvg!;
    }

    // Compute weighted final score
    const weightedSum =
      (bestPracticesAvg || 0) * normalizedWeights.best_practices +
      functionalAvg * normalizedWeights.functional_requirements +
      (nonFunctionalAvg || 0) * normalizedWeights.non_functional_requirements;

    const finalScore = Math.round(weightedSum);
    const finalStatus = computeFinalStatus(finalScore);

    return {
      finalScore,
      finalStatus,
      domainScores,
      domainWeights: normalizedWeights,
      metadata: {
        totalFilesAnalyzed: input.metadata.totalFilesAnalyzed,
        processingTimeMs: input.metadata.processingTimeMs,
      },
    };
  }
}

export default new StaticScoreAggregator();