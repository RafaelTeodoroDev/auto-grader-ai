export const helpDeskProject = {
    title: "HelpDesk",
    slug: "desafio-pratico-help-desk",
    description: "Neste desafio, vamos desenvolver um Sistema de Gerenciamento de Chamados. Você deverá construir uma aplicação de ponta a ponta com front-end e back-end, utilizando as tecnologias aprendidas na formação Full-Stack, simulando um aplicativo de gerenciamento de chamados com painel de Administrador, Técnico e Cliente.",
//     instruction_detail_markdown: `
//     # Descrição requisitos do backend
    
//     ## Funcionalidades e Regras

// <aside>
// ⚠️

// Para esse desafio é esperado que você utilize o banco de dados Postgres.

// </aside>

// - [ ]  Deve ser possível criar um link
//     - [ ]  Não deve ser possível criar um link com URL encurtada mal formatada
//     - [ ]  Não deve ser possível criar um link com URL encurtada já existente
// - [ ]  Deve ser possível deletar um link
// - [ ]  Deve ser possível obter a URL original por meio de uma URL encurtada
// - [ ]  Deve ser possível listar todas as URL’s cadastradas
// - [ ]  Deve ser possível incrementar a quantidade de acessos de um link
// - [ ]  Deve ser possível exportar os links criados em um CSV
//     - [ ]  Deve ser possível acessar o CSV por meio de uma CDN (Amazon S3, Cloudflare R2, etc)
//     - [ ]  Deve ser gerado um nome aleatório e único para o arquivo
//     - [ ]  Deve ser possível realizar a listagem de forma performática
//     - [ ]  O CSV deve ter campos como, URL original, URL encurtada, contagem de acessos e data de criação.

//     ## Ferramentas

// É obrigatório o uso de:

// - TypeScript
// - Fastify
// - Drizzle
// - Postgres

// ## Variáveis ambiente

// Todo projeto tem diversas configurações de variáveis que devem ser diferentes de acordo com o ambiente que ele é executado. Para isso, importante sabermos, de forma fácil e intuitiva, quais variáveis são essas. Então é obrigatório que esse projeto tenha um arquivo '.env.example' com as chaves necessárias.

// \`\`\`
// PORT=
// DATABASE_URL=

// CLOUDFLARE_ACCOUNT_ID=""
// CLOUDFLARE_ACCESS_KEY_ID=""
// CLOUDFLARE_SECRET_ACCESS_KEY=""
// CLOUDFLARE_BUCKET=""
// CLOUDFLARE_PUBLIC_URL=""
// \`\`\`

// ## Scripts

// Crie um script com a exata chave 'db:migrate' responsável por executar as migrations do banco de dados.

// ## Docker

// Para esse projeto back-end você deve construir um 'Dockerfile', seguindo as boas práticas, que deve ser responsável por gerar a imagem da aplicação.

// ## Dicas

// - Não se esqueça de habilitar o CORS na aplicação.
// - Em caso de dúvidas, utilize o espaço da comunidade e do nosso fórum para interagir com outros alunos/instrutores e encontrar uma solução que funcione para você.

// ---

// # Descrição requisitos do frontend

// Nesse projeto front-end será desenvolvido uma aplicação React que, em conjunto com a API, permite o gerenciamento de URL’s encurtadas. 

// ## Funcionalidades e Regras

// Assim como na API, temos as seguintes funcionalidades e regras:

// - [ ]  Deve ser possível criar um link
//     - [ ]  Não deve ser possível criar um link com encurtamento mal formatado
//     - [ ]  Não deve ser possível criar um link com encurtamento já existente
// - [ ]  Deve ser possível deletar um link
// - [ ]  Deve ser possível obter a URL original por meio do encurtamento
// - [ ]  Deve ser possível listar todas as URL’s cadastradas
// - [ ]  Deve ser possível incrementar a quantidade de acessos de um link
// - [ ]  Deve ser possível baixar um CSV com o relatório dos links criados

// Além disso, também temos algumas regras importantes específicas para o front-end:

// - [ ]  É obrigatória a criação de uma aplicação React no formato SPA utilizando o Vite como 'bundler';
// - [ ]  Siga o mais fielmente possível o layout do Figma;
// - [ ]  Trabalhe com elementos que tragam uma boa experiência ao usuário 'empty state', ícones de carregamento, bloqueio de ações a depender do estado da aplicação);
// - [ ]  Foco na responsividade: essa aplicação deve ter um bom uso tanto em desktops quanto em celulares.

// ## Páginas

// Essa aplicação possui 3 páginas:

// - A página raiz ('/') que exibe o formulário de cadastro e a listagem dos links cadastrados;
// - A página de redirecionamento ('/:url-encurtada') que busca o valor dinâmico da URL e faz a pesquisa na API por aquela URL encurtada;
// - A página de recurso não encontrado (qualquer página que não seguir o padrão acima) que é exibida caso o usuário digite o endereço errado ou a url encurtada informada não exista.

// ## Ferramentas

// É obrigatório o uso de:

// - Typescript
// - React
// - Vite sem framework

// É flexível o uso de:

// - TailwindCSS
// - React Query
// - React Hook Form
// - Zod

// ## Variáveis ambiente

// Todo projeto tem diversas configurações de variáveis que devem ser diferentes de acordo com o ambiente que ele é executado. Para isso, importante sabermos, de forma fácil e intuitiva, quais variáveis são essas. Então é obrigatório que esse projeto tenha um arquivo '.env.example' com as chaves necessárias:

// \`\`\`
// VITE_FRONTEND_URL=
// VITE_BACKEND_URL=
// \`\`\`

// ## Dicas

// - Comece o projeto pela aba 'Style Guide' no Figma. Dessa forma, você prepara todo o seu tema, fontes e componentes e quando for criar as páginas vai ser bem mais tranquilo;
// - Trabalhe com o desenvolvimento 'mobile first', principalmente se estiver utilizando ferramentas que se favorecem disso como Tailwind;
// - Assim com a experiência do usuário é importante (UX), a sua experiência no desenvolvimento (DX) também é muito importante. Por isso, apesar de ser possível criar essa aplicação sem nenhuma biblioteca, recomendamos utilizar algumas bibliotecas que vão facilitar tanto o desenvolvimento inicial quanto a manutenção do código;
// - Em caso de dúvidas, utilize o espaço da comunidade e do nosso fórum para interagir com outros alunos/instrutores e encontrar uma solução que funcione para você.`,
    
    instruction_detail_markdown: `
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

      ### Requisitos Não Funcionais

      #### Segurança
      - As senhas devem ser armazenadas apenas de forma criptografada utilizando um algoritmo seguro (argon2).
      - A autenticação deve ser realizada por meio de tokens JWT com tempo de expiração definido.
      - Dados sensíveis devem ser armazenados em variáveis de ambiente e nunca devem ser versionados no repositório.
      - Todas as entradas de dados do usuário devem ser validadas e sanitizadas para prevenir vulnerabilidades de segurança.
      - O acesso ao banco de dados deve ser protegido contra SQL Injection por meio do uso de ORM ou Query Builder.

      #### Confiabilidade e Tratamento de Erros
      - O sistema deve tratar operações assíncronas de forma segura, sem causar falhas na aplicação.
      - Os erros devem retornar mensagens claras, consistentes e descritivas.
      - O sistema deve lidar adequadamente com falhas de serviços externos, como brokers de mensageria.

      #### Performance e Escalabilidade
      - O sistema deve suportar múltiplos usuários simultâneos sem inconsistência de dados.
      - Operações críticas (como criação e finalização de entregas) devem ser processadas de forma atômica.
      - Processos assíncronos (como notificações) não devem bloquear os fluxos principais da aplicação.

      #### Manutenibilidade e Arquitetura
      - A aplicação deve seguir uma arquitetura em camadas (controllers, services, repositories).
      - As regras de negócio devem estar desacopladas das camadas de transporte e infraestrutura.
      - Configurações não devem ser hardcoded e devem ser facilmente ajustáveis.

      #### Testabilidade
      - O sistema deve permitir a criação de testes unitários com dependências externas mockadas.
      - A lógica de negócio principal deve ser testável de forma isolada da infraestrutura.
    `,
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
