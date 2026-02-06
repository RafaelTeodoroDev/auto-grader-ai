export const formacaoPythonModulo09 = {
    title: "Formação Python - Módulo 09",
    description: "Neste módulo, vamos aprender a criar um sistema de gerenciamento de estoque.",
    slug: "formacao-python-modulo-09",
    instruction_detail_markdown: `
    Como tivemos um módulo completo, **não** vamos descrever detalhadamente rotas e propriedades dos registros a serem criadas, mas sim, as regras e requisitos que a API deve ter.

O motivo disso é para vocês **também** exercitarem o desenvolvimento e a estruturação dessa parte.

O aprendizado daqui é muito importante e com certeza você conseguirá sair com muito conhecimento bacana 💜

---


## Objetivo

**Vamos desenvolver uma API de pedidos com JWT:** Desenvolva uma API que utilize JWT para autenticação e autorização. A API deve ter diferentes endpoints que só podem ser acessados por usuários que tenham autenticação via token

---


### Sobre o token JWT

Ao fazer login, o usuário recebe um token JWT que contém as seguintes informações:

- **ID do Usuário:** Identificador único do usuário na base de dados
- **Nome de Usuário:** Nome do usuário para exibição.
- **Token JWT:** Token necessário para ser colocado na requisição

---


### Sobre os endpoints

Deve ser possível listar os pedidos do usuário autenticado e adicionar um novo pedido. Um usuário só pode ter acesso aos seus pedidos e não de outros.

Como pode imaginar, você deverá utilizar seus conhecimentos sobre HTTP para poder pensar na lógica e em qual método irá suprir a implementação necessária.

---


### Sobre as tabelas no banco

Os usuários devem possuir um id, o username e a senha que deverá ser armazenada.

Os pedidos por sua vez, deve ter uma relação com os usuários, descrição, id e a data na qual o pedido foi criado no banco.

---


### Conceitos que pode praticar

- MVC
- JWT
- SQL
- Testes unitários
- Criação e integração com banco de dados SQLite

---


## Entrega

Após concluir o desafio, você deve enviar a URL do seu código no GitHub para a plataforma. 

Além disso, que tal fazer um post no LinkedIn compartilhando o seu aprendizado e contando como foi a experiência?

É uma excelente forma de demonstrar seus conhecimentos e atrair novas oportunidades!

Feito com 💜 por Rocketseat 👋
    `
}