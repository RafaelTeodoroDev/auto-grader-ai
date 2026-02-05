import { NextResponse } from 'next/server';
import { agentOrchestratorResult } from '../../services/mocks/agent-orchestrator-result';
import { feedbackGeneratorAgent } from '../../agents';
import staticScoreAggregator, { AggregatorInput } from '../../services/static-score-aggregator';
import feedbackContextBuilder from '../../services/feedback-context-builder';

export async function GET(request: Request) {
  try {
    // ------------------------------------------------------------------------
    // TEST FEEDBACK GENERATOR AGENT
    // ------------------------------------------------------------------------

    const mockOrchestratorResults = agentOrchestratorResult;

    const mockStaticScoreAggregatorResult = staticScoreAggregator.execute({
      best_practices: mockOrchestratorResults.best_practices,
      functional_requirements: mockOrchestratorResults.functional_requirements,
      non_functional_requirements: mockOrchestratorResults.non_functional_requirements,
      metadata: mockOrchestratorResults.metadata,
    } as AggregatorInput); 

    const mockFeedbackContextBuilderResult = feedbackContextBuilder.execute({
      aggregatedScore: mockStaticScoreAggregatorResult,
      orchestratedResults: mockOrchestratorResults,
    }); 

    const mockFeedbackGeneratorAgentResult = await feedbackGeneratorAgent.execute({ 
      feedbackContext: mockFeedbackContextBuilderResult 
    });  

    console.log(mockFeedbackGeneratorAgentResult);

    return NextResponse.json({
      feedbackGeneratorAgentResult: mockFeedbackGeneratorAgentResult,
      staticScoreAggregatorResult: mockStaticScoreAggregatorResult,
      feedbackContextBuilderResult: mockFeedbackContextBuilderResult,
    });

  } catch (error) {
    console.error('\n❌ Error in evaluation pipeline:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
