export const desenvolvimentoDeIaClusterizacaoHierarquica = {
    title: "Desenvolvimento de IA - Clusterização Hierárquica",
    description: "Neste desafio, vamos desenvolver um sistema de clusterização hierárquica usando IA.",
    slug: "desenvolvimento-de-ia-clusterizacao-hierarquica",
    instruction_detail_markdown: `
    Seu desafio é aplicar algoritmos de clusterização hierárquica.

---


## Contexto

A classificação taxonômica é uma tarefa central na biologia, utilizada para compreender as relações entre organismos a partir de traços em comum. A clusterização hierárquica é um método interpretável que simula a formação de relações evolutivas entre espécies, semelhante a uma árvore filogenética.

Neste desafio, foram gerados no mínimo 10 agrupamentos distintos entre as espécies. Para fins didáticos, recomenda-se utilizar **10 como valor mínimo para o número de clusters** durante a análise.

Ressaltamos que os dados são **sintéticos** e não representam comportamentos ou informações de espécies reais.

---


## Dataset

O dataset contém **600 registros**, cada um representando uma espécie fictícia. Os atributos foram gerados de forma simulada, mas baseados em princípios inspirados na biologia real.

---


### Atributos numéricos e booleanos

| Nome                | Tipo    | Descrição                                              |
|---------------------|---------|--------------------------------------------------------|
| species_id          | string  | Identificador único da espécie (ex: SP001)             |
| body_mass_kg        | float   | Massa corporal média da espécie (em kg)                |
| num_legs            | int     | Número de membros locomotores (ex: 0, 2, 4, 6)         |
| has_wings           | bool    | Possui asas? (1 = sim, 0 = não)                        |
| tail_length_cm      | float   | Comprimento médio da cauda (em centímetros)            |
| eye_count           | int     | Quantidade de olhos (ex: 0, 2, 4)                      |
| nocturnal           | bool    | Ativo durante a noite? (1 = sim, 0 = não)              |
| avg_lifespan_years  | float   | Expectativa de vida média da espécie (em anos)         |
| has_venom           | bool    | Espécie possui veneno ou toxina? (1 = sim, 0 = não)    |

### Atributos categóricos

| Nome | Tipo | Descrição |
| --- | --- | --- |
| diet_type | string | Tipo de dieta da espécie: herbivore, carnivore, omnivore |
| skin_type | string | Tipo de cobertura corporal: fur, scales, feathers, skin |
| social_behavior | string | Comportamento social: solitary, pair-living, group-living |

---


### Observação
O dataset se encontra compactado na seção de recursos, é necessário extrair primeiro. 

---

## Entrega

Após concluir o desafio, você deve enviar a URL do seu código no GitHub para a plataforma. 

Além disso, que tal fazer um post no LinkedIn compartilhando o seu aprendizado e contando como foi a experiência?

É uma excelente forma de demonstrar seus conhecimentos e atrair novas oportunidades!

Feito com 💜 por Rocketseat 👋

# Tarefas
- Carregar e explorar o dataset de 600 espécies fictícias, analisando os atributos disponíveis.
- Aplicar algoritmos de clusterização hierárquica para agrupar as espécies com base nas características fornecidas.
- Gerar e interpretar dendrogramas para visualizar os agrupamentos formados.
- Definir um corte nos dendrogramas para obter pelo menos 10 clusters distintos.
- Identificar e descrever os grupos taxonômicos resultantes, destacando padrões relevantes.
- Elaborar uma análise detalhada dos resultados, discutindo possíveis relações evolutivas simuladas entre os clusters.
    `
}