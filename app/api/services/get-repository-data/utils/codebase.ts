export function createRepositoryFileRegex() {
  return new RegExp(
    /-{80}\n\/([^\n:]+):\n-{80}\n\n```[^\n]*\n([\s\S]*?)\n```/g,
  );
}

export function decodeCloudflareEmail(encodedString: string) {
  if (!encodedString || encodedString.length < 2) {
    throw new Error('Invalid encoded email string');
  }

  const key = parseInt(encodedString.substring(0, 2), 16);
  let decoded = '';

  for (let i = 2; i < encodedString.length; i += 2) {
    const byte = parseInt(encodedString.substring(i, i + 2), 16);
    // eslint-disable-next-line no-bitwise
    decoded += String.fromCharCode(byte ^ key);
  }

  return decoded;
}

export function cleanCloudflareEmailProtection(content: string) {
    if (!content || typeof content !== 'string') {
      return content;
    }

    let cleaned = content;

    // Check if content contains Cloudflare email protection
    if (cleaned.includes('__cf_email__') || cleaned.includes('data-cfemail')) {

      // Remove email protection links: <a href="/cdn-cgi/l/email-protection" ...>...</a>
      cleaned = cleaned.replace(
        /<a\s+href="\/cdn-cgi\/l\/email-protection"[^>]*>.*?<\/a>/g,
        '[EMAIL_PROTECTED]',
      );

      // Remove escaped email protection artifacts: [email&#160;protected]
      cleaned = cleaned.replace(
        /\[email&#160;protected\]/g,
        '[EMAIL_PROTECTED]',
      );

      // Decode data-cfemail attributes if present
      const cfEmailRegex = /data-cfemail="([a-f0-9]+)"/gi;
      let match = cfEmailRegex.exec(cleaned);

      while (match !== null) {
        const encodedEmail = match[1];
        try {
          const decodedEmail = decodeCloudflareEmail(encodedEmail);
          // Replace the entire link with decoded email
          cleaned = cleaned.replace(
            new RegExp(
              `<a\\s+href="/cdn-cgi/l/email-protection"[^>]*data-cfemail="${encodedEmail}"[^>]*>.*?</a>`,
              'g',
            ),
            decodedEmail,
          );
        } catch (error) {
          // Replace with placeholder to prevent re-matching
          cleaned = cleaned.replace(
            new RegExp(
              `<a\\s+href="/cdn-cgi/l/email-protection"[^>]*data-cfemail="${encodedEmail}"[^>]*>.*?</a>`,
              'g',
            ),
            '[EMAIL_DECODE_FAILED]',
          );
        }
        match = cfEmailRegex.exec(cleaned);
      }
    }

    return cleaned;
  }

/**
 * Sanitizes AI-generated text to prevent markdown/XSS injection
 * Removes HTML tags, links, and images from AI-generated content
 *
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text safe for markdown injection
 */
export function sanitizeMarkdownText(text: string) {
  if (!text) return '';

  return text
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Remove links, keep text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '') // Remove images
    .trim();
}

export function MARKDOWN_IMAGE_REGEX() {
  return /!\[([^\]]*)\]\(([^)]+)\)/g;
}

export function DIRECTORY_STRUCTURE_REGEX() {
  return /# Directory Structure\s*\n\s*```\s*\n([\s\S]*?)\n```/;
}

export function PAGE_NUMBER_REGEX() {
  return /(\d+)\/(\d+)\s+(?:files?|pages?)/i;
}

export const BLACKLISTED_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.webp',
  '.bmp',
  '.mp4',
  '.mp3',
  '.wav',
  '.avi',
  '.mov',
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
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  '.lock',
  '.min.js',
  '.min.css',
  '.map',
];

// Pastas que devem ser ignoradas
export const BLACKLISTED_FOLDERS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'coverage',
  '.cache',
  '.turbo',
  '.vercel',
  '.output',
  'out',
  '__pycache__',
  '.pytest_cache',
  'vendor',
];

// Arquivos específicos que devem ser ignorados
export const BLACKLISTED_FILES = [
  '.gitignore',
  '.gitattributes',
  'next-env.d.ts',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
  'Thumbs.db',
  'migration_lock.toml'
];

export function isBlacklisted(filepath: string): boolean {
  const lowerPath = filepath.toLowerCase();
  const filename = filepath.split('/').pop() || '';
  
  // Verifica se está dentro de uma pasta na blacklist
  const isInBlacklistedFolder = BLACKLISTED_FOLDERS.some(folder => {
    const folderPattern = `/${folder.toLowerCase()}/`;
    return lowerPath.includes(folderPattern) || lowerPath.startsWith(`${folder.toLowerCase()}/`);
  });
  
  if (isInBlacklistedFolder) return true;
  
  // Verifica se é um arquivo específico na blacklist
  if (BLACKLISTED_FILES.some(file => filename.toLowerCase() === file.toLowerCase())) {
    return true;
  }
  
  // Verifica se a extensão está na blacklist
  return BLACKLISTED_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
}