import { OrchestratedResults } from "../agent-orchestrator-service";

export const agentOrchestratorResult: OrchestratedResults = {
    "best_practices": {
      "categories": [
        {
          "title": "Qualidade de Código",
          "score": 75,
          "status": "PARTIAL",
          "keyEvidences": [
            "src/modules/clients/useCases/createClient/createClienteUseCase.ts:8 - Interface bem definida com tipos",
            "src/modules/clients/useCases/createClient/index.ts:1-12 - Bom uso de dependency injection",
            "src/server.ts:12-25 - Tratamento de erros global implementado"
          ],
          "mainIssues": [
            "src/modules/account/authenticateDeliveryman/AuthenticateDeliverymanUseCase.ts:22 - Chave JWT hardcoded no código",
            "src/modules/deliveryman/useCases/createDeliveryman/CreateDeliverymanUseCase.ts - Falta validação de dados com Zod",
            "src/modules/account/authenticateClient/AuthenticateClientUseCase.ts - Duplicação de código com authenticateDeliveryman"
          ],
          "recommendations": [
            "Implementar validação de dados com Zod em todos os casos de uso",
            "Extrair lógica de autenticação comum para uma classe base",
            "Mover chaves sensíveis para variáveis de ambiente"
          ]
        },
        {
          "title": "Organização e Estrutura",
          "score": 85,
          "status": "IMPLEMENTED",
          "keyEvidences": [
            "src/modules/clients/useCases/createClient/index.ts - Boa separação em módulos",
            "src/routes.ts - Rotas organizadas por domínio",
            "src/database/repositories - Implementação do Repository Pattern"
          ],
          "mainIssues": [
            "src/routes.ts - Arquivo muito extenso, pode ser dividido por domínio",
            "Falta um padrão consistente para organização de middlewares"
          ],
          "recommendations": [
            "Separar rotas em arquivos por domínio (clients.routes.ts, deliveryman.routes.ts, etc)",
            "Criar pasta específica para middlewares com index de exportação",
            "Padronizar estrutura de pastas dentro dos módulos"
          ]
        },
        {
          "title": "Documentação e Legibilidade",
          "score": 45,
          "status": "NOT_IMPLEMENTED",
          "keyEvidences": [
            "jest.config.ts - Bons comentários explicativos nas configurações"
          ],
          "mainIssues": [
            "Falta documentação JSDoc nas funções públicas",
            "Não há README com instruções de setup",
            "Falta .env.example para documentar variáveis de ambiente"
          ],
          "recommendations": [
            "Criar README.md com instruções de instalação e execução",
            "Adicionar JSDoc em todas as classes e métodos públicos",
            "Criar arquivo .env.example listando todas as variáveis necessárias",
            "Documentar regras de negócio complexas com comentários quando necessário"
          ]
        },
        {
          "title": "Testes",
          "score": 70,
          "status": "PARTIAL",
          "keyEvidences": [
            "src/modules/clients/useCases/createClient/createClient.spec.ts - Testes de sucesso e erro",
            "src/modules/clients/useCases/findClientDeliveries/FindClientDeliveries.spec.ts - Bom uso de mocks"
          ],
          "mainIssues": [
            "Cobertura de testes parece limitada a poucos módulos",
            "Falta testes para controllers e middlewares",
            "Não há configuração de cobertura mínima no Jest"
          ],
          "recommendations": [
            "Aumentar cobertura de testes para incluir controllers e middlewares",
            "Configurar thresholds de cobertura no jest.config.ts",
            "Adicionar testes de integração para fluxos completos",
            "Padronizar nomenclatura e estrutura dos arquivos de teste"
          ]
        },
        {
          "title": "Segurança (Boas Práticas)",
          "score": 65,
          "status": "PARTIAL",
          "keyEvidences": [
            "src/modules/deliveryman/useCases/createDeliveryman/CreateDeliverymanUseCase.ts:17 - Uso de hash para senhas",
            "src/server.ts:12 - Tratamento global de erros implementado"
          ],
          "mainIssues": [
            "src/modules/account/authenticateDeliveryman/AuthenticateDeliverymanUseCase.ts:22 - Chave JWT exposta no código",
            "Falta validação e sanitização consistente de inputs",
            "Falta rate limiting nas rotas de autenticação"
          ],
          "recommendations": [
            "Mover chaves JWT e outras configurações sensíveis para .env",
            "Implementar rate limiting nas rotas de autenticação",
            "Adicionar validação e sanitização de inputs com Zod",
            "Implementar logging de eventos de segurança"
          ]
        }
      ]
    },
    "functional_requirements": {
      "categories": [
        {
          "title": "Autenticação e Usuários",
          "score": 90,
          "status": "PARTIAL",
          "keyEvidences": [
            "src/modules/account/authenticateDeliveryman/AuthenticateDeliverymanUseCase.ts:1-40 - Autenticação de entregadores implementada com JWT",
            "src/modules/deliveryman/useCases/createDeliveryman/CreateDeliverymanUseCase.ts:1-35 - Cadastro de entregadores com hash de senha",
            "src/routes.ts:12-45 - Rotas de autenticação para clientes e entregadores"
          ],
          "mainIssues": [
            "Não foi encontrada implementação usando argon2 para hash de senhas (usa bcrypt)",
            "Código do cadastro de clientes não está completamente visível nos arquivos fornecidos"
          ],
          "recommendations": [
            "Migrar hash de senhas de bcrypt para argon2 conforme especificação",
            "Verificar implementação completa do cadastro de clientes"
          ]
        },
        {
          "title": "Gestão de Entregas",
          "score": 95,
          "status": "IMPLEMENTED",
          "keyEvidences": [
            "src/modules/deliveries/useCases/createDelivery/CreateDeliveryController.ts:1-20 - Criação de entregas",
            "src/modules/clients/useCases/findClientDeliveries/FindClientDeliveriesController.ts:1-25 - Visualização de entregas por cliente",
            "src/modules/deliveryman/useCases/findAllDeliveries/FindAllDeliveriesController.ts:1-20 - Visualização de entregas por entregador",
            "prisma/migrations/20220819214400_create_deliveries_table/migration.sql:1-20 - Estrutura de dados com created_at"
          ],
          "mainIssues": [
            "Não foi encontrada implementação do registro de foto no momento da entrega"
          ],
          "recommendations": [
            "Implementar funcionalidade de upload e armazenamento de foto no momento da conclusão da entrega"
          ]
        },
        {
          "title": "Regras de Negócio",
          "score": 85,
          "status": "PARTIAL",
          "keyEvidences": [
            "src/modules/deliveryman/useCases/createDeliveryman/CreateDeliverymanUseCase.ts:13-25 - Validação de username duplicado",
            "src/routes.ts:30-40 - Middleware de autenticação para rotas protegidas",
            "src/modules/account/authenticateDeliveryman/AuthenticateDeliverymanUseCase.ts:1-40 - Senhas armazenadas com hash"
          ],
          "mainIssues": [
            "Não foi encontrada implementação de avaliação de entregadores",
            "Não foi encontrada implementação de localização em tempo real"
          ],
          "recommendations": [
            "Implementar sistema de avaliação de entregadores pelos clientes",
            "Implementar tracking de localização em tempo real dos entregadores"
          ]
        },
        {
          "title": "Notificações",
          "score": 100,
          "status": "IMPLEMENTED",
          "keyEvidences": [
            "src/kafka/producer.ts:1-45 - Implementação do producer Kafka",
            "src/modules/deliveryman/useCases/createDeliveryman/CreateDeliverymanController.ts:15-20 - Envio de notificação ao criar entregador"
          ],
          "mainIssues": [],
          "recommendations": [
            "Considerar adicionar mais tipos de notificações para outros eventos do sistema"
          ]
        },
        {
          "title": "Validações e Tratamento de Erros",
          "score": 75,
          "status": "PARTIAL",
          "keyEvidences": [
            "src/modules/deliveryman/useCases/createDeliveryman/CreateDeliverymanUseCase.ts:15-20 - Validação de username duplicado",
            "src/modules/account/authenticateDeliveryman/AuthenticateDeliverymanUseCase.ts:20-25 - Tratamento de erro em autenticação"
          ],
          "mainIssues": [
            "Falta validação mais robusta dos dados de entrada",
            "Tratamento de erros assíncronos não está padronizado",
            "Mensagens de erro poderiam ser mais específicas e estruturadas"
          ],
          "recommendations": [
            "Implementar middleware de validação de dados de entrada",
            "Criar classe/estrutura centralizada para tratamento de erros",
            "Padronizar formato das mensagens de erro"
          ]
        }
      ]
    },
    "non_functional_requirements": {
      "categories": [
        {
          "title": "Segurança (Não Funcional)",
          "score": 75,
          "status": "PARTIAL",
          "keyEvidences": [
            "package.json:23 - Uso do bcrypt para hash de senhas",
            "package.json:26 - JWT para autenticação",
            "src/modules/account/authenticateClient/AuthenticateClientUseCase.ts:24 - Implementação de comparação segura de senhas",
            "src/middlewares/ensureAuthClient.ts - Middleware de autenticação JWT"
          ],
          "mainIssues": [
            "Secret key do JWT está hardcoded no código",
            "Não há implementação de variáveis de ambiente (.env)",
            "Não utiliza argon2 conforme especificado",
            "Falta sanitização explícita das entradas de usuário"
          ],
          "recommendations": [
            "Mover secret key do JWT para variável de ambiente",
            "Implementar argon2 para hash de senhas no lugar do bcrypt",
            "Adicionar middleware de sanitização de entrada",
            "Criar arquivo .env com as configurações sensíveis"
          ]
        },
        {
          "title": "Confiabilidade e Tratamento de Erros",
          "score": 85,
          "status": "IMPLEMENTED",
          "keyEvidences": [
            "package.json:24 - express-async-errors para tratamento de erros assíncronos",
            "src/server.ts:12 - Middleware global de tratamento de erros",
            "src/modules/clients/useCases/createClient/createClient.spec.ts - Testes de casos de erro"
          ],
          "mainIssues": [
            "Mensagens de erro poderiam ser mais descritivas em alguns casos",
            "Falta logging estruturado de erros"
          ],
          "recommendations": [
            "Implementar sistema de logging estruturado",
            "Padronizar formato e detalhamento das mensagens de erro",
            "Adicionar mais testes de casos de erro"
          ]
        },
        {
          "title": "Performance e Escalabilidade",
          "score": 70,
          "status": "PARTIAL",
          "keyEvidences": [
            "package.json:26 - Uso do Kafka para processamento assíncrono",
            "prisma/schema.prisma - Uso de banco relacional com índices",
            "src/modules/deliveryman/useCases/createDeliveryman/CreateDeliverymanController.ts:15 - Processamento assíncrono de notificações"
          ],
          "mainIssues": [
            "Falta implementação de cache",
            "Não há estratégia clara para lidar com concorrência",
            "Falta controle de rate limiting"
          ],
          "recommendations": [
            "Implementar sistema de cache (Redis)",
            "Adicionar mecanismos de rate limiting",
            "Implementar locks para operações críticas"
          ]
        },
        {
          "title": "Manutenibilidade e Arquitetura",
          "score": 90,
          "status": "IMPLEMENTED",
          "keyEvidences": [
            "src/modules/* - Arquitetura modular por domínio",
            "src/modules/*/useCases/* - Separação clara de casos de uso",
            "src/database/repositories/* - Padrão repository implementado",
            "src/modules/*/index.ts - Injeção de dependências"
          ],
          "mainIssues": [
            "Algumas configurações ainda estão hardcoded",
            "Falta documentação de arquitetura"
          ],
          "recommendations": [
            "Criar documentação da arquitetura",
            "Extrair configurações para arquivo centralizado",
            "Adicionar comentários em partes complexas do código"
          ]
        },
        {
          "title": "Testabilidade",
          "score": 85,
          "status": "IMPLEMENTED",
          "keyEvidences": [
            "package.json:15,16 - Jest configurado para testes",
            "jest.config.ts - Configuração detalhada do ambiente de testes",
            "src/tests/inMemoryDatabases/* - Repositories em memória para testes",
            "src/modules/*/useCases/*/*.spec.ts - Testes unitários implementados"
          ],
          "mainIssues": [
            "Cobertura de testes pode ser ampliada",
            "Faltam testes de integração"
          ],
          "recommendations": [
            "Implementar testes de integração",
            "Aumentar cobertura de testes unitários",
            "Adicionar testes e2e"
          ]
        }
      ]
    },
    "metadata": {
      "processedCategories": [
        "best_practices",
        "functional_requirements",
        "non_functional_requirements"
      ],
      "totalFilesAnalyzed": 35,
      "processingTimeMs": 34389
    }
}