# Suppley Bot — Contingência NGINX HTTP/2 (20/11/2026)

## Escopo e situação

- Alerta DigitalOcean: CVE-2026-123007 e CVE-2026-123633, divulgados em 18/11/2026.
- A Droplet `suppley-bot` executa Ubuntu 24.04 (imagem de origem); o `docker-compose.yml` do repositório usa contêineres Node.js e MySQL, **sem contêiner NGINX**.
- O exemplo de proxy reverso do `DEPLOYMENT.md` **habilitava** HTTP/2 em `listen 443 ssl http2;`. Isso **não comprova** que a configuração real do servidor está igual.
- O estado real do NGINX do host — versão, módulos e HTTP/2 — **não foi inspecionado**. Não marque a falha como resolvida a partir de uma alteração no GitHub.
- Nenhuma modificação de produção é aplicada por este PR.

## Contenção temporária recomendada

O CERT-EU recomenda desabilitar HTTP/2 nos listeners NGINX expostos à internet, até que a atualização de segurança seja aplicada. Manter `listen 443 ssl;` (sem `http2`) e remover diretivas `http2 on;` aplicáveis. HTTPS continua ativo e os clientes podem usar HTTP/1.1.

**Esta contenção cobre as DUAS falhas HTTP/2 do alerta, não substitui a atualização do NGINX nem elimina outros CVEs divulgados em 18/11/2026.**

### Procedimento na Droplet (quando houver acesso autorizado)

1. Criar snapshot/backup atualizado da Droplet e conferir a restauração disponível (snapshot antigo não é backup atual).
2. Validar versão e configuração ativa:

   ```bash
   sudo nginx -v
   sudo nginx -t
   sudo nginx -T 2>/dev/null | grep -nE 'listen.*http2|^[[:space:]]*http2[[:space:]]+on'
   apt-cache policy nginx
   ```

3. Examinar o arquivo real do site no host, pois pode estar em `/etc/nginx/sites-enabled/`, `/etc/nginx/conf.d/` ou em outro caminho. Verificar se HTTP/2 está em **qualquer** virtual host exposto e se existem outros serviços dependentes de HTTP/2.
4. **Somente após identificar o arquivo de configuração real**, executar o script assistido versionado:

   ```bash
   sudo bash ops/nginx/mitigate-http2.sh --check
   sudo bash ops/nginx/mitigate-http2.sh --apply /etc/nginx/sites-available/suppley
   ```

   O segundo caminho é **exemplo**: substituí-lo pelo caminho efetivamente instalado no servidor. O script cria backup, altera apenas o arquivo informado, roda `nginx -t`, verifica a presença de diretivas HTTP/2 explícitas em outros arquivos e só recarrega NGINX se passar nas verificações. Não modifica Docker, MySQL, JWT, proxy upstream, certificados nem aplicações. Caso encontre HTTP/2 em outros arquivos, reverte e pede revisão manual.
5. Validar interface, login, chat, acompanhamento, APIs e WebSocket do Suppley por HTTPS; verificar logs do NGINX e os do aplicativo. Teste HTTP/2 no domínio público pode refletir um CDN externo, não necessariamente o NGINX da origem.
6. Registrar evidência da versão, `nginx -T` (sem segredos), teste funcional e horário do reload.

### Atualização definitiva

Atualizar NGINX para um pacote **com a correção da distribuição**. O NGINX upstream corrigiu os CVEs em 1.30.7 e 1.31.9; o Ubuntu pode aplicar **backports** com outro número de versão. Confirmar changelog/USN do pacote efetivamente instalado antes de concluir conformidade. Fazer backup e testar `nginx -t` antes de reload. Auditar também as demais vulnerabilidades divulgadas no mesmo dia.

### Rollback

O script registra o caminho `*.before-http2-mitigation.*.bak`. Se necessário, restaurar o backup correspondente e validar:

```bash
sudo cp -p /caminho/backup.bak /caminho/config-original
sudo nginx -t && sudo systemctl reload nginx
```

Rollback retorna a configuração anterior, **inclusive o risco de HTTP/2**: usar apenas quando necessário, com plano para corrigir em seguida.

## Restrições do acesso atual

O conector DigitalOcean dá acesso ao inventário da Droplet, snapshots e ações administrativas, mas **não ao shell/SSH**, nem expõe edição dos arquivos NGINX. O GitHub só altera a fonte, não o proxy em execução. Portanto esta alteração no repositório é **preparação de mitigação**, não comprovação de remediação em produção.

## Fontes oficiais

- NGINX advisories: https://nginx.org/en/security_advisories.html
- CERT-EU: https://cert.europa.eu/publications/security-advisories/2026-022/
