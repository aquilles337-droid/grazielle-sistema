import { z } from "zod";
import { isValidCNPJ, onlyDigits } from "@/lib/format";

const fracao = (max = 1) => z.number().finite().min(0).max(max);
const reais = z.number().finite().min(0).max(1_000_000_000);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  senha: z.string().min(1).max(200),
});

export const leadSchema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(191),
  telefone: z
    .string()
    .transform(onlyDigits)
    .pipe(z.string().min(10, "Telefone inválido").max(13, "Telefone inválido")),
  crc: z.string().trim().toUpperCase().min(4, "Informe seu CRC").max(30),
});

export const companySchema = z.object({
  nome: z.string().trim().min(2, "Informe a razão social").max(160),
  cnpj: z
    .string()
    .transform(onlyDigits)
    .refine(isValidCNPJ, "CNPJ inválido"),
});

export const accountantSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(191),
  senha: z.string().min(8, "Mínimo de 8 caracteres").max(100),
  escritorio: z.string().trim().max(160).optional().transform((v) => v || undefined),
  crc: z.string().trim().toUpperCase().max(30).optional().transform((v) => v || undefined),
});

export const simulationInputSchema = z.object({
  empresa: z.object({
    anexo: z.enum(["I", "II", "III", "IV", "V"]),
    faixa: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
    rbt12: reais,
    receitaMensal: reais,
    pctExportacao: fracao(),
    pctB2B: fracao(),
    pctComprasCreditaveis: fracao(5), // compras podem superar a receita no mês
    reducaoSaida: fracao(),
    reducaoCompras: fracao(),
  }),
  premissas: z.object({
    cbsReferencia: fracao(),
    ibsTransicao: fracao(),
    ivaPleno: fracao(),
    repasseEsperado: fracao(),
    saldoCredorRecuperavel: z.boolean(),
    horizonte: z.enum(["2027", "PLENO"]),
  }),
});

export const saveSimulationSchema = z.object({
  companyId: z.string().min(1).max(40),
  titulo: z.string().trim().max(160).optional(),
  input: simulationInputSchema,
});

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };
