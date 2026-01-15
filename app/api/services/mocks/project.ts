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

            ### 1. Requisitos Funcionais

            #### Tecnologias e Recursos
            - Backend Node.js:
            - Framework: Express.js;
            - Banco de dados: PostgreSQL;
            - ORM: Prisma ou Query Builder: Knex;
            - Testes:
            - Framework de testes: Jest.
            - Deploy:
            - Deploy do backend em Render;
            - Deploy do front - end: Vercel ou Netlify.
            - Outros:
            - Vite;
            - Docker;
            - TypeScript;
            - Validação com Zod;
            - JWT;
            - TailwindCSS.
            ---             👉 O Sistema terá três personas: o * admin *, o * técnico * e o * cliente *;

            ### O ** Admin **: É a pessoa responsável pela gestão do Sistema

                - O \`Admin\` deve criar, listar e editar contas de \`Técnicos\`.

            > 💡Ao criar uma conta de Técnico uma senha provisória será criada pelo Admin e posteriormente repassada ao Técnico que poderá alterar essa senha após o primeiro acesso à sua conta.

            > 💡Ao criar um Técnico seu horário de disponibilidade padrão será o horário comercial: 08:00 às 12:00 e 14:00 às 18:00

            > \`Exemplo de Array de horários: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']\`


            > 🚩Nessa versão do Sistema não haverá exclusão de contas de Técnicos, mas você pode incluir como uma funcionalidade adicional ao seu projeto. Se desafie! \`[OPCIONAL]\`


            - O \`Admin\` deve criar, listar, editar e desativar os \`Serviços\` que serão executados pelos \`Técnicos\`.

            > 💡Ao desativar um Serviço, esse Serviço não deve ser listado na criação de um novo Chamado mas deve deve permanecer nos Chamados já criados.Você pode utilizar a estratégia de Soft Delete para essa funcionalidade.


            - O \`Admin\` deve listar, editar e excluir contas de \`Clientes\`.

            > 💡️Ao excluir uma conta de Cliente todos os Chamados criados por esse Cliente serão excluídos também.
            > 

            - O \`Admin\` deve conseguir listar todos os \`Chamados\` e suas informações;
            - O sistema deve permitir ao \`Admin\` editar o status dos \`Chamados\`.

            ---

            ### O Técnico: É a pessoa responsável por executar os Serviços que foram cadastrados pelo Admin e foram solicitados pelos Clientes através de um Chamado

            - O sistema deve permitir ao \`Técnico\` editar o seu próprio perfil.

            > 🚩Nessa versão do Sistema não haverá exclusão de contas de Técnicos, mas você pode incluir como uma funcionalidade adicional ao seu projeto. Se desafie! \`[OPCIONAL]\`
            > 

            - O sistema deve permitir o envio de imagem para ser usada no perfil do \`Técnico\`;
            - O sistema deve permitir ao \`Técnico\` listar todos os \`Chamados\` atribuídos a ele;
            - O sistema deve permitir ao \`Técnico\` adicionar novos \`Serviços\` ao \`Chamado\` se for necessário;
            - O sistema deve permitir ao \`Técnico\` editar o status do \`Chamado\`.

            > 💡️Quando o Técnico iniciar um atendimento o status do Chamado deve mudar para \`'Em atendimento'\`.

            > 💡️Quando o Técnico encerrar um atendimento o status do Chamado deve mudar para \`'Encerrado'\`

            🚫 Não é permitido ao Técnico:

            - Criar, alterar ou excluir contas de \`Clientes\`.
            - Criar \`Chamados\`.

            ### O **Cliente**: É a pessoa responsável por criar um \`Chamado\`

            - O \`Cliente\` deve conseguir criar, editar e excluir sua conta de \`Cliente\`.

            > 💡️Ao excluir uma conta de Cliente todos os Chamados criados por esse Cliente serão excluídos também.


            - O sistema deve permitir o envio de imagem para ser usada no perfil do \`Cliente\`.
            - O sistema deve permitir ao \`Cliente\` escolher um \`Técnico\` disponível durante a criação do \`Chamado\`.
            - O sistema deve permitir ao \`Cliente\` visualizar um histórico com todos os \`Chamados\` já criados por ele.

            🚫 Não é permitido ao Cliente:
            - Alterar ou excluir outras contas que não lhe pertençam.
            - Alterar qualquer informação de um \`Chamado\` após ser criado.

            --- 

            ### O **Chamado**: É a relação entre um \`Cliente\` e um \`Técnico\`

            - O sistema deve permitir que vários \`Chamados\` sejam criados por um \`Cliente\`;
            - O Cliente deve criar um \`Chamado\` selecionando a categoria do \`Serviço\`;
            - Todo \`Chamado\` deve ter pelo menos um \`Serviço\` selecionando, podendo ser adicionado novos \`Serviços\` pelo \`Técnico\` responsável pelo atendimento;
            - O \`Chamado\` deve exibir o valor do \`Serviço\` solicitado e o valor de cada \`Serviço\` adicional incluído pelo \`Técnico\` assim como o somatório do valor total de todos os \`Serviços\`;
            - Durante a criação de um \`Chamado\` o \`Cliente\` deve atribuir um \`Técnico\` responsável;
            - O \`Chamado\` pode ter seu status alterado pelo \`Técnico\` responsável ou pelo \`Admin\`;
            - O \`Chamado\` só pode ter status de: \`Aberto\`, \`Em atendimento\` ou \`Encerrado\`.

            ---

            ### O Serviço: Categoria de atividades que serão executadas pelo \`Técnico\` e solicitadas pelos \`Clientes\`

            - Somente o \`Admin\` deve criar, editar e desativar as informações dos Serviços;
            - Os \`Serviços\` serão parte das informações de um \`Chamado\`;
            - Cada \`Serviço\` terá um valor a ser cobrado do \`Cliente\`.

            ---

            ### 2. Pontos de atenção

            - O projeto deve atender a todas as especificações listadas acima.
            - Deve existir uma conta de administrador.
            - Devem existir pelo menos 3 contas de técnicos:
                - Técnico 1: atende das 08h às 12h e das 14h às 18h.
                - Técnico 2: atende das 10h às 14h e das 16h às 20h.
                - Técnico 3: atende das 12h às 16h e das 18h às 22h.
            - Devem existir pelo menos 5 serviços a serem oferecidos:
                - Exemplos de serviços:
                    - Instalação e atualização de softwares
                    - Instalação e atualização de hardwares
                    - Diagnóstico e remoção de vírus
                    - Suporte a impressoras
                    - Suporte a periféricos
                    - Solução de problemas de conectividade de internet
                    - Backup e recuperação de dados
                    - Otimização de desempenho do sistema operacional
                    - Configuração de VPN e Acesso Remoto
            - Os usuários deverão se autenticar para ter acesso a aplicação através da tela de login. Deve ser utilizado JWT no processo de autenticação.
            - A aplicação deve ser responsiva de acordo com o conceito de Mobile First seguindo o layout do Figma.
            - A sua aplicação deverá consumir a sua própria API.
            - Os repositórios devem conter um README bem detalhado tanto no back-end quanto no front-end com link de deploy e instruções para a execução da aplicação localmente.
            - Deve ser feito o deploy tanto do front-end quanto do back-end.

            --- 
            ### 4. Desenvolvendo o projeto

            Para desenvolver esse projeto, recomendamos utilizar as principais tecnologias que utilizamos durante o desenvolvimento do primeiro módulo da formação.

            Caso você tenha alguma dificuldade você pode ir no nosso [fórum](https://app.rocketseat.com.br/h/forum/php)
            e deixar sua dúvida por lá!

            Após terminar o desafio, caso você queira, você pode tentar dar o próximo passo e deixar a aplicação com a sua cara. Tente mudar o layout, cores, ou até adicionar novas funcionalidades para ir além! 🚀

            ---


            ### 5. Entrega
            Após concluir o desafio, você deve enviar a URL do seu código no Github.

            Além disso, que tal fazer um post no LinkedIn compartilhando o seu aprendizado e contando como foi a experiência?
            É uma excelente forma de demonstrar seus conhecimentos e atrair novas oportunidades!

            Obs: Se você se sentir à vontade, pode postar um print do resultado final e nos marcar! Vai ser incrível acompanhar a sua evolução! 💜

            ---

            ### 6. Considerações finais

            Lembre-se que o intuito de um desafio é te impulsionar, por isso, dependendo do desafio, pode ser que você precise ir além do que foi discutido em sala de aula. 
            Mas isso não é algo ruim: ter autonomia para buscar informações extras é uma habilidade muito valiosa e vai ser ótimo pra você treinar ela aqui com a gente!

            E lembre-se: **tenha calma**! Enfrentar desafios faz parte do seu processo de aprendizado! 

            Se precisar de alguma orientação ou suporte, estamos aqui com você!
            Bons estudos e boa prática! 💜

            --- 

            Feito com 💜 por Rocketseat 👋`
    },
}
