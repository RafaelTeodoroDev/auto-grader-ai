import * as path from 'path';
import { isBlacklisted } from '../utils/codebase';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface LanguageStat {
    language: string;
    percentage: number;
    fileCount: number;
}

interface FileSummary {
    path: string;
    size: number;
    type: 'source' | 'test' | 'config' | 'infra' | 'schema';
    summary: {
        head: string;
        imports: string[];
        body_sample: string;
    };
}

interface StaticAnalysisResult {
    filteredFilesMap: Record<string, string>;
    filesContentSummary: FileSummary[];
    detectedLanguages: LanguageStat[];
    stats: {
        totalFiles: number;
        filteredFiles: number;
        binaryFilesSkipped: number;
        byType: {
            source: number;
            test: number;
            config: number;
            infra: number;
            schema: number;
        };
    };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Stack-specific blacklist patterns
 * Applied in addition to the existing blacklist from codebase.ts
 */
const STACK_BLACKLISTS: Record<string, string[]> = {
    javascript: [
        'node_modules',
        '.next',
        'out',
        'dist',
        'build',
        '.turbo',
        'coverage',
        '.nuxt',
        '.output',
    ],
    typescript: [
        'node_modules',
        '.next',
        'out',
        'dist',
        'build',
        '.turbo',
        'coverage',
    ],
    python: [
        '__pycache__',
        '.venv',
        'venv',
        'env',
        '.pytest_cache',
        '.mypy_cache',
        'site-packages',
        '.tox',
        'eggs',
        '.eggs',
    ],
    java: ['target', '.gradle', 'build', '.idea', '.mvn', 'out', 'bin'],
    csharp: ['bin', 'obj', 'packages', '.vs', 'Debug', 'Release'],
    ruby: ['vendor', '.bundle', 'tmp', 'log', 'coverage'],
    go: ['vendor', 'bin', 'pkg'],
    rust: ['target'],
    php: ['vendor', 'node_modules', 'cache'],
};

/**
 * Binary file extensions to exclude from summaries
 */
const BINARY_EXTENSIONS = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.ico',
    '.svg',
    '.webp',
    '.pdf',
    '.zip',
    '.tar',
    '.gz',
    '.rar',
    '.7z',
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.mp4',
    '.mov',
    '.avi',
    '.mp3',
    '.wav',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.bin',
    '.dat',
    '.db',
    '.sqlite',
];

/**
 * Extension to language mapping
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.php': 'php',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.cxx': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.hxx': 'cpp',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.kts': 'kotlin',
    '.scala': 'scala',
    '.clj': 'clojure',
    '.ex': 'elixir',
    '.exs': 'elixir',
    '.erl': 'erlang',
    '.hrl': 'erlang',
    '.lua': 'lua',
    '.r': 'r',
    '.R': 'r',
    '.jl': 'julia',
    '.dart': 'dart',
    '.vue': 'vue',
    '.svelte': 'svelte',
};

/**
 * Language-specific import patterns
 */
