import { cleanCloudflareEmailProtection, createRepositoryFileRegex, DIRECTORY_STRUCTURE_REGEX, isBlacklisted, PAGE_NUMBER_REGEX } from "./utils/codebase";
import axios from 'axios';

const owner = 'RafaelTeodoroDev';
const repo = 'node-entregas';
const encodedOwner = encodeURIComponent(owner);
const encodedRepo = encodeURIComponent(repo);
const apiUrl = `https://codebase.md/${encodedOwner}/${encodedRepo}?max_tokens=50000`;
const headers = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
};

class CodebaseService {
    async getRepositoryData() {
        const firstPageUrl = `${apiUrl}?page=1`;
        const firstPageResponse = await axios.get(firstPageUrl, {
            headers,
            timeout: 30000,
        });

        if (firstPageResponse.status !== 200) {
            return null;
        }

        const firstPageContent = cleanCloudflareEmailProtection(
            firstPageResponse.data,
        );

        // Extract total pages from content (e.g., "page 1/4")
        const pageMatch = firstPageContent.match(PAGE_NUMBER_REGEX());
        const totalPages = pageMatch ? parseInt(pageMatch[1], 10) : 1;

        // Fetch all pages
        const allContent = [firstPageContent];

        // Fetch remaining pages in parallel
        if (totalPages > 1) {
            const pagePromises = [];
            for (let page = 2; page <= totalPages; page += 1) {
                const pageUrl = `${apiUrl}?page=${page}`;
                pagePromises.push(
                    axios
                        .get(pageUrl, { headers, timeout: 30000 })
                        .then((res) => (res.status === 200 ? res.data : null))
                        .catch(() => null),
                );
            }

            const pageResults = await Promise.all(pagePromises);
            pageResults.forEach((result) => {
                if (result) {
                    allContent.push(cleanCloudflareEmailProtection(result));
                }
            });
        }

        // Extract directory structure from first page
        const directoryMatch = firstPageContent.match(
            DIRECTORY_STRUCTURE_REGEX(),
        );
        const directoryStructure = directoryMatch ? directoryMatch[1].trim() : '';

        // Extract files from all pages (with memory limit)
        const filesMap = new Map();
        let fileCount = 0;

        allContent.forEach((content, index) => {
            // Create fresh regex instance to avoid lastIndex state issues
            const fileRegex = createRepositoryFileRegex();
            let regexMatch = fileRegex.exec(content);

            while (regexMatch !== null && fileCount < 90) {
                const filename = regexMatch[1];
                const fileContent = regexMatch[2];

                // Ignora arquivos com extensões na blacklist
                if (!isBlacklisted(filename)) {
                    filesMap.set(filename, fileContent);
                    fileCount += 1;
                }
                regexMatch = fileRegex.exec(content);
            }
        });

        return {
            directoryStructure,
            filesMap: Object.fromEntries(filesMap),
        }
    }
}

export default new CodebaseService();