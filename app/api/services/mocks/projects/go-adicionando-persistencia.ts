export const goAdicionandoPersistencia = {
    title: "Go - Adicionando Persistência",
    description: "Neste desafio, vamos adicionar persistência ao nosso projeto Go.",
    slug: "go-adicionando-persistencia",
    instruction_detail_markdown: `
    
## Objetivo

Esse desafio é a segunda parte do projeto de criação de uma API em Go. O foco aqui é implementar a persistência dos dados utilizando um banco de dados relacional.

Durante seus estudos, você viu diferentes formas de integrar bancos de dados em Go. Agora é a sua oportunidade de aplicar esse conhecimento. Sinta-se livre para escolher a abordagem e a tecnologia que mais lhe interessam. O objetivo é que, ao final, sua API esteja salvando os dados de forma permanente.

## Refatorar a Aplicação

A tarefa principal é refatorar a lógica de armazenamento em memória e substituí-la por uma camada de acesso a dados que se comunique com um banco de dados.
O mais importante é que a "assinatura" das funções do "banco" da primeira parte, e da sua API — os endpoints, as requisições e as respostas — deve permanecer exatamente a mesma.

## Guia de Implementação Técnica

Embora você tenha liberdade de escolha, aqui estão os passos técnicos fundamentais que você precisará seguir, independentemente da tecnologia escolhida:

### 1. Escolha sua Ferramenta e Configure o Ambiente

Selecione o banco de dados que você irá utilizar. As opções mais comuns que você pode considerar são:

- **SQLite:** Excelente para começar. É simples, não requer um servidor separado (salva os dados em um arquivo local) e é perfeito para o desenvolvimento.
- **PostgreSQL ou MySQL:** Opções mais robustas e alinhadas com ambientes de produção. Usá-las com Docker é uma forma prática de rodar um servidor de banco de dados em sua máquina local sem complexidade.

Após a escolha, adicione o *driver* Go correspondente ao seu projeto (\`go get ...\`).

### 2. Crie a Conexão e o Schema do Banco

Em seu código, crie uma função para estabelecer e gerenciar a conexão com o banco de dados. Além disso, você precisará de uma forma de garantir que a tabela \`users\` exista. Uma boa prática é ter um script ou uma função que execute o seguinte comando SQL na inicialização da aplicação:

\`\`\`sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    biography TEXT NOT NULL
);
\`\`\`

### 3. Refatore as Funções de Acesso a Dados

Este é o coração da tarefa. Você irá reescrever o corpo das suas funções de manipulação de dados para executar comandos SQL. Aqui estão alguns exemplos, mas lembre-se de adaptar conforme o banco e/ou ferramenta escolhida:

- Use \`db.Exec()\` para operações de escrita como \`INSERT\`, \`UPDATE\` e \`DELETE\`.
- Use \`db.Query()\` (para múltiplas linhas) e \`db.QueryRow()\` (para uma única linha) em operações de leitura com \`SELECT\`.
- Lembre-se de utilizar \`rows.Scan()\` para mapear os dados retornados pelo banco para as suas \`structs\` Go.

### 4. Segurança em Primeiro Lugar: Prevenção de SQL Injection

Este é um ponto não negociável. **Nunca** use concatenação de strings (como \`fmt.Sprintf\`) para inserir valores diretamente em suas queries. Utilize sempre **placeholders** (\`?\` para a maioria dos drivers, ou \`$1\`, \`$2\`... para o Postgres) para passar argumentos de forma segura. Isso protege sua aplicação contra ataques de SQL Injection.

\`\`\`go
// Forma INCORRETA e INSEGURA
db.Query("SELECT * FROM users WHERE id = '" + id + "'")

// Forma CORRETA e SEGURA
db.QueryRow("SELECT * FROM users WHERE id = ?", id)
\`\`\`
    `,
}