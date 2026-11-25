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

Em cada implantação, configure `MCP_RESOURCE_URL=https://<host-do-ambiente>/mcp` e `INTEGRATION_API_RESOURCE_URL=https://<host-do-ambiente>/api/v1`. Cadastre essas duas audiências no provedor OAuth e defina o emissor e a URL do JWKS do ambiente. O proxy HTTPS deve preservar o host público nas requisições encaminhadas ao app.

## Ativar e validar

1. Confirme que o banco do ambiente tem as migrações versionadas registradas, incluindo `0050_public_access_mcp` e `0051_public_quote_requests`.
2. Configure um provedor OAuth compatível com o cliente MCP e cadastre cada aplicação integradora. Configure `MCP_OAUTH_ISSUER`, `MCP_JWKS_URL`, `MCP_RESOURCE_URL` e `INTEGRATION_API_RESOURCE_URL`.
3. Vincule `issuer`, `subject` e `clientId` verificados no provedor ao `userId` aprovado da Excambia em `mcp_identities`. Conceda os escopos de acordo com a aplicação. Emita um token novo após criar ou atualizar o vínculo.
4. Revise a autorização no ambiente em questão e habilite `MCP_AUTHORIZATION_REVIEWED` e as interfaces que serão testadas (`MCP_ENABLED` e/ou `INTEGRATION_API_ENABLED`). Ambas vêm desligadas por padrão.
5. Confirme a descoberta OAuth, autenticação com o cliente real, criação da solicitação e aparecimento na fila, leitura do protocolo, repetição idempotente e bloqueio do protocolo de outra conta. Use um token de cada audiência e verifique que a outra interface o rejeita. Verifique também que um token emitido para outro ambiente é rejeitado.

Para desativar uma interface, volte a variável correspondente para `false` e recarregue apenas o serviço da aplicação.

## Criar os recursos no Auth0

No painel Auth0, crie o tenant da organização. Use um tenant de teste e um de produção quando ambos estiverem disponíveis. Para cada ambiente com URL pública, rode o comando abaixo para revisar os recursos e escopos antes de cadastrá-los.

```sh
node scripts/configure-excambia-auth0.mjs \
  --tenant https://seu-tenant.auth0.com \
  --app-url https://seu-ambiente.exemplo.com
```

Execute novamente com `--apply` para cadastrar as duas APIs. O comando usa um token administrativo temporário na variável de ambiente `AUTH0_MANAGEMENT_TOKEN`, com `read:resource_servers` e `create:resource_servers`. A saída contém os endereços públicos para configurar o serviço. O comando apenas cria recursos ausentes e sinaliza divergências em recursos existentes.

No painel do tenant, habilite **Settings → Advanced → Resource Parameter Compatibility Profile** para que o Auth0 use o parâmetro `resource` que o cliente MCP envia como audiência do token. Cadastre a aplicação-piloto com as URLs de callback exatas e o fluxo Authorization Code com PKCE. Use a política de acesso por aplicação para conceder os escopos necessários à aplicação-piloto. Clientes registrados por descoberta podem ser habilitados conforme a forma de registro e o suporte do cliente escolhido. Referências oficiais do Auth0 sobre o [parâmetro de recurso](https://support.auth0.com/center/s/article/mcp-audience-error-with-auth0) e a [política de acesso a APIs](https://auth0.com/blog/developers-guide-api-access-policies-auth0/).

Crie o vínculo individual em `mcp_identities` com o `sub` e o identificador do cliente do token de acesso. Mantenha o login do portal disponível para aprovar e identificar a conta da Excambia que receberá esse vínculo. Valide a emissão do token e o acesso de ponta a ponta conforme a seção anterior.
