import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCompany } from "@/actions/companies";
import { garantirAcessoOuRedirecionar } from "@/lib/auth";
import { getSimulation, listSimulations } from "@/actions/simulations";
import { Simulator } from "@/components/painel/simulator";
import { SimulationHistory } from "@/components/painel/simulation-history";
import { DeleteCompanyButton } from "@/components/painel/delete-company-button";
import { formatCNPJ } from "@/lib/format";

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sim?: string }>;
}) {
  const { id } = await params;
  const { sim } = await searchParams;
  await garantirAcessoOuRedirecionar();

  const company = await getCompany(id);
  if (!company) notFound();

  const [simulations, loaded] = await Promise.all([
    listSimulations(company.id),
    sim ? getSimulation(sim) : Promise.resolve(null),
  ]);
  const initial = loaded && loaded.companyId === company.id ? loaded.inputs : undefined;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/painel" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Empresas
          </Link>
          <h1 className="text-2xl font-bold">{company.nome}</h1>
          <p className="font-mono text-sm text-muted-foreground">{formatCNPJ(company.cnpj)}</p>
        </div>
        <DeleteCompanyButton id={company.id} nome={company.nome} />
      </div>

      {/* key força reinicializar o formulário ao carregar outra simulação */}
      <Simulator key={sim ?? "novo"} companyId={company.id} initial={initial} />

      <SimulationHistory
        companyId={company.id}
        simulations={simulations.map((s) => ({ id: s.id, titulo: s.titulo, veredito: s.veredito, data: s.data.toISOString() }))}
      />
    </div>
  );
}
