import aiAgentService from '@/app/api/services/ai-agent-service';
import { NextResponse } from 'next/server';
import zipRepositoryService from '../services/zip-repository-service';

export async function GET(request: Request) {
  try {
    // Buscar dados do repositório
    const repositoryData: any = await zipRepositoryService.getRepositoryData();

    // Se não houver pergunta, retornar análise geral
    const aiResponse = await aiAgentService.analyzeRepository(repositoryData);

    return NextResponse.json({
      analysis: aiResponse.response,
      usage: aiResponse.usage,
      repositoryData: {
        // fileCount: Object.keys(repositoryData.filesMap).length,
        // directoryStructure: repositoryData.directoryStructure,
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
