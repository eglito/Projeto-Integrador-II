# Síntese da Pesquisa — Personas, Mapas de Empatia e Regras de Negócio

Projeto Integrador II — UNIVESP
Base: 6 entrevistas presenciais realizadas entre 25/09 e 01/10/2026, em Araraquara (SP).

> **Como ler este documento.** Toda afirmação é rastreável a uma entrevista, identificada por código (E01 a E06). Onde há inferência, está marcado como tal. Onde a evidência é insuficiente, está escrito. Nada aqui foi inventado para preencher lacuna.

---

## 1. Base de evidência

| Cód. | Idade | Perfil | Prática | Freq. | Treina | Locais |
|---|---|---|---|---|---|---|
| E01 | 30 | Mulher, professora, viaja a trabalho | 8 meses | 2x | Sozinha e acompanhada | Parque Infantil, academia |
| E02 | 30 | Mulher, nutricionista | 2 anos | 3x | Sozinha e acompanhada | Parque Infantil, academia |
| E03 | 28 | Homem, professor | 1 ano | 3x | Sozinho e acompanhado | Parque Infantil, Pça. Pedro de Toledo, Jardim Botânico, academia |
| E04 | 62 | Homem, aposentado, mobilidade reduzida na perna esquerda | 3 anos | 2x | Sozinho | Jardim Botânico |
| E05 | 42 | Mulher, mãe, autônoma | 1 ano | 5x | Sozinha | Pça. dos Advogados, Jardim Botânico |
| E06 | 55 | Homem | +30 anos | 5x | Sozinho | Pça. Paulo Elias Antonio (Chediek); às vezes Parque Infantil e Pça. Pedro de Toledo |

### Estado dos equipamentos por local observado

| Local | Equipamentos | Estado registrado | Fonte |
|---|---|---|---|
| Parque Infantil | barra fixa, barra australiana, barras paralelas | precário | E01, E02, E03 |
| Jardim Botânico | barra australiana, barra fixa | bom; falta pintura e acabamento | E04 |
| Pça. dos Advogados | espaldar, barra paralela, barra fixa | bom estado de conservação | E05 |
| Pça. Paulo Elias Antonio | barra fixa, barra australiana | precário; já presenciou equipamento quebrado | E06 |

O estado **varia por local**, e não é propriedade uniforme da cidade. Esse é o primeiro fato que o modelo de dados precisa representar.

---

## 2. Temas emergentes

Agrupamento por afinidade, com número de participantes que sustentam cada tema. Tema com 1 ou 2 participantes é indício, não achado.

| # | Tema | Participantes | Força |
|---|---|---|---|
| T1 | Dificuldade de obter informação sobre onde há equipamento | E01, E02, E03, E06 | 4/6 |
| T2 | Descoberta de locais por conversa com terceiros | E01, E02, E03, E05, E06 | 5/6 |
| T3 | Proximidade da rotina diária como critério de escolha | E01, E04, E05, E06 | 4/6 |
| T4 | Equipamento em condição precária | E01, E02, E03, E06 | 4/6 |
| T5 | Socialização como valor da prática | E01, E02, E03 (comunidade de treino); E05 (convívio incidental) | 4/6, naturezas distintas |
| T6 | Zeladoria e limpeza do espaço | E02, E05, E06 | 3/6 |
| T7 | Treinar sozinho como padrão | E04, E05, E06 | 3/6 |
| T8 | Dificuldade em outras cidades | E01, E03, E06 | 3/6 |
| T9 | Academia privada como alternativa de contingência | E01, E02, E03 | 3/6 |
| T10 | Segurança ligada a gênero e horário noturno | E01, E02 | 2/6 (ambas mulheres) |
| T11 | Adequação do equipamento ao corpo de quem usa | E03, E04 | 2/6 |
| T12 | Crítica à ação do poder público na conservação | E03, E06 | 2/6 |
| T13 | Ausência de bebedouro e sanitário limpo | E02 | 1/6 |
| T14 | Proximidade de serviço de saúde como fator de conforto | E06 | 1/6 |

