# MediSync — Área médica v0.5

Projeto acadêmico React + TypeScript + Express + Socket.IO. Evolução da base Doctor Focus v0.4, mantendo a identidade visual e a área de paciente para testes.

## Abrir no Windows

1. Instale Node.js 20 ou superior, com npm.
2. Extraia **todo o ZIP** para uma pasta. Não execute de dentro do arquivo compactado.
3. Abra `INICIAR-WINDOWS.bat`. Na primeira vez, ele instala as dependências e precisa de internet.
4. Aguarde os dois terminais iniciarem e abra http://localhost:5173.
5. Clique em **Entrar como Dra. Ana**. Mantenha os terminais abertos.

Se preferir, abra dois terminais na pasta extraída:

```powershell
cd backend
npm.cmd ci
npm.cmd start
```

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

No macOS/Linux, use `npm` no lugar de `npm.cmd`. API: http://localhost:3000. Se uma porta estiver ocupada, encerre a instância anterior antes de abrir outra. O frontend usa a API local na porta 3000.

## O que foi completado

- **Agenda:** nova consulta, pesquisa por paciente/serviço, filtros por data e status, reagendamento, cancelamento com motivo, início e conclusão do atendimento.
- **Validações:** horários futuros para agendar/reagendar, duração entre 10 e 240 minutos e bloqueio de sobreposição de consultas.
- **Pacientes:** cadastro, busca, contato, alergias informadas e histórico individual de consultas e registros.
- **Registro do atendimento:** resumo e plano/orientações, edição enquanto em atendimento, leitura após conclusão. É necessário salvar o resumo antes de concluir.
- **Perfil médico:** edição de nome, CRM, título, cidade, estado, especialidades e apresentação. Formação, experiências e catálogo continuam com os exemplos da base.
- **Navegação:** botão de retorno acima do conteúdo, com a origem da navegação. Abrir o chat pela agenda permite voltar à agenda; abrir pelo painel permite voltar ao painel. Ao sair da chamada, câmera/microfone são liberados.
- **Tema:** claro/escuro somente nas configurações, sem botão no cabeçalho. Configurações também acessíveis no menu inferior, que permite rolagem horizontal em telas pequenas.
- **Persistência:** perfil, pacientes, agenda, registros, mensagens, preferências, notificações e demais dados são gravados localmente.
- **Qualidade de uso:** status em português, estados vazios, feedback de erros, formulários com foco contido e confirmação antes de descartar alterações, opção de sair da conta.

## Roteiro para apresentar a área médica

1. Entre como médica e abra **Consultas**.
2. Cadastre um paciente e clique em **Nova consulta**; escolha uma data futura.
3. Teste **Reagendar** e a busca/filtros da agenda.
4. Clique em **Iniciar atendimento**, depois **Registrar atendimento**.
5. Preencha e salve o resumo e o plano; clique em **Concluir**.
6. Abra **Histórico** para ver as consultas e os registros do paciente.
7. Abra um **Chat** pela agenda e use **Voltar para Consultas**.
8. Edite o perfil e altere o tema em **Configurações**.
9. Reinicie o backend e entre novamente: os dados permanecem.

Consultas iniciais são criadas em datas relativas à primeira execução. Consultas passadas ainda confirmadas continuam visíveis para que o médico possa resolvê-las; não são contabilizadas como “futuras”.

## Chat e telemedicina

Para testar os dois lados, use a janela normal como médica e uma janela anônima como João. Crie a sala em uma consulta de **João Silva**; os outros pacientes são cadastros de demonstração sem login próprio. Autorize câmera e microfone nos dois lados. A consulta deve estar confirmada ou em atendimento; consultas canceladas/concluídas não abrem novas salas.

O chat, avaliações, notificações, denúncias, feedback e opções de acessibilidade da versão anterior foram mantidos. Salas vinculadas são encerradas quando a consulta é concluída ou cancelada.

## Dados locais

O backend cria `backend/data/medisync.json` na primeira execução e usa gravação em arquivo temporário seguida de substituição. Para backup, pare o backend e copie a pasta `data`. Para reiniciar a demonstração do zero, pare o backend e **renomeie** essa pasta, preservando a cópia. Atualizações do projeto devem manter a pasta `data` da instalação anterior.

Esse armazenamento é para uma instância local, sem banco multiusuário e sem criptografia. Não execute vários backends sobre o mesmo arquivo. Para testes isolados, a variável `MEDISYNC_DATA_FILE` permite escolher outro arquivo.

## Verificações

```powershell
cd backend
npm.cmd test
```

O teste usa dados temporários e verifica cadastro, restrição de papel nos novos endpoints médicos, conflitos de horário, reagendamento, transições de status, cancelamento, registro obrigatório, bloqueio de edição após conclusão e persistência após reiniciar.

```powershell
cd frontend
npm.cmd run build
```

Compila TypeScript estrito e gera o frontend em `dist`.

## Limites desta entrega

Esta é uma versão funcional de demonstração da área médica, não um sistema clínico pronto para produção. O acesso por papel é demonstrativo e não autentica identidades; os endpoints originais continuam sem autorização real. Use apenas dados fictícios. Um produto real ainda precisa de autenticação e autorização em todas as rotas e eventos, banco apropriado, trilha de auditoria, proteção de dados e revisão LGPD. O registro local não constitui prontuário certificado, receita ou documento assinado digitalmente.

WebRTC usa STUN público; uma chamada entre redes diferentes pode exigir TURN e HTTPS. A qualidade audiovisual real depende dos dispositivos, permissões e rede. Os controles locais de navegação usam histórico em memória: recarregar a página volta ao login, preservando os dados salvos no backend.
