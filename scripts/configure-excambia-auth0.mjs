import { parseArgs } from "node:util";

const scopes = [
  ["operations:read", "Consultar as próprias operações"],
  ["operations:write", "Criar uma operação na própria conta"],
  ["excambia:analyze", "Calcular cubagem e estimativa de importação"],
  ["quotes:read", "Consultar as próprias solicitações de cotação"],
  ["quotes:write", "Registrar uma solicitação de cotação"],
].map(([value, description]) => ({ value, description }));

function httpsOrigin(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Informe ${label} como uma origem HTTPS.`);
  }
  if (url.protocol !== "https:" || value !== url.origin && value !== `${url.origin}/`) {
    throw new Error(`${label} deve conter somente a origem HTTPS, sem caminho ou credenciais.`);
  }
  return url.origin;
}

async function main() {
  const { values } = parseArgs({
    options: {
      tenant: { type: "string" },
      "app-url": { type: "string" },
      apply: { type: "boolean", default: false },
    },
  });
  const tenant = httpsOrigin(values.tenant, "--tenant");
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.auth0\.com$/.test(new URL(tenant).host)) {
    throw new Error("Use o domínio padrão do tenant Auth0, terminado em .auth0.com.");
  }
  const app = httpsOrigin(values["app-url"], "--app-url");
  const resources = [
    { name: "Excambia MCP", identifier: `${app}/mcp` },
    { name: "Excambia REST", identifier: `${app}/api/v1` },
  ].map(resource => ({
    ...resource,
    signing_alg: "RS256",
    token_dialect: "rfc9068_profile",
    token_lifetime: 3600,
    scopes,
  }));

  if (values.apply) {
    const token = process.env.AUTH0_MANAGEMENT_TOKEN;
    if (!token || !/^\S+$/.test(token)) {
      throw new Error("Defina AUTH0_MANAGEMENT_TOKEN no ambiente para aplicar.");
    }
    const request = async (path, options = {}) => {
      const response = await fetch(`${tenant}/api/v2/${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body && { "Content-Type": "application/json" }),
        },
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        throw new Error(`Auth0 Management API retornou HTTP ${response.status}.`);
      }
      return response.json();
    };

    const existingByAudience = new Map();
    for (let page = 0; ; page++) {
      const existing = await request(`resource-servers?per_page=50&page=${page}`);
      if (!Array.isArray(existing)) throw new Error("A listagem de APIs não retornou um array.");
      for (const api of existing) existingByAudience.set(api.identifier, api);
      if (existing.length < 50) break;
    }

    // Review existing configuration before creating either resource.
    for (const resource of resources) {
      const existing = existingByAudience.get(resource.identifier);
      if (!existing) continue;
      const allowed = new Set(existing.scopes?.map(scope => scope.value));
      if (existing.signing_alg !== resource.signing_alg ||
          existing.token_dialect !== resource.token_dialect ||
          existing.token_lifetime !== resource.token_lifetime ||
          !resource.scopes.every(scope => allowed.has(scope.value))) {
        throw new Error(`A API existente ${resource.identifier} tem configuração diferente. Revise-a no painel Auth0.`);
      }
    }
    for (const resource of resources) {
      if (existingByAudience.has(resource.identifier)) {
        console.error(`API já cadastrada: ${resource.identifier}`);
        continue;
      }
      await request("resource-servers", {
        method: "POST",
        body: JSON.stringify(resource),
      });
      console.error(`API criada: ${resource.identifier}`);
    }
  }

  console.log(JSON.stringify({
    tenant,
    applied: values.apply,
    resources,
    environment: {
      MCP_OAUTH_ISSUER: `${tenant}/`,
      MCP_JWKS_URL: `${tenant}/.well-known/jwks.json`,
      MCP_RESOURCE_URL: resources[0].identifier,
      INTEGRATION_API_RESOURCE_URL: resources[1].identifier,
    },
  }, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