---

## 3. Eixo de diferenciação das personas

O corte mais nítido nos dados não é demográfico, é comportamental: **treinar acompanhado como parte da prática** versus **treinar sozinho dentro de uma rotina**.

| | E01, E02, E03 | E04, E05, E06 |
|---|---|---|
| Modo de treino | sozinho e acompanhado | sozinho |
| Idade | 28 a 30 | 42 a 62 |
| Critério dominante | segurança, socialização, equipamento | proximidade |
| Locais | múltiplos, incluindo outras cidades | um local principal perto de casa |
| Papel da comunidade | aprendizado e troca técnica | ausente ou incidental |

Três personas, com bases de evidência de tamanhos diferentes e declaradas.

---

## 4. Personas

### Persona 1 — Mariana Prado

**Base: E01, E02, E03 (3 entrevistas).** Perfil feminino adotado porque a dimensão de segurança noturna, central nesta persona, foi levantada espontaneamente pelas duas participantes mulheres do grupo (E01, E02).

| Campo | Conteúdo |
|---|---|
| Idade e ocupação | 29 anos, professora da rede pública |
| Contexto | Mora em Araraquara. Jornada de trabalho com horários irregulares. Ocasionalmente viaja a trabalho para outras cidades. |
| Prática | Entre 8 meses e 2 anos de calistenia, 2 a 3 vezes por semana |
| Objetivo ao treinar | Evoluir tecnicamente e manter o vínculo com o grupo de praticantes. O treino é também encontro. |
| Frustração principal | Não saber onde há equipamento adequado quando está fora da sua rota habitual, e não poder treinar no único horário livre que tem, à noite, por insegurança |
| Como descobre locais hoje | Conversando com outros praticantes e por grupo de WhatsApp |
| Contorno que inventou | Recorre a academia privada quando não encontra espaço público adequado |
| Relação com tecnologia | Usa aplicativos de academia como referência e sente falta de equivalente para espaço público |
| Frase literal | "nem sempre é fácil encontrar um lugar para treinar. eu sou mulher e não gosto de ficar sozinha durante a noite em uma praça escura" (E01) |

**O que define esta persona para o produto:** precisa decidir, antes de sair de casa, se um local desconhecido serve — e "servir" inclui ser seguro no horário em que ela pode ir.

---

### Persona 2 — Jorge Camargo

**Base: E06 (principal) e E05 (padrão compartilhado).** Ver variação documentada abaixo.

| Campo | Conteúdo |
|---|---|
| Idade e ocupação | 52 anos, trabalhador com rotina fixa |
| Contexto | Mora em bairro afastado do centro. Treina quase todos os dias, sempre no mesmo horário, numa praça perto de casa. |
| Prática | Longa, mais de uma década, 5 vezes por semana |
| Objetivo ao treinar | Manter a saúde e a rotina. A prática é hábito consolidado, não descoberta. |
| Frustração principal | Equipamento limitado e malconservado no local que usa, e ausência de qualquer fonte confiável de informação sobre outros locais na cidade |
| Como descobre locais hoje | Conversa e tentativa. Já foi a outros locais por conta própria, sem saber o que encontraria. |
| Contorno que inventou | Procura ativamente outros locais no município quando o equipamento do seu local não atende |
| Relação com tecnologia | Usa o celular para informação prática. Não participa de comunidade online de calistenia. |
| Frase literal | "às vezes eu até busco treinar em outros lugares mas a gente não tem fácil informação de onde tem lugar pra treinar aqui na região" (E06) |

