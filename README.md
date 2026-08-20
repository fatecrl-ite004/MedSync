# MediSync — Sistema Inteligente de Agendamento Médico

- **Equipe:** Luiz Henrique dos Passos Silva, Danilo Almeida Brito, Vinicius Silvestre
- **Público-alvo:** Médicos, clínicas, consultórios e pacientes que precisam realizar e administrar agendamentos.
- **Tipo de aplicação:** Aplicação web com backend, banco de dados e módulo de apoio inteligente ao agendamento.
- **Plataforma(s):** Web, com interface responsiva para computador, tablet e smartphone.
- **Domínio:** Saúde e gestão de serviços.
- **Previsão de entrega:** A definir conforme o cronograma do TCC.

## Visão geral

O MediSync é um sistema web para gerenciamento e otimização do agendamento de consultas médicas. A plataforma permitirá que médicos e clínicas organizem horários e disponibilidades, enquanto pacientes poderão consultar opções e realizar agendamentos de forma simples.

Além das funções tradicionais de agenda, o sistema poderá utilizar regras inteligentes para sugerir horários mais adequados, considerar preferências do paciente e aproveitar vagas liberadas por cancelamentos.

A proposta busca reduzir conflitos de horários, tempo gasto com atendimento manual, esquecimentos e períodos ociosos na agenda, mantendo uma solução compatível com o escopo acadêmico do TCC e com foco na experiência de pacientes e profissionais.

## Problema

Em clínicas e consultórios, parte dos agendamentos ainda pode depender de telefone, mensagens ou controles manuais. Esse processo exige disponibilidade de uma pessoa para consultar a agenda, responder ao paciente e registrar alterações, podendo ocasionar demora, duplicidade de horários, falhas de comunicação e dificuldade para visualizar a disponibilidade real dos profissionais.

Cancelamentos e faltas também podem gerar horários ociosos que poderiam ser aproveitados por outros pacientes. Para o paciente, a dependência de atendimento manual dificulta a consulta rápida de horários disponíveis. Para médicos e clínicas, a falta de centralização torna mais difícil acompanhar a agenda e reorganizá-la quando surgem alterações.

Resolver esse problema é relevante porque uma agenda centralizada e organizada pode reduzir erros de agendamento, facilitar o atendimento e melhorar a experiência de pacientes e profissionais.

## Solução proposta

A solução proposta é uma plataforma web centralizada para gerenciamento de consultas. O paciente poderá consultar médicos, especialidades, datas e horários disponíveis e realizar ou solicitar um agendamento. O médico ou responsável pela clínica poderá cadastrar sua disponibilidade, visualizar a agenda, confirmar, alterar ou cancelar consultas e acompanhar o histórico de agendamentos.

Como evolução do agendamento convencional, o sistema poderá possuir um mecanismo inteligente de recomendação de horários. Esse mecanismo poderá classificar opções considerando critérios como especialidade, disponibilidade, preferência de período, proximidade da data e encaixes existentes.

Em caso de cancelamento, uma fila de espera poderá auxiliar no reaproveitamento do horário liberado. A proposta não é realizar diagnóstico médico ou tomar decisões clínicas, mas melhorar a organização administrativa do agendamento.

## Funcionalidades

- Cadastro e autenticação de usuários, com perfis de paciente e profissional.
- Cadastro e gerenciamento de médicos.
- Cadastro de pacientes.
- Cadastro de especialidades médicas.
- Definição da disponibilidade e dos períodos de atendimento.
- Visualização de horários disponíveis.
- Agendamento de consultas.
- Confirmação, alteração e cancelamento de consultas.
- Visualização da agenda do médico por calendário.
- Histórico de agendamentos.
- Filtros por médico, especialidade e data.
- Notificações ou lembretes de consultas.
- **Diferencial: recomendação de horários com base em disponibilidade e preferências do paciente.**
- **Diferencial: fila de espera para reaproveitamento de horários liberados por cancelamentos.**
- **Diferencial: validação automática para impedir conflitos de horários.**

## Diferencial / Concorrência

Existem plataformas consolidadas voltadas ao agendamento e à gestão de consultas, como Doctoralia, além de sistemas próprios utilizados por clínicas. O projeto não pretende competir em quantidade de recursos com soluções comerciais completas. Seu diferencial acadêmico será concentrar-se em uma implementação objetiva de agenda médica acompanhada de mecanismos de apoio à escolha e ao aproveitamento dos horários.

Enquanto um agendamento convencional apenas apresenta vagas livres, o MediSync poderá ordenar horários conforme critérios definidos no sistema e utilizar uma fila de espera para preencher vagas decorrentes de cancelamentos. O profissional continuará responsável por definir sua disponibilidade, e o paciente terá autonomia para visualizar e selecionar opções sem depender exclusivamente de atendimento manual.

## Inovação / Criatividade

A inovação está na combinação de uma interface de calendário com mecanismos de organização inteligente da agenda. Em vez de tratar todos os horários disponíveis da mesma forma, o sistema poderá atribuir uma pontuação às opções conforme critérios como especialidade, período preferido pelo paciente, proximidade da data e disponibilidade do profissional, apresentando primeiro as alternativas mais adequadas.

Outra possibilidade é a fila de espera inteligente: quando uma consulta for cancelada, o sistema poderá identificar pacientes interessados em um horário compatível e disponibilizar a vaga novamente de maneira organizada.

Como extensão experimental, caso existam dados suficientes e o tempo de desenvolvimento permita, poderá ser estudado um modelo de previsão de faltas para apoiar lembretes e confirmações. Essa funcionalidade permanecerá opcional para não comprometer o escopo principal.

## Escopo do projeto

### Essencial (MVP – obrigatório)

- Cadastro e login de usuários.
- Perfis de paciente e profissional.
- Cadastro de médicos, pacientes e especialidades.
- Definição de horários disponíveis.
- Agendamento, alteração e cancelamento de consultas.
- Validação para impedir conflitos de horários.
- Visualização da agenda do médico.
- Banco de dados para armazenamento das informações.

### Importante (se houver tempo)

- Confirmação de consultas.
- Histórico de consultas e agendamentos.
- Filtros por médico, especialidade e data.
- Notificações e lembretes.
- Recomendação de horários por critérios de preferência e disponibilidade.
- Fila de espera e reaproveitamento de horários cancelados.

### Opcional (baixa prioridade)

- Integração com serviço externo de mensagens ou e-mail.
- Relatórios básicos para médicos ou clínicas.
- Avaliação do atendimento após a consulta.
- Estudo experimental de previsão de faltas com Machine Learning, condicionado à existência de dados adequados.

## Planejamento (simplificado)

| Etapa | Descrição | Prazo |
| --- | --- | --- |
| 1 | Definição do projeto e levantamento de requisitos | 13/08/2026 |
| 2 | Desenvolvimento inicial da interface e modelagem do banco de dados | A definir |
| 3 | Desenvolvimento do backend e integração das funcionalidades | A definir |
| 4 | Implementação dos recursos inteligentes, testes e validação | A definir |
| 5 | Documentação, correções e entrega final | A definir |

## Tecnologias (opcional neste momento)

Sugestão inicial:

- **Frontend:** React com JavaScript ou TypeScript.
- **Backend:** FastAPI (Python) ou Node.js.
- **Banco de dados:** PostgreSQL.
- **API:** REST.
- **Módulo inteligente:** Python para regras de recomendação e, caso a extensão experimental seja implementada, Machine Learning.
- **Versionamento:** Git e GitHub.

A escolha definitiva das tecnologias poderá ser ajustada durante o desenvolvimento conforme os requisitos da disciplina e a experiência da equipe.
