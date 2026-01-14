import { Octokit } from '@octokit/rest';
import { isBlacklisted } from '../utils/codebase';

const owner = 'RafaelTeodoroDev';
const repo = 'node-entregas';

interface TreeItem {
    path: string;
    mode: string;
    type: string;
    sha: string;
    size?: number;
    url?: string;
}

class GitHubService {
    private octokit: Octokit;

    constructor() {
        // Inicializa o Octokit com token do GitHub se disponível
        // Para uso público, pode funcionar sem token, mas com rate limit reduzido
        const token = process.env.GITHUB_TOKEN;
        this.octokit = new Octokit({
            auth: token,
        });
    }

    /**
     * Gera uma representação em texto da estrutura de diretórios
     * @param files - Array de caminhos de arquivos
     * @returns String formatada representando a estrutura de diretórios
     */
    private generateDirectoryStructure(files: string[]): string {
        const structure: Record<string, string[]> = {};

        files.forEach((filePath) => {
            const pathParts = filePath.split('/');
            const dir = pathParts.slice(0, -1).join('/') || '/';
            const name = pathParts[pathParts.length - 1];

            if (!structure[dir]) {
                structure[dir] = [];
            }
            structure[dir].push(name);
        });

        // Ordena e formata a estrutura
        const sortedDirs = Object.keys(structure).sort();
        let result = '';

        sortedDirs.forEach((dir) => {
            const items = structure[dir].sort();
            const prefix = dir === '/' ? '' : `${dir}/`;
            items.forEach((item) => {
                result += `${prefix}${item}\n`;
            });
        });

        return result.trim();
    }

    /**
     * Busca recursivamente a árvore completa do repositório usando a API de Git Trees
     * @param treeSha - SHA da árvore (padrão: busca do branch principal)
     * @returns Array de objetos com path e sha dos arquivos
     */
    private async getRepositoryTree(
        treeSha?: string,
    ): Promise<Array<{ path: string; sha: string }>> {
        try {
            // Se não fornecido, busca o SHA do branch principal
            if (!treeSha) {
                const { data: refData } = await this.octokit.repos.getBranch({
                    owner,
                    repo,
                    branch: 'main',
                }).catch(async () => {
                    // Tenta 'master' se 'main' não existir
                    return await this.octokit.repos.getBranch({
                        owner,
                        repo,
                        branch: 'master',
                    });
                });

                treeSha = refData.commit.sha;
            }

            // Busca o commit para obter o SHA da árvore
            const { data: commitData } = await this.octokit.git.getCommit({
                owner,
                repo,
                commit_sha: treeSha,
            });

            const treeShaFromCommit = commitData.tree.sha;

            // Busca a árvore completa recursivamente (recursive=1)
            const { data: treeData } = await this.octokit.git.getTree({
                owner,
                repo,
                tree_sha: treeShaFromCommit,
                recursive: '1',
            });

            const files: Array<{ path: string; sha: string }> = [];

            if (treeData.tree) {
                treeData.tree.forEach((item: TreeItem) => {
                    if (item.type === 'blob') {
                        // Ignora arquivos na blacklist
                        if (!isBlacklisted(item.path)) {
                            files.push({
                                path: item.path,
                                sha: item.sha,
                            });
                        }
                    }
                });
            }

            return files;
        } catch (error) {
            console.error('Error fetching repository tree:', error);
            // Fallback: busca recursivamente usando getContent
            return this.getRepositoryTreeFallback();
        }
    }

    /**
     * Método fallback para buscar arquivos recursivamente usando getContent
     * Usado quando a API de Git Trees não está disponível
     * @param path - Caminho do diretório (padrão: raiz)
     * @param files - Array acumulador de arquivos encontrados
     * @returns Array de objetos com path e sha dos arquivos
     */
    private async getRepositoryTreeFallback(
        path: string = '',
        files: Array<{ path: string; sha: string }> = [],
    ): Promise<Array<{ path: string; sha: string }>> {
        try {
            const { data } = await this.octokit.repos.getContent({
                owner,
                repo,
                path: path || '.',
            });

            if (Array.isArray(data)) {
                for (const item of data) {
                    if (item.type === 'file') {
                        // Ignora arquivos na blacklist
                        if (!isBlacklisted(item.path)) {
                            files.push({
                                path: item.path,
                                sha: item.sha,
                            });
                        }
                    } else if (item.type === 'dir') {
                        // Busca recursivamente em subdiretórios
                        await this.getRepositoryTreeFallback(item.path, files);
                    }
                }
            }

            return files;
        } catch (error) {
            console.error(`Error fetching tree for path ${path}:`, error);
            return files;
        }
    }

    /**
     * Busca o conteúdo de um arquivo específico
     * @param path - Caminho do arquivo
     * @returns Conteúdo do arquivo decodificado ou null em caso de erro
     */
    private async getFileContent(path: string): Promise<string | null> {
        try {
            const { data } = await this.octokit.repos.getContent({
                owner,
                repo,
                path,
            });

            if ('content' in data && 'encoding' in data) {
                if (data.encoding === 'base64') {
                    return Buffer.from(data.content, 'base64').toString('utf-8');
                }
                return data.content as string;
            }

            return null;
        } catch (error) {
            console.error(`Error fetching content for ${path}:`, error);
            return null;
        }
    }

    /**
     * Busca dados do repositório usando a API do GitHub
     * Retorna a estrutura de diretórios e um mapa de arquivos
     * @returns Objeto com directoryStructure e filesMap, ou null em caso de erro
     */
    async getRepositoryData(): Promise<{
        directoryStructure: string;
        filesMap: Record<string, string>;
    } | null> {
        try {
            // Busca a árvore completa do repositório
            const treeFiles = await this.getRepositoryTree();

            // Limita a 90 arquivos como no serviço original
            const limitedFiles = treeFiles.slice(0, 90);

            // Gera a estrutura de diretórios
            const directoryStructure = this.generateDirectoryStructure(
                limitedFiles.map((file) => file.path),
            );

            // Busca o conteúdo de todos os arquivos em paralelo
            const filePromises = limitedFiles.map(async (file) => {
                const content = await this.getFileContent(file.path);
                return { path: file.path, content };
            });

            const fileResults = await Promise.all(filePromises);

            // Cria o mapa de arquivos
            const filesMap: Record<string, string> = {};
            fileResults.forEach((result) => {
                if (result.content !== null) {
                    filesMap[result.path] = result.content;
                }
            });

            return {
                directoryStructure,
                filesMap,
            };
        } catch (error) {
            console.error('Error fetching repository data:', error);
            return null;
        }
    }
}

export default GitHubService;