**Variação documentada (E05):** mulher de 42 anos, mãe, autônoma. Compartilha o padrão central — treina sozinha, proximidade como critério dominante, sensibilidade à zeladoria — mas o horário de treino é ancorado em uma rotina de cuidado: ela treina na praça enquanto aguarda a saída do filho da escola, e valoriza o convívio incidental com outros responsáveis. Essa variação sustenta a regra RN-04 e deve ser citada no relatório, porque mostra que o horário de uso tem outros determinantes além da segurança.

**O que define esta persona para o produto:** não está explorando a cidade por lazer. Quer saber, com baixo esforço, se existe algo melhor perto de onde já vive.

---

### Persona 3 — Benedito Alves

**Base: E04 (1 entrevista).** Persona sustentada por um único participante. Mantida no conjunto porque introduz necessidade qualitativamente distinta, diretamente ligada ao requisito de acessibilidade do projeto. **Requer validação com mais participantes antes de orientar decisão de produto irreversível.**

| Campo | Conteúdo |
|---|---|
| Idade e ocupação | 62 anos, aposentado |
| Contexto | Mora perto do parque que frequenta. Treina sempre à tarde, sozinho. Começou a usar equipamentos de praça depois da aposentadoria. |
| Prática | 3 anos, 2 vezes por semana. Não se considera praticante avançado. |
| Objetivo ao treinar | Recuperar condicionamento e manter mobilidade. Descreve a ida ao parque como algo prazeroso em si. |
| Limitação física | Mobilidade reduzida na perna esquerda, o que restringe o treino de membros inferiores |
| Frustração principal | Ausência de equipamento adequado ao treino de mobilidade. Pede especificamente barra australiana mais baixa e espaldar. |
| Contorno que inventou | Adapta os exercícios ao equipamento disponível para conseguir treinar perna |
| Como descobre locais hoje | Não investigado nesta entrevista |
| Frase literal | "a gente muitas vezes precisa se exercitar com o que a gente tem. Os equipamentos poderiam ser melhores, mas a gente consegue ir se virando com o que tem aqui" (E04) |

**O que define esta persona para o produto:** para ele, saber que existe "uma barra fixa" é informação incompleta. Precisa saber **a que altura** e **se dá para usar** com a limitação que tem.

---

## 5. Mapas de empatia

Quadrante **Pensa** é sempre inferência a partir do comportamento e da fala, nunca registro direto. Está marcado como tal.

### Mapa 1 — Mariana Prado

| DIZ | PENSA *(inferência)* |
|---|---|
| "eu gosto muito do contato que a calistenia cria com as outras pessoas. aprendo muito e faço amigos durante os treinos" (E01) | Que o espaço público é melhor que a academia para treinar, mas só quando reúne condições que ela não controla |
| "apenas na praça ou no parque que dou o meu melhor. aqui temos incentivo dos colegas de calistenia" (E01) | Que o risco de ir a um local desconhecido recai sobre ela de forma diferente da de um homem |
| "a melhor parte da calistenia são as trocas" (E02) | Que pagar academia é derrota aceitável diante da falta de informação |
| "nós [mulheres] precisamos escolher bem os locais onde vamos treinar. infelizmente não posso fazer calistenia em qualquer espaço público" (E02) | |
| "além da prática esportiva em si, a calistenia é para mim um equipamento de socialização" (E03) | |

| FAZ | SENTE |
|---|---|
| Treina em local central, iluminado e movimentado (E01) | Frustração ao não encontrar local adequado nas cidades por onde passa (E01) |
| Usa grupo de WhatsApp para combinar treino, principalmente à noite (E02) | Insegurança para treinar à noite, mesmo em local movimentado (E02) |
| Treina sozinha apenas quando há movimento no local (E02) | Orgulho da própria evolução técnica: "há alguns meses, muscle-up era impossível para mim. hoje (...) consigo fazer" (E03) |
| Recorre a academia privada quando não acha espaço público (E01) | Indignação com a conservação do equipamento público (E03) |
| Aprendeu com desconhecidos em praça quando iniciante (E02) | Pertencimento ao grupo de praticantes |
| Ensina e aprende com outros praticantes no local (E03) | |

