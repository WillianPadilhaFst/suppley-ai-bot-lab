# Integrações da Excambia

O MCP e a API REST usam a mesma fila de solicitações de cotação do portal. A solicitação gera um protocolo para atendimento pela equipe comercial. A estimativa de importação é uma referência calculada com dados históricos; a proposta comercial segue o fluxo da equipe.

## Operações disponíveis

| Método e rota REST | Ferramenta no MCP | Escopo |
| --- | --- | --- |
| `POST /api/v1/cotacoes` | `solicitar_cotacao` | `quotes:write` |
| `GET /api/v1/cotacoes` | `consultar_minhas_solicitacoes` | `quotes:read` |
| `GET /api/v1/cotacoes/{id}` | `status_solicitacao_cotacao` | `quotes:read` |
| `GET /api/v1/operacoes` | `minhas_operacoes` | `operations:read` |
| `POST /api/v1/operacoes` | `criar_minha_operacao` | `operations:write` |
| `GET /api/v1/operacoes/{id}` | `status_operacao` | `operations:read` |
| `POST /api/v1/cubagem` | `cubagem` | `excambia:analyze` |
| `POST /api/v1/estimativas/importacao` | `estimar_custo_importacao` | `excambia:analyze` |

As consultas retornam somente os dados públicos do titular vinculado ao token. As listagens retornam até 100 registros. O MCP usa Streamable HTTP em `/mcp`. Use a API REST pelo backend da aplicação integradora, enviando `Authorization: Bearer <access_token>`. A API tem audiência OAuth própria (`https://<host>/api/v1`); o token do MCP tem audiência `https://<host>/mcp`.

## Registrar uma solicitação

```sh
curl "$EXCAMBIA_API_URL/cotacoes" \
  -H "Authorization: Bearer $EXCAMBIA_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: pedido-381" \
  --data '{
    "produto": "Embalagem PET",
    "especificacoes": "Frasco transparente de 500 ml com tampa",
    "quantidade": "1500",
    "unidade": "UN",
    "destinoCidade": "Itajaí",
    "destinoUf": "SC",
    "prazoDesejado": "Em até 90 dias"
  }'
```

O resultado HTTP 200 contém o `id` (protocolo numérico), os dados enviados e o `status`. Os status possíveis são `recebida`, `em_analise`, `vinculada` e `encerrada`. O campo `operacaoId` é preenchido pelo atendimento quando houver vínculo.

Use uma chave estável por solicitação, com até 128 caracteres alfanuméricos, ponto, hífen, sublinhado ou til. No MCP, envie a chave no argumento `chaveIdempotencia`. A mesma chave e os mesmos dados sob a mesma conta devolvem o protocolo existente, inclusive em tentativas alternadas entre REST e MCP. Com dados diferentes, a REST retorna 409. Os erros de validação usam 400, credenciais inválidas usam 401, escopo ausente usa 403, registros ausentes ou de outra conta usam 404 e limites de uso retornam 429.

A criação de operação recebe um JSON com `titulo`. Cada envio cria uma operação; em caso de perda de resposta, consulte as operações antes de reenviar.

## Configurar por ambiente

| Ambiente | Configuração | Como validar |
| --- | --- | --- |
| Desenvolvimento | `.env` a partir de `.env.example` | Os testes locais simulam o provedor. Para conectar um cliente externo, use um endereço HTTPS de desenvolvimento e um cliente OAuth de teste. |
| CI | Variáveis temporárias dos testes e MySQL descartável | O workflow Test & Build verifica HTTP, permissões, migrações e empacotamento. |
| Homologação | Variáveis no próprio serviço e banco de homologação | Use o domínio e o cliente OAuth desse ambiente para testar a conexão e a fila comercial. |
| Produção | `.env.production` no deploy via Compose | Use o domínio público e o cliente OAuth de produção. Valide primeiro com uma conta-piloto aprovada. |

## Ativar o OAuth da Excambia

Esta branch atualiza a imagem de produção `landing-c3e0dc5`. No banco já existente, confirme as tabelas `public_quote_requests`, `security_audit` e `security_limits`, faça backup e aplique apenas o SQL aditivo `drizzle/0053_excambia_oauth.sql` se `excambia_oauth_records` ainda não existir. A branch principal da integração mantém o histórico versionado para novas instalações.

