# Roadmap do MedSync

O roadmap segue o escopo do projeto acadêmico e prioriza uma demonstração
vertical, verificável e pequena. Os itens marcados como futuros não devem ser
interpretados como funcionalidades já disponíveis.

## P0 — Protótipo demonstrável

Objetivo: demonstrar o ciclo administrativo completo de uma consulta.

- Fundação React + TypeScript + Vite para a interface.
- API FastAPI com persistência via SQLAlchemy.
- SQLite como banco padrão do demo e configuração para PostgreSQL.
- Perfis de paciente, profissional e administrador.
- Dados fictícios para acesso rápido à demonstração.
- Catálogo de especialidades e profissionais.
- Disponibilidade do profissional.
- Busca de horários por especialidade, profissional e data.
- Preferência do paciente por período do dia.
- Ordenação explicável dos horários por preferência e proximidade.
- Criação, remarcação e cancelamento de consultas.
- Agenda do profissional.
- Validação de conflito de horários.
- Interface responsiva e estados de carregamento, vazio, sucesso e erro.

### Critérios de saída do P0

- O fluxo “buscar → agendar → visualizar → remarcar → cancelar” pode ser
  demonstrado sem editar o banco manualmente.
- Paciente e profissional visualizam informações coerentes sobre a consulta.
- Um usuário não acessa agendamentos pertencentes a outro perfil.
- Uma segunda tentativa de reservar o mesmo horário é rejeitada.
- Atualizar a página não apaga os dados persistidos.
- Setup, execução, teste e build estão documentados e reproduzíveis.

## P1 — Organização inteligente da agenda

Objetivo: entregar os diferenciais descritos na proposta original sem recorrer
a modelos opacos.

- Confirmação de consultas.
- Estados de consulta realizada e falta.
- Histórico e linha do tempo de alterações.
- Filtros por especialidade, profissional, período e status.
- Evolução do ranking com critérios adicionais e configuração pela equipe.
- Fila de espera compatível com médico, especialidade, datas e período.
- Notificações internas de confirmação, cancelamento e vaga liberada.
- Testes de concorrência usando PostgreSQL.

### Critérios de saída do P1

- Critérios adicionais preservam uma ordem determinística e auditável.
- Um cancelamento encontra apenas entradas compatíveis da fila de espera.
- Aceitar uma vaga da fila revalida a disponibilidade antes de agendar.
- O histórico permite reconstruir as alterações relevantes da consulta.

## P2 — Avaliação posterior

Estes itens dependem de validação, infraestrutura ou dados que não fazem parte
do protótipo:

- Lembretes por e-mail, SMS ou WhatsApp.
- Relatórios básicos para clínicas.
- Avaliação após a consulta.
- Duração variável por profissional ou especialidade.
- Múltiplas clínicas e unidades.
- Integração com calendários externos.
- Estudo de previsão de faltas com dados adequados e governança.

## Fora do produto atual

- Diagnóstico, triagem e recomendação clínica.
- Prontuário eletrônico e anotações médicas.
- Prescrição, exames e laudos.
- Pagamentos e convênios.
- Telemedicina.
- Uso de dados reais no seed ou na demonstração pública.