**Dores:** ausência de informação confiável sobre locais, sobretudo fora da rota habitual; insegurança no único horário livre que tem; equipamento precário; gasto com academia privada que não quer fazer.

**Ganhos esperados:** chegar a um local desconhecido já sabendo o que vai encontrar; poder avaliar segurança antes de ir; não depender de encontrar alguém que saiba informar.

---

### Mapa 2 — Jorge Camargo

| DIZ | PENSA *(inferência)* |
|---|---|
| "às vezes eu até busco treinar em outros lugares mas a gente não tem fácil informação de onde tem lugar pra treinar aqui na região" (E06) | Que a informação existe em algum lugar, mas não chega até ele |
| "Eu gosto daqui pela proximidade com a minha casa e o também da UBS do bairro" (E06) | Que a cidade poderia oferecer o que outras oferecem, e que isso é falha de gestão, não escassez de recurso |
| "é bom esse tipo de academia na rua, tinha que ter mais, mas às vezes tem mas não tá em uma boa condição, sabe" (E05) | Que vale deslocar-se, mas não vale perder viagem |
| | Que o estado do espaço indica se ele é bem-vindo ali *(inferência a partir das falas sobre zeladoria)* |

| FAZ | SENTE |
|---|---|
| Treina sozinho, quase diariamente, no mesmo local e horário (E05, E06) | Incômodo com a falta de zeladoria em praças e parques (E05, E06) |
| Procura outros locais no município por conta própria quando o equipamento não atende (E06) | Frustração com a demora do poder público para reparar equipamento quebrado (E06) |
| Já presenciou equipamento quebrado sem reparo (E06) | Comparação desfavorável com outras cidades: encontra equipamento com mais facilidade em São Paulo (E06) |
| Conversa com outros frequentadores sobre locais e treinos (E05, E06) | Satisfação com a rotina e com a proximidade de casa |
| Escolhe o local pela proximidade de casa e de serviço de saúde (E06) | |

**Dores:** nenhuma fonte de informação sobre o que existe na cidade; deslocamento a locais que podem não servir; equipamento quebrado sem previsão de reparo; sujeira e descuido do espaço.

**Ganhos esperados:** saber o que existe na própria região antes de se deslocar; saber se o equipamento está em condição de uso hoje, não em algum momento do passado.

---

### Mapa 3 — Benedito Alves

Mapa sustentado por uma única entrevista. Quadrantes com menos evidência ficam propositalmente vazios.

| DIZ | PENSA *(inferência)* |
|---|---|
| "às vezes eu saio de casa para vir aqui e é sempre muito gostoso" (E04) | Que adaptação é responsabilidade dele, não falha do equipamento |
| "a gente muitas vezes precisa se exercitar com o que a gente tem. Os equipamentos poderiam ser melhores, mas a gente consegue ir se virando com o que tem aqui" (E04) | Que há tempo a recuperar, e que o parque é onde isso acontece |
| "tem lugar que não dá se exercitar porque está bem precário, mas aqui é bom e tem uma estrutura, sabe" (E04) | |

| FAZ | SENTE |
|---|---|
| Treina sozinho, sempre à tarde, no parque próximo de casa (E04) | Prazer na ida ao parque, descrita como algo bom em si (E04) |
| Adapta exercícios ao equipamento disponível para treinar perna (E04) | Limitação diante da falta de equipamento adequado ao treino de mobilidade (E04) |
| Faz repetições na barra fixa e exercícios estáticos de core (E04) | Conformação ativa: reconhece a precariedade e segue treinando |
| Já descartou locais por estarem precários demais (E04) | |

**Dores:** equipamento inadequado ao treino de mobilidade; ausência de barra australiana baixa e de espaldar; locais precários que inviabilizam a prática.

**Ganhos esperados:** saber de antemão se o equipamento de um local serve para o seu corpo e para a sua limitação; não descobrir isso ao chegar.

