"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { simular, type SimulationInput, type SimulationResult } from "@/lib/calc/motor";
import { saveSimulationSchema, type ActionResult } from "@/lib/validators";
import { handleActionError, zodFail } from "./_helpers";

/** Filtro de tenant: a simulação só é visível via empresa do próprio usuário. */
const ownedBy = (userId: string) => ({ company: { userId } });

export async function listSimulations(companyId: string) {
  const user = await requireUser();
  return prisma.simulation.findMany({
    where: { companyId, ...ownedBy(user.id) },
    orderBy: { data: "desc" },
    select: { id: true, titulo: true, veredito: true, data: true, inputs: true, resultado: true },
  });
}

export async function getSimulation(id: string) {
  const user = await requireUser();
  const sim = await prisma.simulation.findFirst({
    where: { id, ...ownedBy(user.id) },
    include: { company: { select: { id: true, nome: true, cnpj: true } } },
  });
  if (!sim) return null;
  return {
    ...sim,
    inputs: sim.inputs as unknown as SimulationInput,
    resultado: sim.resultado as unknown as SimulationResult,
  };
}

export async function saveSimulation(payload: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const parsed = saveSimulationSchema.safeParse(payload);
    if (!parsed.success) return zodFail(parsed.error);

    const { companyId, titulo, input } = parsed.data;

    const company = await prisma.company.findFirst({ where: { id: companyId, userId: user.id }, select: { id: true } });
    if (!company) return { ok: false, error: "Empresa não encontrada." };

    // Recalcula no servidor: o resultado gravado nunca vem do navegador
    const resultado = simular(input);

    const sim = await prisma.simulation.create({
      data: {
        companyId: company.id,
        titulo: titulo || null,
        inputs: input,
        // JSON não suporta Infinity/NaN; o motor já devolve null para repasse inviável
        resultado: JSON.parse(JSON.stringify(resultado)),
        veredito: resultado.veredito,
      },
    });

    revalidatePath(`/painel/empresas/${company.id}`);
    return { ok: true, data: { id: sim.id }, message: "Simulação salva." };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function deleteSimulation(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const sim = await prisma.simulation.findFirst({ where: { id, ...ownedBy(user.id) }, select: { companyId: true } });
    if (!sim) return { ok: false, error: "Simulação não encontrada." };

    await prisma.simulation.delete({ where: { id } });
    revalidatePath(`/painel/empresas/${sim.companyId}`);
    return { ok: true, message: "Simulação excluída." };
  } catch (e) {
    return handleActionError(e);
  }
}
