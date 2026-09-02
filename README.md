# MedSync

Protótipo acadêmico de um sistema web para organizar disponibilidades e
agendamentos médicos.

**Equipe:** Luiz Henrique dos Passos Silva, Danilo Almeida Brito e Vinicius
Silvestre.

> [!IMPORTANT]
> O MedSync não é prontuário eletrônico, não realiza diagnóstico ou triagem e
> não deve ser usado para emergências ou decisões clínicas. Os dados e usuários
> do demo são fictícios.

## Sobre o projeto

O MedSync centraliza a agenda de profissionais para reduzir consultas marcadas
manualmente, horários duplicados e períodos ociosos. O recorte atual demonstra
o fluxo administrativo principal: disponibilizar horários, encontrar uma vaga,
agendar, visualizar, remarcar e cancelar uma consulta.

O público-alvo definido no projeto original inclui médicos, clínicas,
consultórios e pacientes. A aplicação é web e responsiva para computador,
tablet e smartphone.

## Protótipo atual

O protótipo foi estruturado em três experiências:

- **Paciente:** pesquisa por especialidade/profissional, consulta horários e
  gerencia seus agendamentos.
- **Profissional:** acompanha a própria agenda e administra disponibilidade.
- **Administrador:** acompanha os cadastros e a atividade da demonstração; os
  cadastros administrativos expostos nesta etapa são operados pela API.

O P0 se concentra em:

- autenticação e separação dos perfis;
- profissionais, pacientes e especialidades;
- disponibilidade e visualização de horários livres;
- ordenação explicável por preferência de período e proximidade da data;
- agendamento, remarcação e cancelamento;
- agenda do profissional;
- validação de conflitos;
- persistência dos dados.

Confirmação, histórico completo, notificações internas, fila de espera e a
evolução das regras de recomendação estão planejados para a próxima etapa.
Machine Learning para previsão de faltas continua opcional e não integra este
protótipo.

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Interface | React, TypeScript e Vite |
| API | FastAPI e Python |
| Persistência | SQLAlchemy |
| Banco padrão do demo | SQLite |
| Banco recomendado | PostgreSQL 16 |
| Integração | API REST/JSON |

SQLite permite iniciar a demonstração sem infraestrutura adicional.
PostgreSQL é recomendado para desenvolvimento compartilhado e para validar
concorrência com maior rigor.

## Estrutura

```text
MedSync/
├── backend/               API FastAPI, domínio e testes
├── frontend/              aplicação React/TypeScript
├── docs/                  arquitetura, decisões e roadmap
├── .env.example           variáveis de ambiente de referência
├── docker-compose.yml     PostgreSQL opcional
└── Makefile               atalhos para desenvolvimento
```

## Pré-requisitos

- Python 3.11 ou superior.
- Node.js 20 ou superior.
- pnpm via Corepack.
- Docker Desktop somente se quiser usar PostgreSQL.
- Git.

## Início rápido com SQLite

Clone o repositório e entre na pasta do projeto. Os comandos abaixo devem ser
executados a partir da raiz do MedSync.

### Windows PowerShell

Prepare a API:

```powershell
Copy-Item .env.example .env
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt
python -m uvicorn app.main:app --app-dir backend --reload --env-file .env
```

Em outro terminal, prepare a interface:

```powershell
corepack enable
pnpm --dir frontend install
pnpm --dir frontend dev
```

### Linux ou macOS

Prepare a API:

```bash
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
python -m uvicorn app.main:app --app-dir backend --reload --env-file .env
```

Em outro terminal, prepare a interface:

```bash
corepack enable
pnpm --dir frontend install
pnpm --dir frontend dev
```

Depois de iniciar os dois processos:

- Interface: <http://localhost:5173>
- API: <http://localhost:8000>
- Documentação interativa da API: <http://localhost:8000/docs>

## Contas de demonstração

As contas são criadas pelo seed da API e usam exclusivamente identidades
fictícias.

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Administrador | `admin@medsync.test` | `demo123` |
| Paciente | `paciente@medsync.test` | `demo123` |
| Clínica geral | `medico@medsync.test` | `demo123` |
| Cardiologia | `cardiologista@medsync.test` | `demo123` |
| Dermatologia | `dermatologista@medsync.test` | `demo123` |
| Pediatria | `pediatra@medsync.test` | `demo123` |

Essas credenciais são públicas por definição e nunca devem ser reutilizadas em
outro ambiente.

## PostgreSQL opcional

O Compose contém somente o PostgreSQL, pois frontend e backend ainda não têm
Dockerfiles próprios.

1. Inicie o banco:

   ```bash
   docker compose up -d postgres
   ```

2. Em `.env`, substitua `DATABASE_URL` pela URL PostgreSQL comentada no arquivo.

3. Reinicie a API.

Para acompanhar ou encerrar o serviço:

```bash
docker compose logs -f postgres
docker compose down
```

O volume nomeado `medsync_postgres_data` preserva os dados entre reinícios do
contêiner.

## Verificações de desenvolvimento

Com o ambiente Python ativo e as dependências instaladas:

```bash
python -m pytest backend
```

Para validar a interface:

```bash
pnpm --dir frontend lint
pnpm --dir frontend build
```

O frontend ainda não declara uma suíte automatizada própria; lint, build e a
validação manual dos fluxos responsivos são as verificações disponíveis neste
estágio.

Na revisão de 01/09/2026, a suíte do backend concluiu **8 testes**, o lint do
frontend passou e o build de produção foi gerado com sucesso.

Em sistemas com `make`, os mesmos atalhos podem ser consultados com:

```bash
make help
```

## Requisitos preservados da proposta original

O projeto original definiu como essenciais cadastro e login, perfis de paciente
e profissional, cadastros de médicos/pacientes/especialidades, disponibilidade,
agendamento, remarcação, cancelamento, prevenção de conflitos, agenda do médico
e armazenamento em banco.

Como evoluções, foram propostos confirmação, histórico, filtros, lembretes,
recomendação de horários e reaproveitamento de cancelamentos por fila de espera.
Integrações externas, relatórios, avaliações e previsão de faltas foram
classificados como opcionais.

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md)
- [Decisões de produto](docs/PRODUCT_DECISIONS.md)
- [Roadmap](docs/ROADMAP.md)

## Segurança e uso de dados

O projeto ainda é um protótipo acadêmico. Antes de receber usuários ou dados
reais, será necessária uma revisão de autenticação, autorização, LGPD,
auditoria, retenção, recuperação de conta, segredos e segurança operacional.
Não cadastre informações médicas ou dados pessoais reais na demonstração.