---

## 6. Jornada atual — persona 1

Situação de hoje, sem o aplicativo. Os pontos de dor são onde o produto pode existir.

| Etapa | Ação | Pensamento | Emoção | Ponto de dor |
|---|---|---|---|---|
| Decidir treinar | Identifica uma janela livre na agenda, muitas vezes à noite | "Consigo hoje, mas só nesse horário" | Disposição | A janela disponível é justamente a de maior insegurança |
| Escolher local | Recorre ao que já conhece, ou pergunta no grupo | "Será que tem algum lugar melhor?" | Incerteza | Nenhuma fonte consultável; depende de alguém responder |
| Combinar companhia | Pergunta no grupo quem está disponível | "Sozinha nesse horário eu não vou" | Dependência | Treino fica condicionado à disponibilidade de terceiros |
| Deslocar-se | Vai ao local habitual | — | Rotina | Em cidade desconhecida, essa etapa trava a jornada inteira |
| Chegar e avaliar | Verifica equipamento, iluminação, movimento | "Dá para treinar aqui hoje?" | Alívio ou decepção | Avaliação só acontece no local, depois do deslocamento |
| Treinar | Treina e interage com outros praticantes | — | Satisfação, pertencimento | Equipamento precário limita o treino |
| Decidir se volta | Mantém o local se atendeu | — | — | Informação aprendida fica só com ela; não se acumula para ninguém |

O ponto de dor estrutural está em **chegar e avaliar**: a decisão é tomada depois do custo do deslocamento, com informação que poderia estar disponível antes.

---

## 7. Regras de negócio derivadas

Cada regra tem rastreabilidade. Regra sem evidência está marcada como decisão de projeto, não como achado.

### RN-01 — Local é entidade nomeada, não apenas coordenada

Os participantes identificam locais por nome próprio e consistente: Parque Infantil, Praça Pedro de Toledo, Jardim Botânico, Praça dos Advogados, Praça Paulo Elias Antonio (Chediek). Nenhum descreveu local por endereço ou referência vaga.

**Implicação:** a entidade `Local` tem nome oficial como atributo relevante, e os equipamentos pertencem a um local. Isso resolve a maior parte do problema de duplicata, porque a deduplicação passa a ser por local nomeado, não por raio de coordenada.
*Evidência: E01, E02, E03, E04, E05, E06.*

### RN-02 — Condição do equipamento é registro datado, com autor

O estado varia por local (seção 1) e muda no tempo: E06 presenciou equipamento quebrado e relatou demora no reparo. Registrar condição como campo fixo faria o dado envelhecer em silêncio.

**Implicação:** entidade `RegistroCondicao`, com equipamento, autor, data e avaliação. A condição exibida é a do registro mais recente, com a data visível. Confirma a decisão 04 do README.
*Evidência: E01, E02, E03, E04, E05, E06 (estados divergentes); E06 (mudança no tempo).*

### RN-03 — Equipamento precisa de atributos dimensionais, não só de tipo

Duas evidências independentes convergem: barras paralelas do Parque Infantil largas demais para pessoas de menor estatura (E03), e necessidade de barra australiana mais baixa e espaldar para treino de mobilidade (E04). A observação de E03 generaliza: pessoas de tamanhos, idades e gêneros diferentes não usam o mesmo equipamento da mesma forma.

**Implicação:** `Equipamento` ganha atributos de dimensão quando aplicável — altura da barra fixa, largura entre paralelas, altura da barra australiana — e a busca permite filtrar por adequação. **Esta é a principal mudança de modelo trazida pela pesquisa.**
*Evidência: E03, E04.*

### RN-04 — Horário é dimensão de primeira classe, não detalhe

O horário determina a usabilidade do local por três motivos distintos encontrados nos dados: insegurança noturna (E01, E02), rotina de cuidado que fixa a janela de treino (E05) e preferência de turno (E04, tarde). Segurança não é propriedade do lugar; é propriedade do par lugar e horário.

