import { Octokit } from '@octokit/rest';
import { isBlacklisted } from './utils/codebase';

const owner = 'RafaelTeodoroDev';
const repo = 'node-entregas';

class CodebaseService {
    private octokit: Octokit;

    constructor() {
        // Inicializar Octokit com ou sem token
        this.octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN, // Opcional, mas recomendado para rate limits maiores
        });
    }

    /**
     * Busca a estrutura de diretórios do repositório
     */
    private async getDirectoryStructure(
        path: string = '',
        prefix: string = '',
    ): Promise<string> {
        try {
            const { data } = await this.octokit.repos.getContent({
                owner,
                repo,
                path,
            });

            if (!Array.isArray(data)) {
                return '';
            }

            let structure = '';

            for (const item of data) {
                if (isBlacklisted(item.name)) {
                    continue;
                }

                if (item.type === 'dir') {
                    structure += `${prefix}${item.name}/\n`;
                    // Recursivamente buscar subdiretórios
                    const subStructure = await this.getDirectoryStructure(
                        item.path,
                        `${prefix}\t`,
                    );
                    structure += subStructure;
                } else if (item.type === 'file') {
                    structure += `${prefix}${item.name}\n`;
                }
            }

            return structure;
        } catch (error) {
            console.error(`Error getting directory structure for ${path}:`, error);
            return '';
        }
    }

    /**
     * Busca todos os arquivos do repositório recursivamente
     */
    private async getFilesRecursively(
        path: string = '',
        filesMap: Map<string, string> = new Map(),
        fileCount: { count: number } = { count: 0 },
    ): Promise<Map<string, string>> {
        try {
            // Limite de arquivos para evitar problemas de memória
            if (fileCount.count >= 90) {
                return filesMap;
            }

            const { data } = await this.octokit.repos.getContent({
                owner,
                repo,
                path,
            });

            if (!Array.isArray(data)) {
                return filesMap;
            }

            // Processar arquivos em paralelo (com limite)
            const batchSize = 5;
            for (let i = 0; i < data.length; i += batchSize) {
                if (fileCount.count >= 90) break;

                const batch = data.slice(i, i + batchSize);
                await Promise.all(
                    batch.map(async (item) => {
                        if (fileCount.count >= 90) return;
                        if (isBlacklisted(item.name)) return;

                        if (item.type === 'dir') {
                            // Recursivamente buscar arquivos no diretório
                            await this.getFilesRecursively(item.path, filesMap, fileCount);
                        } else if (item.type === 'file') {
                            try {
                                // Buscar conteúdo do arquivo
                                const { data: fileData } = await this.octokit.repos.getContent({
                                    owner,
                                    repo,
                                    path: item.path,
                                });

                                if ('content' in fileData && fileData.content) {
                                    // Decodificar conteúdo base64
                                    const content = Buffer.from(
                                        fileData.content,
                                        'base64',
                                    ).toString('utf-8');

                                    filesMap.set(item.path, content);
                                    fileCount.count += 1;
                                }
                            } catch (error) {
                                console.error(`Error fetching file ${item.path}:`, error);
                            }
                        }
                    }),
                );
            }

            return filesMap;
        } catch (error) {
            console.error(`Error getting files for ${path}:`, error);
            return filesMap;
        }
    }

    /**
     * Busca todos os dados do repositório
     */
    async getRepositoryData() {
        try {
            console.log(`Fetching repository data for ${owner}/${repo}...`);

            // Buscar estrutura de diretórios
            const directoryStructure = await this.getDirectoryStructure();

            // Buscar todos os arquivos
            const filesMap = await this.getFilesRecursively();

            console.log(
                `Fetched ${filesMap.size} files from repository ${owner}/${repo}`,
            );

            return {
                directoryStructure,
                filesMap: Object.fromEntries(filesMap),
            };
        } catch (error) {
            console.error('Error fetching repository data:', error);
            throw error;
        }
    }

    /**
     * Busca informações do repositório
     */
    async getRepositoryInfo() {
        try {
            const { data } = await this.octokit.repos.get({
                owner,
                repo,
            });

            return {
                name: data.name,
                fullName: data.full_name,
                description: data.description,
                language: data.language,
                stars: data.stargazers_count,
                forks: data.forks_count,
                openIssues: data.open_issues_count,
                defaultBranch: data.default_branch,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                topics: data.topics,
            };
        } catch (error) {
            console.error('Error fetching repository info:', error);
            throw error;
        }
    }
}

export default new CodebaseService();