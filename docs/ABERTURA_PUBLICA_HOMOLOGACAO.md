# Abertura pública — homologação pendente

## Objetivo comercial

O cliente pede cotação pela Excambia e acompanha operações próprias. A Suppley avalia fornecedores cadastrados e conduz o fornecimento e a importação. O cliente não acessa o cadastro interno de fornecedores, preços de compra, margens ou condições comerciais restritas.

A conversa coleta produto, especificações, quantidade/unidade, destino e prazo. O cliente pode solicitar o registro de uma operação inicial. Esse registro não constitui proposta, compra, contratação ou envio externo. A ferramenta solicitar_cotacao registra uma solicitação estruturada em public_quote_requests, com protocolo, proprietário e conversa validada pelo servidor. Repetições idênticas na mesma conversa retornam o mesmo protocolo. O cliente acompanha as próprias solicitações em Acompanhamento. A fila /solicitacoes e suas APIs são exclusivas de administradores, que podem iniciar análise, encerrar, criar uma operação para o cliente de forma atômica ou vincular uma operação existente do mesmo cliente. A criação usa bloqueio transacional da solicitação e protocolo SOL-id, evitando duplicação e preservando o contador OP existente. Não existe envio automático para fornecedores. A equipe deverá validar o atendimento antes do piloto. Propostas e cálculos comerciais públicos exigem projeção própria de campos autorizados e aprovação interna; os routers internos permanecem bloqueados.

## Migração e configuração

Aplicar drizzle/0050_public_access_mcp.sql e depois drizzle/0051_public_quote_requests.sql primeiro em cópia de homologação MySQL 8. Preserva usuários, senhas e papéis existentes. Novos cadastros públicos aguardam aprovação. Nunca aplicar automaticamente em produção. As tabelas security_limits/security_audit são necessárias antes de iniciar esta versão.

Preservar JWT_SECRET, .env, .env.production, volumes e overrides existentes. Não executar down, down -v, prune nem reiniciar suppley-mysql. Links antigos com proprietário identificado continuam acessíveis ao titular interno ou administrador autenticado, desde que a sessão do proprietário não tenha sido revogada. Links sem proprietário exigem nova emissão. Links novos expiram em uma hora.

O endpoint MCP fica para uma entrega separada. A migração cria a tabela mcp_identities, que permanece sem uso pelo chat público.

## Variáveis de homologação

- APP_URL: origem HTTPS canônica da aplicação, usada para validar Origin atrás do proxy.
- JWT_SECRET: manter o segredo existente, com no mínimo 32 caracteres; não há fallback.
- PUBLIC_AI_PER_MINUTE (padrão 5), PUBLIC_AI_PER_DAY (40), PUBLIC_AI_MAX_OUTPUT_TOKENS (2048, máximo 4096): limites por usuário aprovado. Cada interação admite até 3 chamadas de modelo; não é limite monetário global.
- DATABASE_URL e TEST_DATABASE_URL: somente banco descartável terminado em _test para integração; nunca preencher CI com credenciais de produção.

O servidor mantém a configuração de um proxy reverso usada em produção. Em homologação, validar os cabeçalhos e os limites de tráfego com a mesma topologia do Nginx.

Definir retenção e limpeza periódica de security_limits e security_audit em homologação antes do piloto. Contadores antigos podem ser removidos após o maior intervalo de limitação; registros de auditoria precisam de política de retenção própria.

## Evidências e pendências

TypeScript, build e testes sem MySQL foram executados durante o desenvolvimento. O CI do commit cc02aef aprovou 635 testes com MySQL real, regressão de cotações, TypeScript, build, CodeQL e smoke desktop/mobile. Reexecutar o CI após o incremento de solicitações estruturadas. A homologação humana continua necessária. Não publicar nem fazer deploy antes da homologação.

Em 20/11/2026, evidências do console de produção mostraram atualização NGINX para 1.24.0-2ubuntu7.21, configuração válida, serviço ativo e HTTPS local HTTP/1.1 com status 200 após desativar HTTP/2. Changelog do pacote lista as correções CVE-2026-123007 e CVE-2026-123633 já na revisão .20. Manter HTTP/2 desativado até revisão específica. Reinício de kernel pendente deve ser planejado separadamente.