**Implicação:** avaliação de segurança e de movimento é vinculada a faixa de horário, não ao local de forma absoluta. A busca permite filtrar por horário pretendido.
*Evidência: E01, E02, E04, E05.*

### RN-05 — Campos de segurança são estruturados

E01 nomeou espontaneamente os três fatores que tornam um local adequado: iluminação boa, presença de pessoas e localização central. E02 relatou assédio que a fez abandonar permanentemente a busca por outros espaços, e hoje treina sozinha apenas quando há movimento.

**Implicação:** campos estruturados — iluminação, movimento de pessoas, horário recomendado — em vez de texto livre. Confirma a decisão 05 do README, e o relato de assédio reforça que texto aberto sobre segurança é risco real, não hipótese.
*Evidência: E01, E02.*

### RN-06 — Busca por proximidade é a consulta principal

Proximidade da rotina diária é critério dominante para três dos seis participantes (E04, E05, E06) e aparece como terceiro critério em E01. O caso de E06 é o mais claro: busca ativamente outros locais, mas na própria região.

**Implicação:** consulta espacial por raio é o caminho crítico da aplicação, não recurso secundário. Justifica PostGIS e índice espacial. Confirma a decisão 02 do README.
*Evidência: E01, E04, E05, E06.*

### RN-07 — Comodidades incluem zeladoria do espaço, não só presença de item

Três participantes trataram limpeza e cuidado do espaço como fator de decisão: ausência de sanitário limpo e bebedouro (E02), lixo e folhas secas acumuladas (E05), falta de zeladoria em geral (E06). Note que E02 não pediu sanitário, pediu **sanitário limpo**.

**Implicação:** além de bebedouro e sanitário como presença, cabe um campo de conservação e limpeza do espaço, distinto da condição do equipamento. São dois dados diferentes que a pesquisa mostrou serem percebidos separadamente.
*Evidência: E02, E05, E06.*

### RN-08 — Moderação leve, com autoria visível e denúncia

A evidência é fraca e isso precisa ser dito. Cinco dos seis descobrem locais por informação de terceiros e tratam essa informação como confiável (E01, E02, E03, E05, E06). E02 confia especificamente no grupo de WhatsApp, onde as pessoas são conhecidas. Nenhum participante expressou desconfiança em informação de desconhecido, mas o campo não foi investigado a fundo em E04 e E06.

**Implicação:** para o MVP, autoria visível no registro e mecanismo de denúncia, sem fila de aprovação prévia. Fila de aprovação com um único mantenedor cria gargalo e desestimula contribuição. **Decisão a revalidar** se houver nova rodada de pesquisa.
*Evidência: E01, E02, E03, E05, E06, com lacuna declarada.*

### RN-09 — Modelo não deve fixar Araraquara no código

Metade dos participantes relatou dificuldade em outras cidades: E01 em viagens de trabalho, E03 ao visitar outras cidades, E06 comparando com São Paulo, onde encontra equipamento com mais facilidade.

**Implicação:** o MVP permanece restrito a Araraquara, para proteger o escopo da entrega. Mas `Local` tem município como atributo, e nenhuma consulta assume uma única cidade. Expansão geográfica passa a ser decisão de produto, não refatoração.
*Evidência: E01, E03, E06.*

### RN-10 — Lista textual equivalente ao mapa

**Decisão de projeto, não achado de pesquisa.** Nenhum participante pediu alternativa ao mapa. A regra vem do requisito de acessibilidade WCAG 2.2 AA da disciplina. A pesquisa dá sustentação indireta: E04 tem 62 anos e mobilidade reduzida, E06 tem 55 anos, e o perfil de usuário não se limita a pessoas jovens com destreza fina. A fala de E06 sobre falta de informação é sobre disponibilidade do dado, não sobre interface.

