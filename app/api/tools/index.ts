import { checkBestPractices } from './best-practices-tool';
import { checkFunctionalRequirements } from './functional-requirements-tool';

/**
 * Orquestrador de tools para análise de código
 * 
 * Tools disponíveis:
 * - checkBestPractices: Analisa boas práticas de código
 * - checkFunctionalRequirements: Analisa implementação de requisitos funcionais
 */

// Exportar todas as tools
export const tools = {
  checkBestPractices,
  checkFunctionalRequirements,
};

// Exportar individualmente para uso direto
export { checkBestPractices, checkFunctionalRequirements };