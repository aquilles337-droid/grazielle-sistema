import "server-only";
import { Prisma } from "@prisma/client";
import type { ZodError } from "zod";
import { AuthError } from "@/lib/auth";
import type { ActionResult } from "@/lib/validators";

export function zodFail(error: ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, error: "Verifique os campos destacados.", fieldErrors };
}

/** Converte exceções conhecidas em ActionResult sem vazar detalhes internos ao cliente. */
export function handleActionError(e: unknown): ActionResult<never> {
  if (e instanceof AuthError) return { ok: false, error: e.message };
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    return { ok: false, error: "Registro duplicado." };
  }
  console.error("[action]", e);
  return { ok: false, error: "Erro inesperado. Tente novamente." };
}

export const formToObject = (fd: FormData) =>
  Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$ACTION")));
