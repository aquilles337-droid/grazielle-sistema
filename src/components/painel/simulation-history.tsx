"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileDown, History, Trash2, Upload } from "lucide-react";
import type { Veredito } from "@prisma/client";
import { deleteSimulation } from "@/actions/simulations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VereditoBadge } from "@/components/shared/veredito-badge";
import { formatDate } from "@/lib/format";

type Item = { id: string; titulo: string | null; veredito: Veredito; data: string };

export function SimulationHistory({ companyId, simulations }: { companyId: string; simulations: Item[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onDelete(id: string) {
    if (!confirm("Excluir esta simulação?")) return;
    start(async () => {
      const res = await deleteSimulation(id);
      if (!res.ok) alert(res.error);
      router.refresh();
    });
  }

  return (
    <Card data-tour="sim-historico">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" /> Histórico de simulações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {simulations.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma simulação salva.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Identificação</TableHead>
                <TableHead>Veredito</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {simulations.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(s.data)}</TableCell>
                  <TableCell>{s.titulo ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <VereditoBadge veredito={s.veredito} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild title="Carregar no simulador">
                        <Link href={`/painel/empresas/${companyId}?sim=${s.id}`} scroll>
                          <Upload /> <span className="hidden md:inline">Carregar</span>
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild title="Baixar PDF">
                        <a href={`/api/simulations/${s.id}/pdf`} target="_blank" rel="noopener">
                          <FileDown /> PDF
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" title="Excluir" disabled={pending} onClick={() => onDelete(s.id)}>
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
