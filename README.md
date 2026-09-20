Plataforma multi-empresa (SaaS) de site institucional + agendamento para clínicas (Next.js). Cada clínica ("empresa") é cadastrada pelo `/superadmin` e ganha, automaticamente: banco próprio, subdomínio (`<slug>.PLATFORM_DOMAIN`) ou domínio próprio, e login de `/admin` para editar o conteúdo do site dela — tudo isolado, sem dado compartilhado entre empresas.

## Funcionalidades

- Site institucional (Home, Sobre, Especialidades, CTA, Header/Footer)
- Orçamento de exames/procedimentos: seleciona convênio, busca exames, monta carrinho e gera um PDF do orçamento
- Agendamento: wizard de 5 passos (especialidade → profissional → convênio/exame → data/horário → confirmação)
- Central de Agendamento: página única com abas "Novo Agendamento" / "Minhas Consultas"
- Diretório de profissionais, agrupado por especialidade, com busca — sem link individual por profissional (todos levam ao fluxo de agendamento genérico)
- Área do Cliente: login por telefone (sem senha), histórico de consultas/exames, cancelamento e reagendamento
- Modal de confirmação customizado e reutilizável (`components/ConfirmDialog.js`), sem `window.confirm`
- Chat com IA (Sofia) em `/chat`: responde dúvidas e executa agendamento/cancelamento/reagendamento por linguagem natural, usando o backend ClinVida configurado pra cada empresa
- **Painel `/admin`** (por empresa): edita identidade/contato, marca (cores e imagens), textos institucionais e especialidades — sem tocar em código
- **Painel `/superadmin`** (plataforma): cadastra empresas, gera login de admin e link de acesso automaticamente, configura domínio próprio, URL da API do sistema (ClinVida) e chave da OpenAI de cada uma, e liga/desliga os módulos delas

Cada empresa consome o backend ClinVida configurado só pra ela (`lib/clinvida.js`, `app/api/agendamento`, `app/api/orcamento`) — sem dado compartilhado entre clínicas diferentes.

## Como funciona o multi-tenant

- **Resolução por domínio**: cada requisição é atribuída a uma empresa a partir do `Host` — subdomínio de `PLATFORM_DOMAIN` (`clinica-x.PLATFORM_DOMAIN`) ou domínio próprio cadastrado no `/superadmin`. O domínio raiz da plataforma (só `PLATFORM_DOMAIN`, sem subdomínio) não pertence a nenhuma empresa — é onde vive o `/superadmin` (ver `lib/tenant.js`, `proxy.js`).
- **Banco por empresa**: cada empresa tem seu próprio arquivo SQLite (`data/tenants/<slug>/app.db`), criado automaticamente ao cadastrar a empresa (`lib/platform/db.js`) a partir dos mesmos padrões do template (`lib/store/defaults.js`) — isso é o "replicar o banco". A plataforma em si guarda o cadastro de empresas em `data/platform.db`.
- **Login por empresa**: ao criar uma empresa, o `/superadmin` gera usuário/senha do `/admin` dela automaticamente (mostrados uma única vez na tela — anote/repasse pro cliente). Esse login só funciona no domínio daquela empresa; o login de superadmin (`.env`) só funciona no domínio raiz.
- **Domínio próprio por cliente**: no `/superadmin`, ao editar uma empresa, dá pra informar um domínio próprio dela (ex.: `clinicadocliente.com.br`). O cliente aponta o DNS (registro A) pro IP do servidor; o HTTPS desse domínio é emitido automaticamente na primeira visita (ver Caddy, abaixo).

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) — sem `PLATFORM_DOMAIN` configurada, o domínio raiz (`localhost`) redireciona pro `/superadmin`; cadastre uma empresa lá pra gerar o login de `/admin` dela. Pra testar o site de uma empresa localmente com subdomínio de verdade, configure `PLATFORM_DOMAIN=localhost` no `.env` e acesse `http://<slug>.localhost:3000` (`*.localhost` resolve pra loopback sozinho, sem editar `/etc/hosts`).

### Variáveis de ambiente

Copie `.env.example` para `.env`. Só guarda o que é **global da plataforma** — tudo o que é de uma empresa específica (conteúdo do site, módulos, URL da API, chave da OpenAI) é configurado em runtime pelo `/superadmin` ao criar/editar a empresa.

| Variável | Para quê |
| --- | --- |
| `PLATFORM_DOMAIN` | Domínio raiz da plataforma — cada empresa fica em `<slug>.PLATFORM_DOMAIN`. Vazio = dev local, sem subdomínio (domínio próprio por empresa continua funcionando) |
| `SUPERADMIN_USER` / `SUPERADMIN_PASSWORD` | Login do `/superadmin`, só no domínio raiz. Senha em texto puro |
| `SESSION_SECRET` | Assina o cookie de sessão do login (`/admin` de cada empresa e `/superadmin`). Gere com `openssl rand -hex 32` |
| `SETTINGS_ENC_KEY` | Criptografa em repouso o documento `settings` de cada empresa (URL da API + chave da OpenAI). Gere com `openssl rand -hex 32` |
| `OPENAI_MODEL` | Opcional — modelo padrão da OpenAI quando uma empresa não define um (padrão: `gpt-4.1-mini`) |

