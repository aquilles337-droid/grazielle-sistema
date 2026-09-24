import { renderToBuffer } from "@react-pdf/renderer";
import { AccessError, AuthError, requireActiveUser } from "@/lib/auth";
import { getSimulation } from "@/actions/simulations";
import { prisma } from "@/lib/prisma";
import { SimulationReport } from "@/components/pdf/simulation-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let user;
  try {
    user = await requireActiveUser();
  } catch (e) {
    if (e instanceof AccessError) return new Response("Assinatura inativa", { status: 402 });
    if (e instanceof AuthError) return new Response("Não autorizado", { status: 401 });
    throw e;
  }

  // getSimulation filtra por userId (via empresa) — ID de outro tenant retorna null
  const sim = await getSimulation(id);
  if (!sim) return new Response("Simulação não encontrada", { status: 404 });

  // Logo do escritório (white-label), se o contador tiver enviado
  const marca = await prisma.user.findUnique({ where: { id: user.id }, select: { logo: true, logoMime: true } });
  const logo =
    marca?.logo && marca.logoMime
      ? { data: Buffer.from(marca.logo), format: marca.logoMime === "image/png" ? ("png" as const) : ("jpg" as const) }
      : null;

  const buffer = await renderToBuffer(
    <SimulationReport
      escritorio={user.escritorio || user.nome}
      logo={logo}
      contador={user.nome}
      crc={user.crc}
      empresa={sim.company}
      titulo={sim.titulo}
      data={sim.data}
      input={sim.inputs}
      resultado={sim.resultado}
    />,
  );

  const slug = sim.company.nome.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="regua-hibrido-${slug}-${sim.data.toISOString().slice(0, 10)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
