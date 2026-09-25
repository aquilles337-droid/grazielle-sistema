# Régua do Híbrido

SaaS B2B de triagem tributária: contadores comparam **Simples puro** × **Híbrido** (IBS/CBS por fora) para empresas do Simples Nacional, conforme a LC 214/2025.

**Stack:** Next.js 15 (App Router, Server Actions) · Prisma 6 + MySQL · NextAuth.js (credenciais/JWT) · Tailwind CSS + shadcn/ui · `@react-pdf/renderer`

## Estrutura

```
prisma/schema.prisma            User, Company, Simulation, Lead
prisma/seed.ts                  cria o usuário ADMIN inicial
src/lib/calc/motor.ts           motor de cálculo (função pura, roda no client e no servidor)
src/lib/calc/tabelas-simples.ts Anexos I–V: alíquotas, parcela a deduzir, partilha CBS/IBS
src/actions/*.ts                Server Actions (toda consulta filtra por userId da sessão)
src/app/page.tsx                landing page pública + formulário de lead
src/app/painel/                 área do contador (empresas, simulador, histórico)
src/app/admin/                  área do ADMIN (credenciais de contadores, leads)
src/app/api/simulations/[id]/pdf  geração do PDF white-label (server-side)
src/middleware.ts               1ª barreira de rota (/painel, /admin, /api/simulations)
```

## Rodando localmente

```bash
cp .env.example .env      # preencha DATABASE_URL e NEXTAUTH_SECRET
npm install
npm run db:push           # cria as tabelas
npm run db:seed           # cria o ADMIN (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
npm run dev
```

Checks: `npm run typecheck` · `npm test` (motor de cálculo) · `npm run build`

## Criar o banco só pelo phpMyAdmin

`prisma/setup-phpmyadmin.sql` cria as 4 tabelas e o usuário ADMIN inicial. No phpMyAdmin, selecione o banco → aba **SQL** → cole o arquivo (troque antes o e-mail e o nome do admin no final) → **Executar**. A senha provisória do admin não fica no repositório; troque-a em **Minha conta** (`/painel/conta`) no primeiro acesso. Se o `schema.prisma` mudar, regenere o SQL:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

## Assinaturas (Mercado Pago)

| Plano | Cartão (recorrente) | Pix |
|---|---|---|
| Mensal | R$ 23,90/mês | R$ 21,90 → 30 dias |
| Anual | R$ 239,90/ano | R$ 219,90 → 365 dias |

- **Cartão**: formulário embutido no próprio site (Card Payment Brick — campos em iframe do Mercado Pago, PCI); o token vira uma assinatura recorrente (`/preapproval` com `card_token_id`, status `authorized`). O cliente **não precisa de conta no Mercado Pago**. **3 dias grátis** na primeira assinatura (cartão cadastrado antes; 1 teste por conta e por CPF do titular). Acesso = mês/ano de calendário a cada cobrança aprovada, com 3 dias de carência para retentativas.
- **Pix**: QR Code gerado na tela, liberação automática; os dias se somam em renovações antecipadas. Aviso de renovação 5 dias antes do vencimento.
- Preços e prazos: `src/lib/billing/planos.ts`. Fluxo: `/#planos` → `/assinar` (cadastro) → `/painel/assinatura` (pagamento).
- O acesso é liberado pelo webhook **e** pela sincronização ao abrir a tela de assinatura (não depende só do webhook). O ADMIN sempre tem acesso e pode liberar dias manualmente em `/admin`.
- Variáveis: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`, `APP_URL` (ver `.env.example`).
- Webhook: `https://SEU-DOMINIO/api/webhooks/mercadopago`, eventos **Pagamentos**, **Planos e assinaturas** (assinatura e pagamento recorrente).
- Banco existente: rode no phpMyAdmin, na ordem, `prisma/update-002-assinaturas.sql`, `prisma/update-003-cpf-cartao.sql` e `prisma/update-004-logo-escritorio.sql`.

## Logo do escritório no PDF

Em **Minha conta → Seu escritório no relatório**, o contador envia a logo (PNG/JPG até 1 MB, validada pelo conteúdo do
arquivo) e edita nome do escritório e CRC. A logo fica no banco (`users.logo`, MEDIUMBLOB) — não se perde em deploys —
e aparece no cabeçalho de todos os PDFs dele.

