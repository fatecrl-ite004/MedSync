# Decisões de produto

Este documento registra as decisões que reduzem ambiguidades do protótipo do
MedSync. Elas podem ser revistas pela equipe, mas devem ser alteradas de forma
explícita para que interface, API e banco de dados continuem coerentes.

## PD-001 — Nome do produto

**Status:** decidido

**Decisão:** usar **MedSync** no repositório, na interface e na documentação.

O README original alternava entre “MediSync” e “MedSync”. A grafia do
repositório foi adotada como referência.

## PD-002 — Limite clínico

**Status:** decidido

**Decisão:** o produto organiza agendamentos; ele não realiza atendimento
clínico, diagnóstico, triagem, prescrição nem mantém prontuário.

Campos clínicos e dados sensíveis de saúde não fazem parte do protótipo. A
“inteligência” descrita no projeto se refere apenas à organização da agenda.

## PD-003 — Perfis e responsabilidades

**Status:** decidido

**Decisão:** o protótipo possui três perfis operacionais:

- **Paciente:** pesquisa disponibilidade e gerencia as próprias consultas.
- **Profissional:** configura sua disponibilidade e acompanha sua agenda.
- **Administrador:** mantém especialidades e cadastros necessários à
  demonstração.

O administrador existe para dar um responsável aos cadastros-mestre exigidos
no escopo original. Não há, neste momento, hierarquia de clínicas, unidades ou
permissões administrativas granulares.

## PD-004 — Recorte vertical do MVP

**Status:** decidido

**Decisão:** priorizar o fluxo completo de agenda:

1. o profissional disponibiliza períodos;
2. o paciente encontra um horário livre;
3. o paciente agenda uma consulta;
4. paciente e profissional visualizam o mesmo agendamento;
5. o paciente pode remarcar ou cancelar;
6. o sistema não permite conflito de horário.

Recursos que não fortalecem diretamente esse fluxo ficam para fases futuras.

## PD-005 — Regras temporais do demo

**Status:** decidido

**Decisão:** usar consultas de 30 minutos e o fuso
`America/Sao_Paulo` no recorte atual.

- Horários passados não podem ser agendados.
- Um horário cancelado volta a ficar disponível.
- Uma remarcação só é concluída se o novo horário puder ser reservado.
- Um paciente também não pode manter duas consultas sobrepostas.

Duração configurável e operação em múltiplos fusos ficam fora do MVP.

## PD-006 — Estados do agendamento

**Status:** decidido

**Decisão:** o fluxo básico diferencia consultas agendadas e canceladas. A
evolução poderá acrescentar confirmação, realização e falta sem alterar o
propósito administrativo do sistema.

Cancelamentos devem preservar o registro. Exclusão física de consultas não é
uma ação de produto.

## PD-007 — Persistência por ambiente

**Status:** decidido

**Decisão:** SQLite é o padrão para executar e avaliar o demo com o mínimo de
dependências. PostgreSQL 16 é a opção recomendada para desenvolvimento
compartilhado e evolução do produto.

A aplicação deve receber a conexão por `DATABASE_URL`; regras de negócio não
devem depender diretamente de um banco específico. Antes de uso real, a
proteção transacional contra sobreposição deve ser validada no PostgreSQL.

## PD-008 — Arquitetura da aplicação

**Status:** decidido

**Decisão:** manter frontend React/TypeScript separado da API FastAPI. O
frontend não acessa o banco diretamente e a API concentra validação,
autorização e regras de agenda.

Essa separação permite evoluir a interface e, futuramente, as regras de
recomendação em Python sem misturar responsabilidades.

## PD-009 — Recomendação explicável antes de Machine Learning

**Status:** decidido

**Decisão:** a primeira recomendação de horários é determinística e
explicável, considerando disponibilidade, preferência de período e proximidade
da data.

Machine Learning para previsão de faltas permanece experimental e fora do
protótipo. Nenhum recurso deve ser apresentado como “IA” sem comportamento
implementado e verificável.

## PD-010 — Dados e privacidade

**Status:** decidido

**Decisão:** coletar apenas os dados mínimos para identificação e agenda.

- Dados de demonstração devem ser claramente fictícios.
- Senhas nunca devem ser armazenadas em texto puro.
- Pacientes acessam apenas os próprios agendamentos.
- Profissionais acessam apenas a própria agenda.
- CPF, número real de CRM e informações clínicas não são necessários no demo.

Uma revisão formal de LGPD, retenção, auditoria e segurança será obrigatória
antes de qualquer uso com pessoas ou dados reais.

## Questões abertas para a equipe

- O cadastro de profissionais será aberto ou dependerá de aprovação do admin?
- O produto atenderá uma única clínica ou várias organizações isoladas?
- O paciente escolherá apenas médicos ou outros profissionais de saúde?
- Quais canais de lembrete serão usados após o protótipo?
- Qual política de antecedência mínima será aplicada a cancelamentos?
