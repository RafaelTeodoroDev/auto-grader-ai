export const desafioSistemaDeLivraria = {
    title: "Desafio - Sistema de Livraria",
    description: "Neste desafio, vamos desenvolver um sistema de livraria.",
    slug: "desafio-sistema-de-livraria",
    instruction_detail_markdown: `
    Este projeto é uma ótima oportunidade para aplicar e expandir seus conhecimentos em Java, colocando em prática os conceitos de classes, objetos, listas e interação com o usuário.

## Objetivo

Você irá desenvolver um sistema de console para gerenciar o empréstimo de livros de uma biblioteca. O programa deverá interagir com o usuário, permitindo que ele veja os livros disponíveis e realize o empréstimo de um deles.

## Como deve funcionar

1. **Início:** O programa começará, em loop, perguntando ao usuário se ele deseja ver a lista de livros disponíveis.
2. **Listagem:** Se a resposta for "SIM", o sistema exibirá no console uma lista com os livros que não foram emprestados.
3. **Empréstimo:** Após ver a lista, o usuário poderá escolher um livro pelo seu \`id\`, informar o próprio nome e, assim, registrar o empréstimo. O sistema deve confirmar a operação com uma mensagem de sucesso e marcar o livro como indisponível.
4. **Encerramento:** Se a resposta inicial for "NÃO", ou após a conclusão de um empréstimo, o sistema deve exibir uma mensagem de despedida e finalizar a execução.

## Estrutura do Projeto

O projeto será dividido em algumas classes simples para manter a organização. Aqui estão as classes principais e suas funcionalidades:

### Livro

- **id**: Identificador único do livro
- **titulo**: Título do livro
- **autor**: Autor do livro (objeto do tipo Autor)
- **disponivel**: Indica se o livro está disponível para empréstimo
- **dataCadastro:** Data que o livro foi cadastrado
- **dataAtualização:** Data que o livro foi atualizado

### Autor

- **id**: Identificador único do autor
- **nome**: Nome do autor
- **dataNascimento:** Nascimento do autor

### Emprestimo

- **id**: Identificador único do empréstimo
- **livro**: Livro que foi emprestado (objeto do tipo Livro)
- **nomeCliente**: Nome do cliente que pegou o livro emprestado
- **dataEmprestimo:** Data que o empréstimo foi realizado
- **dataDevolucao:** Data que o livro foi devolvido (pode ser nula se ainda não foi devolvido)

### Biblioteca

- **livros**: Lista de livros na biblioteca
- **autores:** Lista de autores da biblioteca
- **emprestimos:** Lista de empréstimos da biblioteca

## Dica

Uma dica para estruturar a classe \`Biblioteca\`:

\`\`\`java
private List<Livro> livros = new ArrayList<>();
private List<Autor> autores = new ArrayList<>();
private List<Emprestimo> emprestimos = new ArrayList<>();
\`\`\`

## Indo Além: Sugestões para Evoluir seu Projeto

Para levar seu projeto a um próximo nível, considere expandir as funcionalidades. Aqui estão algumas ideias que misturam texto e listas para melhor organização:

### Desenvolva um Menu Interativo

Substitua a pergunta inicial simples por um menu completo que ofereça múltiplas opções. Isso tornará seu sistema mais dinâmico e funcional.
Uma nova funcionalidade seria permitir o cadastro de um novo livro em tempo real, onde o sistema solicitaria ao usuário que inserisse todos os parâmetros do livro, que ficaria imediatamente disponível para empréstimo.

### Aprimore o Gerenciamento de Usuários e Empréstimos

Vá além do básico, criando um sistema de clientes para gerenciar quem pega os livros.

- Crie uma classe \`Cliente\` com atributos como \`id\`, \`nome\` e \`email\`.
- Implemente funcionalidades para listar todos os clientes cadastrados.
- Permita o cadastro de novos clientes.
- Associe os empréstimos aos clientes, permitindo consultar o histórico de livros que um usuário específico emprestou.

### Implemente Buscas e Filtros Avançados

Facilite a vida do usuário com ferramentas de pesquisa mais poderosas. Em vez de apenas listar todos os livros de uma vez, adicione a capacidade de:

- Buscar livros por título ou autor.
- Filtrar a listagem por gênero ou por data de cadastro (livros adicionados recentemente).

    `,
}