export const helpDeskProject = {
    title: "HelpDesk",
    slug: "desafio-pratico-help-desk",
    description: "Neste desafio, vamos desenvolver um Sistema de Gerenciamento de Chamados. Você deverá construir uma aplicação de ponta a ponta com front-end e back-end, utilizando as tecnologias aprendidas na formação Full-Stack, simulando um aplicativo de gerenciamento de chamados com painel de Administrador, Técnico e Cliente.",
    instruction_detail: {
        best_praticies:
            `
            ### 1. Requisitos de Boas Práticas

            #### Qualidade de Código
            - Utilizar const e let, nunca var ;
            - Nomenclatura clara e consistente para variáveis, funções e classes;
            - Funções pequenas e com responsabilidade única(Single Responsibility Principle);
            - Código sem duplicação(DRY - Don't Repeat Yourself);
            - Uso adequado de tipos do TypeScript em todo o código;
            - Tratamento adequado de erros com try/catch e mensagens descritivas;
            - Validação de dados de entrada com Zod;

            #### Organização e Estrutura
            - Organização clara de imports(bibliotecas externas, internas, tipos);
            - Separação de responsabilidades(controllers, services, repositories);
            - Uso de patterns adequados(Repository Pattern, Service Layer);
            - Configurações em arquivos separados(não hardcoded);

            #### Documentação e Legibilidade
            - Comentários em código complexo quando necessário;
            - README detalhado com instruções de instalação e execução;
            - Documentação de variáveis de ambiente(.env.example);
            - JSDoc em funções públicas importantes;

            #### Testes
            - Cobertura de testes unitários com Jest;
            - Testes de casos de sucesso e erro;
            - Mocks adequados para dependências externas;

            #### Segurança
            - Senhas armazenadas com hash(bcrypt);
            - Validação e sanitização de inputs;
            - Proteção contra SQL Injection(uso de ORM / Query Builder);
            - Tokens JWT com expiração adequada;
            - Variáveis sensíveis em.env(nunca commitadas);

            ---`,
        functional_requirements:
            `

            ### Requisitos Funcionais

            #### Autenticação e Usuários
            1. O sistema deve permitir o cadastro de clientes com username e senha
            2. O sistema deve permitir o cadastro de entregadores (deliveryman) com username e senha
            3. O sistema deve autenticar clientes através de username e senha
            4. O sistema deve autenticar entregadores através de username e senha
            5. O sistema deve utilizar a biblioteca argon2 para hash de senhas

            #### Gestão de Entregas
            6. Clientes devem poder criar novas entregas especificando o nome do item
            7. Clientes devem poder visualizar suas próprias entregas
            8. Entregadores devem poder visualizar entregas disponíveis
            9. Entregadores devem poder aceitar entregas disponíveis
            10. Entregadores devem poder visualizar suas entregas aceitas
            11. Entregadores devem poder marcar entregas como concluídas
            12. O sistema deve registrar data/hora de criação das entregas
            13. O sistema deve registrar uma foto do momento da entrega
            

            #### Regras de Negócio
            14. Não deve permitir cadastro de usernames duplicados para clientes
            15. Não deve permitir cadastro de usernames duplicados para entregadores
            16. Senhas devem ser armazenadas criptografadas
            17. Apenas entregadores autenticados podem visualizar entregas disponíveis
            18. Apenas clientes autenticados podem criar entregas
            19. Entregadores devem poder serem avaliados pelos clientes
            20. Mostrar localização do entregador em tempo real para o cliente

            #### Notificações
            21. O sistema deve enviar notificações via Kafka quando novos entregadores são cadastrados


            #### Validações e Tratamento de Erros
            22. O sistema deve validar dados de entrada
            23. O sistema deve retornar mensagens de erro apropriadas
            24. O sistema deve tratar erros assíncronos

            Esta lista foi elaborada analisando os endpoints disponíveis, middlewares de autenticação e casos de uso implementados no código`
    },
}