Configure:

| Variável | Valor |
| --- | --- |
| `APP_URL` | Origem HTTPS do ambiente |
| `MCP_RESOURCE_URL` | `https://<host>/mcp` |
| `INTEGRATION_API_RESOURCE_URL` | `https://<host>/api/v1` |
| `EXCAMBIA_OAUTH_JWKS` | JWKS privado com uma chave RSA para o ambiente |
| `EXCAMBIA_OAUTH_CLIENTS` | JSON dos clientes cadastrados e suas URLs de retorno |
| `EXCAMBIA_OAUTH_CHATGPT` | `true` para aceitar o cliente oficial do ChatGPT via CIMD |
| `EXCAMBIA_OAUTH_ENABLED` | `true` para iniciar o emissor próprio |

O emissor é `https://<host>/oauth`. O proxy HTTPS deve preservar o host público e informar o esquema HTTPS ao app. Gere a chave no terminal do ambiente e salve o valor no gerenciador de segredos. Exemplo de geração em arquivo local com acesso restrito:

```sh
umask 077
node --input-type=module -e 'import { generateKeyPairSync, randomUUID } from "node:crypto"; const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 }); console.log(JSON.stringify({ keys: [{ ...privateKey.export({ format: "jwk" }), kid: randomUUID() }] }));' > excambia-oauth-jwks.json
```

Use chaves independentes por ambiente. A descoberta pública expõe apenas a parte pública da chave.

Cadastre um cliente OAuth público por integração, com a URL de retorno exata fornecida pelo aplicativo. Exemplo do JSON em `EXCAMBIA_OAUTH_CLIENTS`:

```json
[
  {"client_id":"excambia-mcp-piloto","client_name":"Assistente piloto","redirect_uris":["https://cliente.exemplo.com/callback"],"resource":"mcp"},
  {"client_id":"excambia-rest-piloto","client_name":"Aplicativo piloto","redirect_uris":["https://app.exemplo.com/callback"],"resource":"rest"}
]
```

Nos clientes de terceiros, use Authorization Code com PKCE S256. Para o ChatGPT, habilite CIMD e confirme que o painel do conector mostra `https://chatgpt.com/oauth/client.json` e a URL de retorno estável `https://chatgpt.com/connector_platform_oauth_redirect`. A Excambia aceita metadados e chaves apenas desses endereços oficiais. Confira o [fluxo do ChatGPT](https://developers.openai.com/plugins/build/auth). Solicite pelo menos um escopo da tabela acima. O usuário faz login com a conta aprovada da Excambia e autoriza o aplicativo. A aprovação e os dados temporários do OAuth ficam no MySQL. Os tokens expiram em uma hora. Clientes que solicitam e recebem `offline_access` com `prompt=consent` podem renovar o token. A renovação usa rotação, com até 24 horas de validade por token e consentimento válido por sete dias. Revogar a sessão do portal invalida o acesso e a renovação.

1. Revise as permissões e habilite `MCP_AUTHORIZATION_REVIEWED` e as interfaces a testar (`MCP_ENABLED` e/ou `INTEGRATION_API_ENABLED`).
2. Teste com um cliente OAuth real. Confira a descoberta, o consentimento, a abertura da cotação na fila, a leitura do protocolo e a repetição idempotente.
3. Verifique se o token é rejeitado na outra interface, em outro ambiente e após a revogação da sessão. Confirme que a conta só consulta os próprios registros.

Para desativar uma interface, volte a variável correspondente para `false` e recarregue o serviço da aplicação.

As instalações que já usam um emissor externo podem manter `EXCAMBIA_OAUTH_ENABLED=false` e configurar `MCP_OAUTH_ISSUER`, `MCP_JWKS_URL` e os vínculos em `mcp_identities`.

A manutenção do MySQL pode remover registros OAuth já expirados em lotes pelo índice de `expiresAt`. Uma consulta de limpeza é `DELETE FROM excambia_oauth_records WHERE expiresAt < UNIX_TIMESTAMP() LIMIT 1000`.