### Storage: um banco SQLite por empresa

Ver "Como funciona o multi-tenant" acima. Em termos de arquivos: `data/platform.db` (cadastro de empresas) + `data/tenants/<slug>/app.db` (uma por empresa) + `public/uploads/<slug>/` (uploads de imagem de cada uma). Esses caminhos (`data/` e `public/uploads/`) precisam estar num disco/volume persistente — em Docker/Portainer, ver `docker-compose.yml`.

### Módulos (antes "feature flags")

Cada funcionalidade liga/desliga por completo (página, link de navegação e rota de API correspondente) pelo `/superadmin`, editando a empresa em **Módulos**. Desligar um módulo esconde o link no Header/Footer daquela empresa e faz a página/rota dela responder 404.

## O que este template NÃO inclui

Este é um recorte enxuto de uma base maior (`clinsaude-site-main`), sem: blog automatizado, integração com Instagram, WhatsApp (envio/recebimento de mensagens via UAZAPI), página "bio" de links e calendário de datas de saúde. O chat da Sofia funciona apenas no site — a ferramenta de escalar para atendente humano (`lib/chatTools.js`) não notifica ninguém automaticamente nesta versão (sem canal de WhatsApp configurado), apenas orienta o paciente a entrar em contato pelo telefone/WhatsApp da clínica. Para reativar uma escalada real, implemente o envio em `escalar_atendimento`.

O `/admin` de cada empresa cobre identidade/contato, marca, textos das seções da Home e especialidades — os textos internos passo-a-passo do `BookingWizard`/`BudgetWizard`, o boilerplate legal do PDF de orçamento e o corpo da persona da Sofia (`lib/chatSystemPrompt.js`) ainda são fixos no código nesta versão (compartilhados por todas as empresas).

## Deploy

Feito para rodar em VPS/servidor próprio — via Docker/Portainer (recomendado) ou direto com `next build && next start`/PM2. Como o storage é SQLite em disco, o host precisa ter disco persistente entre reinícios/deploys, e **não** funciona em plataformas serverless (ex.: Vercel), cujo filesystem é efêmero.

### Docker / Portainer

A stack (`docker-compose.yml`) sobe dois serviços: o site e um **Caddy** na frente, que emite HTTPS automaticamente (Let's Encrypt) pro domínio raiz, pro subdomínio de cada empresa e pra qualquer domínio próprio que ela configurar — sem precisar mexer na stack a cada empresa nova (ver `Caddyfile` e `app/api/tenant/domain-check`).

**Antes de subir:**

1. Tenha um domínio seu (`PLATFORM_DOMAIN`) com um registro DNS coringa `*.PLATFORM_DOMAIN` (e o próprio `PLATFORM_DOMAIN`) apontando (registro A) pro IP público do servidor. Sem isso não dá pra emitir certificado nem rotear por subdomínio.
2. Libere as portas **80** e **443** no servidor/firewall — são usadas pelo Caddy pra validar e servir os certificados.
3. Copie `.env.example` para `.env` e preencha `PLATFORM_DOMAIN`, `SUPERADMIN_USER`/`PASSWORD`, `SESSION_SECRET` e `SETTINGS_ENC_KEY`.

**Subindo:**

- **Via Portainer**: Stacks → Add stack → cole o conteúdo de `docker-compose.yml` (ou aponte pro repositório Git) → em Environment variables, cole o conteúdo do seu `.env` → Deploy the stack.
- **Via linha de comando**: `docker compose up -d --build`.

Depois do deploy, acesse `https://PLATFORM_DOMAIN`, entre no `/superadmin` com as credenciais do `.env` e cadastre a primeira empresa — o link (`https://<slug>.PLATFORM_DOMAIN`) e o login de `/admin` dela aparecem na tela na hora. Pra domínio próprio de um cliente, ele aponta o DNS dele pro mesmo IP do servidor e você preenche esse domínio na edição da empresa; o certificado HTTPS dele é emitido sozinho na primeira visita.

Os volumes nomeados (`clinsaude_data`, `clinsaude_uploads`, `caddy_data`, `caddy_config`) garantem que bancos, uploads e certificados sobrevivem a updates/redeploys do container.

### Sem Docker

```bash
npm install
npm run build
npm run start
```

Sem Docker, você mesmo precisa de um proxy reverso (Nginx, Caddy standalone, etc.) na frente pra TLS e para repassar o `Host` original ao Next.js sem reescrevê-lo — a resolução de empresa depende disso. Configure as variáveis de ambiente do `.env.example`, garanta que `data/` e `public/uploads/` fiquem num disco persistente, e cadastre a primeira empresa pelo `/superadmin`.
