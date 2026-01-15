import * as fs from 'fs';
import * as path from 'path';
import decompress from 'decompress';
import { randomUUID } from 'node:crypto';
import axios from 'axios';
import { isBlacklisted } from '../utils/codebase';

const owner = 'RafaelTeodoroDev';
const repo = 'node-entregas';
const GITHUB_URL = `https://github.com/${owner}/${repo}`;

const MAX_FILE_SIZE_MB = 100;
const MAX_REPO_SIZE_KB = MAX_FILE_SIZE_MB * 1024;
const MAX_FILES = 90;

interface RepositoryDetails {
    sizeInKb: number;
    defaultBranch: string;
}

class ZipRepositoryService {
    /**
     * Busca os detalhes do repositório (tamanho e branch padrão)
     * @param url - URL do repositório GitHub
     * @returns Detalhes do repositório
     */
    private async getRepositoryDetails(
        url: string,
    ): Promise<RepositoryDetails> {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
        const token = process.env.GITHUB_TOKEN;

        const headers: Record<string, string> = {
            Accept: 'application/json',
        };

        // Adiciona o token de autenticação se disponível para aumentar o rate limit
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await axios.get(apiUrl, {
                headers,
            });

            return {
                sizeInKb: response.data.size,
                defaultBranch: response.data.default_branch ?? 'main',
            };
        } catch (err: any) {
            if (err.response?.status === 404) {
                throw new Error('Repository not found or not public');
            }

            throw new Error(
                `Failed to fetch repository details: ${err.response?.status ?? 'unknown'
                } ${err.response?.statusText ?? err.message}`,
            );
        }
    }

    /**
     * Baixa o arquivo ZIP do repositório
     * @param url - URL do repositório
     * @param outputFolder - Pasta de destino
     * @param defaultBranch - Branch padrão do repositório
     * @returns Caminho do arquivo ZIP baixado
     */
    private async downloadRepositoryZip({
        url,
        outputFolder,
        defaultBranch,
    }: {
        url: string;
        outputFolder: string;
        defaultBranch: string;
    }): Promise<string> {
        // Cria a pasta de destino se não existir
        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder, { recursive: true });
        }

        // Converte a URL do GitHub para URL de download do ZIP
        const zipUrl = `${url}/archive/refs/heads/${defaultBranch}.zip`;
        const zipPath = path.join(outputFolder, 'repo.zip');

        // Baixa o arquivo ZIP (apenas repositórios públicos são permitidos)
        const response = await axios.get(zipUrl, {
            responseType: 'stream',
            maxRedirects: 5,
            validateStatus: () => true,
        });

        await new Promise<void>((resolve, reject) => {
            const file = fs.createWriteStream(zipPath);

            response.data.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve();
            });

            file.on('error', (err) => {
                try {
                    fs.unlinkSync(zipPath);
                } catch {
                    // Ignora erros de remoção
                }
                reject(err);
            });
        });

        return zipPath;
    }

    /**
     * Extrai o arquivo ZIP do repositório
     * @param zipPath - Caminho do arquivo ZIP
     * @param outputFolder - Pasta de destino para extração
     */
    private async extractRepositoryZip({
        zipPath,
        outputFolder,
    }: {
        zipPath: string;
        outputFolder: string;
    }): Promise<void> {
        // Cria a pasta de destino se não existir
        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder, { recursive: true });
        }

        // Extrai o arquivo ZIP
        await decompress(zipPath, outputFolder, {
            strip: 1,
        });

        // Limpa o arquivo ZIP após extração (se ainda existir)
        try {
            if (fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
            }
        } catch (error) {
            console.warn('Could not delete ZIP file:', error);
        }
    }

    /**
     * Percorre recursivamente os arquivos do diretório e cria a estrutura de dados
     * @param dir - Diretório a percorrer
     * @param baseDir - Diretório base para calcular caminhos relativos
     * @param filesMap - Mapa de arquivos (acumulador)
     * @param fileCount - Contador de arquivos processados (acumulador)
     */
    private createFileMap(
        dir: string,
        baseDir: string,
        filesMap: Record<string, string>,
        fileCount: { count: number },
    ): void {
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const relativePath = path.relative(baseDir, fullPath);
            const stat = fs.statSync(fullPath);

            // Para diretórios
            if (stat.isDirectory()) {
                // Ignora pastas na blacklist usando isBlacklisted
                if (isBlacklisted(relativePath + '/')) {
                    continue;
                }

                // Continua recursivamente
                this.createFileMap(
                    fullPath,
                    baseDir,
                    filesMap,
                    fileCount,
                );
            } else {
                // Para arquivos
                // Ignora arquivos na blacklist
                if (isBlacklisted(relativePath)) {
                    continue;
                }

                // Limita o número de arquivos
                if (fileCount.count >= MAX_FILES) {
                    continue;
                }

                try {
                    // Lê o conteúdo do arquivo
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    filesMap[relativePath] = content;
                    fileCount.count += 1;
                } catch (error) {
                    // Ignora arquivos que não podem ser lidos como texto
                    console.warn(`Could not read file ${relativePath}:`, error);
                }
            }
        }
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
     * Busca dados do repositório baixando e extraindo o ZIP
     * Retorna a estrutura de diretórios e um mapa de arquivos
     * @returns Objeto com directoryStructure e filesMap, ou null em caso de erro
     */
    async getRepositoryData(): Promise<{
        directoryStructure: string;
        filesMap: Record<string, string>;
    } | null> {
        const tempFolder = path.join(process.cwd(), 'tmp');
        const repositoryFolder = path.join(tempFolder, randomUUID());

        try {
            // Busca detalhes do repositório
            const repoDetails = await this.getRepositoryDetails(GITHUB_URL);

            // Verifica o tamanho do repositório
            if (repoDetails.sizeInKb > MAX_REPO_SIZE_KB) {
                throw new Error(
                    `Repository size exceeds the maximum limit of ${MAX_FILE_SIZE_MB} MB. Repository size: ${(
                        repoDetails.sizeInKb / 1024
                    ).toFixed(2)} MB`,
                );
            }

            // Baixa o ZIP do repositório
            const zipPath = await this.downloadRepositoryZip({
                url: GITHUB_URL,
                outputFolder: tempFolder,
                defaultBranch: repoDetails.defaultBranch,
            });

            // Extrai o ZIP
            await this.extractRepositoryZip({
                zipPath,
                outputFolder: repositoryFolder,
            });

            // Cria o mapa de arquivos
            const filesMap: Record<string, string> = {};
            const fileCount = { count: 0 };

            // Percorre os arquivos recursivamente
            this.createFileMap(
                repositoryFolder,
                repositoryFolder,
                filesMap,
                fileCount,
            );

            // Gera a estrutura de diretórios a partir dos arquivos
            const directoryStructure = this.generateDirectoryStructure(
                Object.keys(filesMap),
            );

            return {
                directoryStructure,
                filesMap,
            };
        } catch (error) {
            console.error('Error fetching repository data:', error);
            return null;
        } finally {
            // Remove a pasta do repositório após ler os arquivos
            try {
                if (fs.existsSync(repositoryFolder)) {
                    fs.rmSync(repositoryFolder, { recursive: true, force: true });
                }
            } catch (error) {
                console.warn('Error cleaning up repository folder:', error);
            }

            // Remove o arquivo ZIP se ainda existir (caso de erro durante extração)
            try {
                const zipPath = path.join(tempFolder, 'repo.zip');
                if (fs.existsSync(zipPath)) {
                    fs.unlinkSync(zipPath);
                }
            } catch (error) {
                console.warn('Error cleaning up ZIP file:', error);
            }
        }
    }
}

export default new ZipRepositoryService();
