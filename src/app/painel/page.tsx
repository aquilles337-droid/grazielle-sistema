import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import { listCompanies } from "@/actions/companies";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VereditoBadge } from "@/components/shared/veredito-badge";
import { CompanyForm } from "@/components/painel/company-form";
import { formatCNPJ, formatDate } from "@/lib/format";

export default async function PainelPage() {
  const companies = await listCompanies();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader>
          <CardTitle>Minhas empresas</CardTitle>
          <CardDescription>Carteira do Simples Nacional em triagem.</CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <Building2 className="h-10 w-10" />
              <p>Nenhuma empresa cadastrada ainda. Comece pelo formulário ao lado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                  <TableHead>Último veredito</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c) => {
                  const last = c.simulations[0];
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link href={`/painel/empresas/${c.id}`} className="font-medium hover:underline">
                          {c.nome}
                        </Link>
                        <p className="text-xs text-muted-foreground">{c._count.simulations} simulação(ões)</p>
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs md:table-cell">{formatCNPJ(c.cnpj)}</TableCell>
                      <TableCell>
                        {last ? (
                          <div className="space-y-1">
                            <VereditoBadge veredito={last.veredito} />
                            <p className="text-xs text-muted-foreground">{formatDate(last.data)}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/painel/empresas/${c.id}`} aria-label={`Abrir ${c.nome}`}>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Nova empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyForm />
        </CardContent>
      </Card>
    </div>
  );
}
