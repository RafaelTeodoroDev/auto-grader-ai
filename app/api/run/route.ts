import { NextResponse } from 'next/server';
import zipRepositoryService from '../services/zip-repository-service';
import staticRepoAnalyzer from '../services/static-repo-analyzer';
import requirementsNormalizationAgent from '../services/requirements-normalization-agent';
import { helpDeskProject } from '../services/mocks/project';
import relevanceMappingAgent from '../services/relevance-mapping-service';
import agentOrchestratorService from '../services/agent-orchestrator-service';
import staticScoreAggregator from '../services/static-score-aggregator';
import feedbackContextBuilder from '../services/feedback-context-builder';
import feedbackGeneratorAgent from '../agents/feedback-generator-agent';

/**
 * Type guard to check if a result is an error result
 */
function isErrorResult(result: unknown): boolean {
  return result !== null &&
    typeof result === 'object' &&
    'error' in result &&
    (result as { error: boolean }).error === true;
}

export async function GET(request: Request) {
  try {
    console.log('\n🚀 Starting evaluation pipeline...\n');
    
    // Step 1: Download and extract repository
    console.log('📦 Step 1: Downloading repository...');
    const repositoryData: any = await zipRepositoryService.getRepositoryData();
    console.log(`✅ Repository downloaded - ${Object.keys(repositoryData.filesMap || {}).length} files found\n`);
    
    // Step 2: Static analysis
    console.log('🔍 Step 2: Running static analysis...');
    const analysisResult = staticRepoAnalyzer.analyze(repositoryData);
    if (!analysisResult) {
      throw new Error('Static analysis returned null');
    }
    console.log(`✅ Static analysis complete - ${Object.keys(analysisResult.filteredFilesMap).length} files after filtering\n`);

    // Step 3: Normalize requirements
    console.log('📝 Step 3: Normalizing requirements...');
    const requirementsNormalizationResult = await requirementsNormalizationAgent.execute(
      helpDeskProject.instruction_detail_markdown
    );
    console.log(`✅ Requirements normalized:`);
    console.log(`   - Best Practices: ${requirementsNormalizationResult.best_practices?.categories?.length || 0} categories`);
    console.log(`   - Functional: ${requirementsNormalizationResult.functional_requirements?.categories?.length || 0} categories`);
    console.log(`   - Non-Functional: ${requirementsNormalizationResult.non_functional_requirements?.categories?.length || 0} categories\n`);

    // Step 4: Map relevant files
    console.log('🗺️  Step 4: Mapping relevant files to requirements...');
    const relevanceMappingResult = await relevanceMappingAgent.execute({
      filteredFilesMap: analysisResult.filteredFilesMap, 
      filesContentSummary: analysisResult.filesContentSummary, 
      normalizedRequirements: requirementsNormalizationResult
    });
    console.log(`✅ Relevance mapping complete:`);
    console.log(`   - Best Practices: ${relevanceMappingResult.best_practices?.length || 0} files`);
    console.log(`   - Functional: ${relevanceMappingResult.functional_requirements?.length || 0} files`);
    console.log(`   - Non-Functional: ${relevanceMappingResult.non_functional_requirements?.length || 0} files\n`);

    // Return orchestrator results for validation
    // return NextResponse.json({
    //   relevanceMappingResult,
    // });

    // Step 5: Orchestrate agents
    console.log('🎯 Step 5: Orchestrating evaluation agents...');
    const orchestratorResults = await agentOrchestratorService.orchestrate({
      relevantFilesByRequirement: relevanceMappingResult,
      filteredFilesMap: analysisResult.filteredFilesMap,
      normalizedRequirements: requirementsNormalizationResult
    });
    console.log(`✅ Agent orchestration complete!\n`);

    // Step 6: Aggregate scores
    console.log('📊 Step 6: Aggregating scores...');
    const aggregatedScore = staticScoreAggregator.execute({
      best_practices: orchestratorResults.best_practices && !isErrorResult(orchestratorResults.best_practices)
        ? { categories: (orchestratorResults.best_practices as { categories: any[] }).categories }
        : null,
      functional_requirements: orchestratorResults.functional_requirements && !isErrorResult(orchestratorResults.functional_requirements)
        ? { categories: (orchestratorResults.functional_requirements as { categories: any[] }).categories }
        : { categories: [] },
      non_functional_requirements: orchestratorResults.non_functional_requirements && !isErrorResult(orchestratorResults.non_functional_requirements)
        ? { categories: (orchestratorResults.non_functional_requirements as { categories: any[] }).categories }
        : null,
      metadata: orchestratorResults.metadata
    });
    console.log(`✅ Scores aggregated - Final Score: ${aggregatedScore.finalScore} | Status: ${aggregatedScore.finalStatus}\n`);

    // Step 7: Build feedback context
    console.log('🏗️  Step 7: Building feedback context...');
    const feedbackContext = feedbackContextBuilder.execute({
      aggregatedScore,
      orchestratedResults: orchestratorResults
    });
    console.log(`✅ Feedback context built\n`);

    // Step 8: Generate pedagogical feedback
    console.log('📝 Step 8: Generating pedagogical feedback...');
    const feedbackMarkdown = await feedbackGeneratorAgent.execute({
      feedbackContext
    });
    console.log(`✅ Feedback generated successfully\n`);

    console.log(feedbackMarkdown);

    // Return final results
    return NextResponse.json({
      feedback: feedbackMarkdown,
      score: aggregatedScore.finalScore,
      status: aggregatedScore.finalStatus,
      domainScores: aggregatedScore.domainScores,
      metadata: aggregatedScore.metadata
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
