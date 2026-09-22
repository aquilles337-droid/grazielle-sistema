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

- **Partilha CBS/IBS:** `shareCBS` = PIS + COFINS e `shareIBS` = ICMS (Anexos I/II) ou ISS (III/IV/V) da tabela de partilha da LC 123. Na 6ª faixa ICMS/ISS saem do DAS, então `shareIBS = 0`.
- **Horizonte:** "2027" tira só a CBS do DAS e usa IVA = CBS + IBS de transição (9,31%); "Pleno" tira CBS + IBS e usa 26,5%.
- **Exportação:** o DAS sobre exportação exclui a fatia CBS+IBS (`shareTotal`) nos dois horizontes.
- **RBT12 = 0** (início de atividade): usa a alíquota nominal.
- **Repasse mínimo:** `null` ("Inviável") quando o ganho do cliente é ≤ 0.