## Apresentação guiada (onboarding)

Tour com destaque de cada botão (driver.js), por tela: Assinatura, Empresas, Simulador, Minha conta e Admin.
Abre sozinho na primeira visita de cada tela (lembrado por usuário no navegador), pode ser repetido pelo botão
**Tutorial** do cabeçalho ou em **Minha conta → Rever apresentação**. Roteiros em `src/components/tour/tours.ts`;
os elementos destacados são marcados com `data-tour="..."`.

## Deploy na Hostinger

1. No hPanel, crie o banco MySQL e libere **MySQL remoto** para o IP do servidor da aplicação (se o app não rodar na mesma hospedagem).
2. `DATABASE_URL="mysql://USUARIO:SENHA@HOST:3306/BANCO"` — senhas com caracteres especiais devem ser URL-encoded.
3. Defina `NEXTAUTH_URL` (URL pública) e `NEXTAUTH_SECRET` (`openssl rand -base64 32`).
4. Build: `npm run build` · Start: `npm start`. Rode `npm run db:push` (ou migrations) e `npm run db:seed` uma vez.

## Segurança / multitenancy

- Toda leitura/escrita de `Company` e `Simulation` usa `where: { userId }` (ou `company: { userId }`) com o ID da sessão; um ID de outro tenant retorna 404.
- `requireUser()` revalida no banco se o usuário continua `ativo` a cada ação — desativar um contador corta o acesso imediatamente.
- Ações de admin chamam `requireAdmin()` além do bloqueio de rota no middleware.
- Ao salvar, o resultado é **recalculado no servidor**; o navegador só envia os inputs.
- O admin gerencia contas e leads, mas não enxerga empresas/simulações dos contadores.

## Premissas de cálculo que vale revisar

- **Base legal:** LC 214/2025 (tabelas do Simples nos Anexos XVIII a XXII) com as alterações da LC 227/2026. Textos em `docs/`.
- **Horizontes:** 2027–2028, 2029, 2030, 2031, 2032 e IVA pleno (2033+). No Híbrido saem do DAS as colunas de CBS e IBS do ano; o ICMS/ISS fica.
- **Partilha por ano:** `shareCBS` (antigo PIS + COFINS) e `shareIBS` (antigo ICMS/ISS) da tabela base. Em 2027–2028 CBS + IBS somam `shareCBS`; de 2029 a 2032 o IBS no DAS é 10/20/30/40% de `shareIBS` e o ICMS/ISS fica com o resto; em 2033 o IBS é `shareIBS` inteiro. Na 6ª faixa (ICMS/ISS fora do DAS) `shareIBS = 0`; em 2027–2028 a 6ª faixa tem nominal 0,1 p.p. menor e CBS própria.
- **Teto do ISS (5ª faixa, Anexos III e IV):** 5% em 2027–2028, 4,5% em 2029, 4% em 2030, 3,5% em 2031 e 3% em 2032; o excedente é repartido pelos coeficientes de CBS e IBS da lei (`TETO_ISS` em `tabelas-simples.ts`).
- **IVA do ano:** 2027–2028 = CBS 9,11% + IBS 0,1% (arts. 344 e 347). 2029–2032 = CBS cheia (+0,1 p.p.) + 10/20/30/40% do IBS pleno — estimativa, pois as alíquotas de referência desses anos serão fixadas pelo Senado. 2033 = IVA pleno (26,5%).
- **Opção pelo Híbrido:** semestral (janeiro ou julho), exercida em setembro ou março, irretratável no semestre (LC 123, art. 13, §§ 9º e 10).
- **ICMS-ST:** vale enquanto existir ICMS (até 2032), com a parcela de ICMS do ano; ignorada no IVA pleno.
- **Exportação:** o DAS sobre exportação exclui CBS, IBS e ICMS/ISS (`shareTotal`) em todos os horizontes.
- **RBT12 = 0** (início de atividade): usa a alíquota nominal.
- **Repasse mínimo:** `null` ("Inviável") quando o ganho do cliente é ≤ 0.
