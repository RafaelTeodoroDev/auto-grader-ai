import aiAgentService from '@/app/api/services/ai-agent-service';
import { NextResponse } from 'next/server';
import zipRepositoryService from '../services/zip-repository-service';

export async function GET(request: Request) {
  try {
    // Pegar query parameter 'question' se existir
    const { searchParams } = new URL(request.url);
    const question = searchParams.get('question');

    // Buscar dados do repositório
    const repositoryData: any = await zipRepositoryService.getRepositoryData();

    // Se houver uma pergunta, usar o agente de IA para analisar
    if (question) {
      const aiResponse = await aiAgentService.analyzeRepository(
        repositoryData,
        question
      );

      return NextResponse.json({
        question,
        answer: aiResponse.response,
        usage: aiResponse.usage,
        repositoryData: {
          fileCount: Object.keys(repositoryData.filesMap).length,
          directoryStructure: repositoryData.directoryStructure,
        },
      });
    }

    // Se não houver pergunta, retornar análise geral
    const aiResponse = await aiAgentService.analyzeRepository(repositoryData);

    return NextResponse.json({
      analysis: aiResponse.response,
      usage: aiResponse.usage,
      repositoryData: {
        fileCount: Object.keys(repositoryData.filesMap).length,
        directoryStructure: repositoryData.directoryStructure,
      },
    });
  } catch (error) {
    console.error('Error in AI agent route:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