const IMPORT_PATTERNS: Record<string, RegExp[]> = {
    javascript: [
        /^import\s+.+from\s+['"].+['"]/gm,
        /^import\s+['"].+['"]/gm,
        /^const\s+.+=\s*require\(['"].+['"]\)/gm,
        /^export\s+{.+}\s+from\s+['"].+['"]/gm,
    ],
    typescript: [
        /^import\s+.+from\s+['"].+['"]/gm,
        /^import\s+type\s+.+from\s+['"].+['"]/gm,
        /^import\s+['"].+['"]/gm,
    ],
    python: [/^from\s+\S+\s+import\s+.+/gm, /^import\s+\S+/gm],
    java: [/^import\s+[\w.]+;/gm, /^import\s+static\s+[\w.]+;/gm],
    csharp: [/^using\s+[\w.]+;/gm, /^using\s+static\s+[\w.]+;/gm],
    ruby: [
        /^require\s+['"].+['"]/gm,
        /^require_relative\s+['"].+['"]/gm,
    ],
    go: [/^import\s+"[^"]+"/gm, /^import\s+\(/gm],
    rust: [/^use\s+.+;/gm, /^extern\s+crate\s+.+;/gm],
    php: [
        /^use\s+[\w\\]+;/gm,
        /^require\s+['"].+['"]/gm,
        /^include\s+['"].+['"]/gm,
    ],
};

/**
 * Dynamic content extraction percentages
 */
const HEAD_PERCENTAGE = 0.15; // First 15% of file
const MIN_HEAD_LINES = 10;
const MAX_HEAD_LINES = 30;

const CONTENT_CHUNK_PERCENTAGE = 0.25; // 25% of file content
const MIN_CHUNK_LINES = 15;
const MAX_CHUNK_LINES = 50;

// ============================================================================
// SERVICE CLASS
// ============================================================================

class StaticRepoAnalyzer {
    /**
     * Main analysis method
     * Receives repository data and generates a comprehensive static analysis
     */
    analyze(repositoryData: {
        directoryStructure: string;
        filesMap: Record<string, string>;
    } | null): StaticAnalysisResult | null {
        if (!repositoryData) {
            console.warn('No repository data provided to analyzer');
            return null;
        }

        const { filesMap, directoryStructure } = repositoryData;

        // Step 1: Detect languages
        const detectedLanguages = this.detectLanguages(filesMap);

        // Step 2: Build combined blacklist
        const stackBlacklists = this.getStackBlacklists(detectedLanguages);

        // Step 3: Filter files by stack and binary check
        const { filteredFilesMap, binaryFilesSkipped } = this.filterFilesByStack(
            filesMap,
            stackBlacklists,
        );

        // Step 4: Generate file summaries
        const filesContentSummary = this.generateFileSummaries(
            filteredFilesMap,
            detectedLanguages,
        );

        // Step 5: Calculate statistics
        const stats = this.calculateStats(
            Object.keys(filesMap).length,
            filesContentSummary,
            binaryFilesSkipped,
        );

        return {
            filteredFilesMap,
            filesContentSummary,
            detectedLanguages,
            stats,
        };
    }

    /**
     * Detect languages used in the repository based on file extensions
     * Returns array of languages with file count and percentage
     */
    private detectLanguages(filesMap: Record<string, string>): LanguageStat[] {
        const languageCounts: Record<string, number> = {};
        const filePaths = Object.keys(filesMap);
        const totalFiles = filePaths.length;

        // Count files by language
        filePaths.forEach((filePath) => {
            const language = this.detectLanguageFromExtension(filePath);
            if (language) {
                languageCounts[language] = (languageCounts[language] || 0) + 1;
            }
        });

        // Convert to array with percentages
        const languageStats: LanguageStat[] = Object.entries(languageCounts)
            .map(([language, fileCount]) => ({
                language,
                fileCount,
                percentage: parseFloat(((fileCount / totalFiles) * 100).toFixed(1)),
            }))
            .sort((a, b) => b.fileCount - a.fileCount); // Sort by file count descending

        return languageStats;
    }

    /**
     * Detect language from file extension
     */
    private detectLanguageFromExtension(filePath: string): string | null {
        const ext = path.extname(filePath).toLowerCase();
        return EXTENSION_TO_LANGUAGE[ext] || null;
    }

    /**
     * Build combined blacklist for detected languages
     */
    private getStackBlacklists(languages: LanguageStat[]): string[] {
        const blacklistSet = new Set<string>();

        // Add stack-specific blacklists for detected languages
        languages.forEach((lang) => {
            const stackBlacklist = STACK_BLACKLISTS[lang.language];
            if (stackBlacklist) {
                stackBlacklist.forEach((pattern) => blacklistSet.add(pattern));
            }
        });

        return Array.from(blacklistSet);
    }

    /**
     * Filter files by stack blacklist and binary detection
     */
    private filterFilesByStack(
        filesMap: Record<string, string>,
        stackBlacklists: string[],
    ): { filteredFilesMap: Record<string, string>; binaryFilesSkipped: number } {
        const filteredFilesMap: Record<string, string> = {};
        let binaryFilesSkipped = 0;

        Object.entries(filesMap).forEach(([filePath, content]) => {
            // Check if file matches stack blacklist
            const isStackBlacklisted = stackBlacklists.some((pattern) => {
                return (
                    filePath.includes(pattern + '/') ||
                    filePath.includes('/' + pattern + '/') ||
                    filePath.startsWith(pattern + '/')
                );
            });

            // Check existing blacklist from codebase.ts
            const isCodebaseBlacklisted = isBlacklisted(filePath);

            // Check if binary
            const isBinary = this.isBinaryFile(filePath, content);

            if (isBinary) {
                binaryFilesSkipped++;
            }

            // Include file if not blacklisted and not binary
            if (!isStackBlacklisted && !isCodebaseBlacklisted && !isBinary) {
                filteredFilesMap[filePath] = content;
            }
        });

        return { filteredFilesMap, binaryFilesSkipped };
    }

    /**
     * Check if file is binary
     */
    private isBinaryFile(filePath: string, content: string): boolean {
        // Check extension first (fast)
        const ext = path.extname(filePath).toLowerCase();
        if (BINARY_EXTENSIONS.includes(ext)) {
            return true;
        }

        // Check for null bytes (binary indicator)
        if (content.includes('\0')) {
            return true;
        }

        // Check for high ratio of non-printable characters
        const nonPrintable = content.split('').filter((char) => {
            const code = char.charCodeAt(0);
            return code < 32 && code !== 9 && code !== 10 && code !== 13;
        }).length;

        const ratio = content.length > 0 ? nonPrintable / content.length : 0;
        return ratio > 0.3; // More than 30% non-printable = binary
    }

    /**
     * Generate file summaries for all filtered files
     */
    private generateFileSummaries(
        filteredFilesMap: Record<string, string>,
        detectedLanguages: LanguageStat[],
    ): FileSummary[] {
        const summaries: FileSummary[] = [];

        Object.entries(filteredFilesMap).forEach(([filePath, content]) => {
            const fileType = this.detectFileType(filePath);
            const language = this.detectLanguageFromExtension(filePath);
            const lines = content.split('\n');
            const fileSize = content.length;

            // Extract head
            const head = this.extractFileHead(lines, lines.length);

            // Extract imports
            const imports = this.extractImports(content, language);

            // Find last import line
            const lastImportLine = this.findLastImportLine(lines, imports);

            // Extract content chunk
            const contentChunk = this.extractContentChunk(
                lines,
                lines.length,
                lastImportLine,
            );

            summaries.push({
                path: filePath,
                size: fileSize,
                type: fileType,
                summary: {
                    head,
                    imports,
                    body_sample: contentChunk,
                },
            });
        });

        return summaries;
    }

    /**
     * Detect file type based on path patterns
     */
    private detectFileType(filePath: string): 'source' | 'test' | 'config' | 'infra' | 'schema' {
        if (filePath.match(/test|spec|__tests__|\.test\.|\.spec\./i)) {
            return 'test';
        }
        if (filePath.match(/schema|\.schema\.|migration|migrate|prisma\/schema|drizzle|\.sql$/i)) {
            return 'schema';
        }
        if (
            filePath.match(
                /docker|dockerfile|\.docker|kubernetes|k8s|terraform|\.tf$|ansible|playbook|helm|deploy|infra|infrastructure/i,
            )
        ) {
            return 'infra';
        }
        if (
            filePath.match(
                /config|\.config\.|\.env|\.yml|\.yaml|\.toml|\.ini|\.json$/i,
            )
        ) {
            return 'config';
        }
        return 'source';
    }

    /**
     * Extract the head (first portion) of the file
     * Uses dynamic sizing based on file length
     */
    private extractFileHead(lines: string[], totalLines: number): string {
        const headLines = Math.max(
            MIN_HEAD_LINES,
            Math.min(MAX_HEAD_LINES, Math.floor(totalLines * HEAD_PERCENTAGE)),
        );

        return lines.slice(0, headLines).join('\n');
    }

    /**
     * Extract import statements based on language
     */
    private extractImports(content: string, language: string | null): string[] {
        if (!language) {
            return [];
        }

        const patterns = IMPORT_PATTERNS[language] || [];
        const imports: string[] = [];

        patterns.forEach((pattern) => {
            const matches = content.match(pattern);
            if (matches) {
                imports.push(...matches);
            }
        });

        // Remove duplicates
        return Array.from(new Set(imports));
    }

    /**
     * Find the line number of the last import statement
     */
    private findLastImportLine(lines: string[], imports: string[]): number {
        if (imports.length === 0) {
            return 0;
        }

        let lastImportLine = 0;

        imports.forEach((importStatement) => {
            const normalizedImport = importStatement.trim();
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim() === normalizedImport) {
                    lastImportLine = Math.max(lastImportLine, i);
                }
            }
        });

        return lastImportLine;
    }

    /**
     * Extract content chunk after imports
     * Skips blank lines and uses dynamic sizing
     */
    private extractContentChunk(
        lines: string[],
        totalLines: number,
        lastImportLine: number,
    ): string {
        const chunkLines = Math.max(
            MIN_CHUNK_LINES,
            Math.min(
                MAX_CHUNK_LINES,
                Math.floor(totalLines * CONTENT_CHUNK_PERCENTAGE),
            ),
        );

        // Start after last import, skip blank lines
        let startLine = lastImportLine + 1;
        while (startLine < lines.length && lines[startLine].trim() === '') {
            startLine++;
        }

        // Extract chunk
        const endLine = Math.min(startLine + chunkLines, lines.length);
        return lines.slice(startLine, endLine).join('\n');
    }

    /**
     * Calculate statistics about the analysis
     */
    private calculateStats(
        totalFiles: number,
        filesContentSummary: FileSummary[],
        binaryFilesSkipped: number,
    ): StaticAnalysisResult['stats'] {
        const byType = {
            source: 0,
            test: 0,
            config: 0,
            infra: 0,
            schema: 0,
        };

        filesContentSummary.forEach((summary) => {
            byType[summary.type]++;
        });

        return {
            totalFiles,
            filteredFiles: filesContentSummary.length,
            binaryFilesSkipped,
            byType,
        };
    }
}

export default new StaticRepoAnalyzer();
