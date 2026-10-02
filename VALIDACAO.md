# Validação da versão 0.5

- `npm run build` no frontend: aprovado, TypeScript estrito e Vite.
- `npm test` no backend: aprovado. Cadastro e validações, agenda sem sobreposição, reagendamento, cancelamento, início e conclusão, resumo obrigatório, imutabilidade após conclusão, bloqueio de salas para consultas encerradas e persistência após reiniciar.
- Navegador Chromium: entrada como médica; retorno do chat à agenda; cadastro de paciente; agendamento; início, registro e conclusão; consulta do histórico; edição do perfil; tema noturno nas configurações; ausência do alternador de tema no cabeçalho.
- Responsividade: verificada em 1440 px e 390 px; sem transbordamento horizontal da página em 390 px; configurações acessíveis pelo menu inferior.
- Nenhum erro de JavaScript capturado nos fluxos de interface testados.

Não foi validada uma chamada audiovisual real entre dois dispositivos/redes, nem executado o iniciador em Windows. A área de paciente permanece voltada à demonstração. Não há alegação de prontidão para produção.
