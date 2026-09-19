Template padronizado de site institucional + agendamento para clínicas (Next.js), pensado para ser clonado por cliente e ajustado (marca, cores, unidades). Todo o conteúdo do site e os módulos ativos são editáveis em runtime pelos painéis `/admin` e `/superadmin`, sem precisar de banco de dados.

## Funcionalidades

- Site institucional (Home, Sobre, Especialidades, CTA, Header/Footer)
- Orçamento de exames/procedimentos: seleciona convênio, busca exames, monta carrinho e gera um PDF do orçamento
- Agendamento: wizard de 5 passos (especialidade → profissional → convênio/exame → data/horário → confirmação)
- Central de Agendamento: página única com abas "Novo Agendamento" / "Minhas Consultas"
- Diretório de profissionais, agrupado por especialidade, com busca — sem link individual por profissional (todos levam ao fluxo de agendamento genérico)
- Área do Cliente: login por telefone (sem senha), histórico de consultas/exames, cancelamento e reagendamento
- Modal de confirmação customizado e reutilizável (`components/ConfirmDialog.js`), sem `window.confirm`
- Chat com IA (Sofia) em `/chat`: responde dúvidas e executa agendamento/cancelamento/reagendamento por linguagem natural, usando o mesmo backend ClinVida
- **Painel `/admin`**: o cliente da clínica edita identidade/contato, marca (cores e imagens), textos institucionais e especialidades — sem tocar em código
- **Painel `/superadmin`**: liga/desliga cada módulo do site, e configura as URLs de API das unidades — sem `.env`, sem redeploy

Todas as páginas/rotas de API acima consomem o backend ClinVida de cada unidade (Matriz/Filial) via proxy (`app/api/agendamento`, `app/api/orcamento`, `lib/clinvida.js`) — cada unidade tem seu próprio backend/banco, sem dado compartilhado entre elas.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Variáveis de ambiente

Copie `.env.example` para `.env`. A partir desta versão, o `.env` guarda **só credenciais e tokens** — tudo o resto (textos, imagens, telefones, links, URLs de API, módulos) é editado em runtime pelos painéis.

| Variável | Para quê |
| --- | --- |
| `ADMIN_USER` / `ADMIN_PASSWORD_HASH` | Login do `/admin` (conteúdo do site). Gere o hash com `node scripts/gerar-hash-senha.mjs "sua-senha"` |
| `SUPERADMIN_USER` / `SUPERADMIN_PASSWORD_HASH` | Login do `/superadmin` (módulos e integrações). Mesmo script acima |
| `SESSION_SECRET` | Assina o cookie de sessão do login. Gere com `openssl rand -hex 32` |
| `SETTINGS_ENC_KEY` | Criptografa em repouso as configurações sensíveis do superadmin (URLs de API). Gere com `openssl rand -hex 32` |
| `OPENAI_API_KEY` | Chave da OpenAI usada pelo chat com IA (Sofia, `/chat`). Sem ela, `FEATURE_CHAT` fica indisponível |
| `OPENAI_MODEL` | Opcional — modelo usado pela Sofia (padrão: `gpt-4.1-mini`) |
| `BLOB_READ_WRITE_TOKEN` | Só na Vercel (ver "Storage sem banco de dados" abaixo) |

**Depois de subir o site pela primeira vez**, entre em `/admin` (cliente) e `/superadmin` (você) para configurar o resto: nome da clínica, telefones, endereços, cores, logo, foto da fachada, textos, especialidades, módulos ligados/desligados e URLs de API das unidades (`API_BASE_URL_MATRIZ`/`FILIAL` de antes). Até a primeira edição, o site usa os mesmos valores padrão que já vinham no template (ver `lib/store/defaults.js`).

### Storage sem banco de dados

O painel grava tudo em dois documentos JSON (`content.json` para o `/admin`, `settings.json` — criptografado — para o `/superadmin`), através de um adaptador com dois drivers (`lib/store/`):

- **Arquivo local** (padrão): grava em `/data` no próprio disco. Funciona out-of-the-box em VPS/servidor próprio, onde o disco é persistente.
- **Vercel Blob**: ativado automaticamente quando `BLOB_READ_WRITE_TOKEN` está definido. Necessário na Vercel porque as functions serverless têm filesystem efêmero — sem essa variável lá, as edições feitas no painel não sobrevivem a um novo deploy. Crie o token em [vercel.com/docs/storage/vercel-blob](https://vercel.com/docs/storage/vercel-blob).

O `/superadmin` mostra qual driver está ativo e avisa se a combinação atual (Vercel sem token) não vai persistir.

### Módulos (antes "feature flags")

Cada funcionalidade liga/desliga por completo (página, link de navegação e rota de API correspondente) pelo `/superadmin`, em **Módulos**. Desligar um módulo esconde o link no Header/Footer e faz a página/rota responder 404.

## O que este template NÃO inclui

Este é um recorte enxuto de uma base maior (`clinsaude-site-main`), sem: blog automatizado, integração com Instagram, WhatsApp (envio/recebimento de mensagens via UAZAPI), página "bio" de links e calendário de datas de saúde. O chat da Sofia funciona apenas no site — a ferramenta de escalar para atendente humano (`lib/chatTools.js`) não notifica ninguém automaticamente nesta versão (sem canal de WhatsApp configurado), apenas orienta o paciente a entrar em contato pelo telefone/WhatsApp da clínica. Para reativar uma escalada real, implemente o envio em `escalar_atendimento`.

O `/admin` cobre identidade/contato, marca, textos das seções da Home e especialidades — os textos internos passo-a-passo do `BookingWizard`/`BudgetWizard`, o boilerplate legal do PDF de orçamento e o corpo da persona da Sofia (`lib/chatSystemPrompt.js`) ainda são fixos no código nesta versão.

## Deploy

Funciona tanto em VPS/servidor próprio (`next build && next start`, com ou sem Docker/PM2) quanto na Vercel — ver "Storage sem banco de dados" acima para a diferença de configuração entre os dois. Configure as variáveis de ambiente do `.env.example` antes de publicar, e depois faça o setup inicial pelos painéis `/admin`/`/superadmin`.