**Implicação:** mantida como requisito. Honestidade metodológica exige registrar que é requisito normativo, não demanda de usuário observada.
*Evidência: requisito da disciplina; sustentação indireta em E04, E06.*

---

## 8. O que a pesquisa não sustenta

Tão importante quanto o que foi encontrado. Serve para defender o escopo na apresentação.

**Vídeo.** Nenhuma menção, em nenhuma entrevista. Confirma a exclusão do MVP.

**Comentário em texto livre.** Ninguém pediu para comentar ou avaliar. O que todos querem é **saber**. Reforça campos estruturados.

**Rede social ou comunidade dentro do app.** O grupo de WhatsApp de E02 já resolve coordenação de treino e funciona. O produto compete com o grupo na **descoberta de locais**, não na organização de encontros. Tentar replicar a função social seria disputar território onde a solução existente é melhor.

**Gamificação, ranking, registro de treino.** Zero evidência.

**Notificação.** Zero evidência.

**Proximidade de serviço de saúde (E06, UBS).** Indício isolado e interessante, mas um único participante. Registrado, fora do MVP.

---

## 9. Limitações metodológicas

A declarar no relatório, sem atenuação.

Seis participantes, todos residentes em Araraquara, recrutados nos próprios locais de prática entre 25/09 e 01/10/2026. A amostra cobre faixa de 28 a 62 anos, três mulheres e três homens, e um participante com mobilidade reduzida.

Ausências relevantes:

- Nenhum participante que **abandonou** a prática ao ar livre. Quem continua treinando já contornou as barreiras e tende a não enxergá-las.
- Nenhum iniciante absoluto, com menos de seis meses de prática.
- Nenhum participante com deficiência visual ou auditiva, apesar de o projeto prever acessibilidade nos cinco eixos. As decisões sobre esses eixos seguem norma técnica, não pesquisa.
- Participante com mobilidade reduzida: apenas um, o que torna a Persona 3 provisória.
- Amostragem por conveniência, nos locais de prática. Há viés de seleção em favor de quem frequenta espaço público com regularidade.

Falhas de registro, para corrigir em rodada futura: nenhuma foto de equipamento foi registrada nas seis entrevistas, o que priva o relatório de evidência visual do estado de conservação; o campo de confiança em informação de terceiros não foi coberto em E04 e E06; o campo de local foi preenchido incorretamente em E04; a terceira fala literal e o terceiro critério ficaram vazios em E05.

---

## 10. Pendências para a Fase 2

| Pendência | Encaminhamento |
|---|---|
| Validar Persona 3 com mais participantes | Nova rodada, se o cronograma permitir |
| Confirmar a regra de moderação (RN-08) | Revalidar; decisão de MVP tomada com evidência fraca |
| Definir quais dimensões de equipamento registrar | Medir em campo os equipamentos dos quatro locais já identificados |
| Definir faixas de horário para avaliação de segurança | Derivar das janelas relatadas: manhã, tarde, noite |
| Catalogar os locais já conhecidos | Parque Infantil, Pça. Pedro de Toledo, Jardim Botânico, Pça. dos Advogados, Pça. Paulo Elias Antonio |
| Fotografar equipamentos | Pendência da Fase 1; resolve lacuna de evidência e gera material real para teste do cadastro |

---

## 11. Perguntas "Como poderíamos..."

Derivadas dos pontos de dor. Para levar à ideação da Fase 2.

1. Como poderíamos permitir que alguém decida, **antes de se deslocar**, se um local atende ao seu treino?
2. Como poderíamos informar sobre segurança de um local **por horário**, sem transformar a informação em estigma de bairro?
3. Como poderíamos descrever um equipamento de modo que a pessoa saiba se ele **serve para o corpo dela**?
4. Como poderíamos manter a informação sobre condição de equipamento **atual**, sabendo que ela envelhece?
5. Como poderíamos tornar visível o que já existe na cidade para quem **não participa** de nenhum grupo de praticantes?