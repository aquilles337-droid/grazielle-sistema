import { listAccountants, listLeads } from "@/actions/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AccountantForm } from "@/components/admin/accountant-form";
import { AccountantActions } from "@/components/admin/accountant-actions";
import { LeadStatusSelect } from "@/components/admin/lead-status-select";
import { formatDate } from "@/lib/format";

export default async function AdminPage() {
  const [users, leads] = await Promise.all([listAccountants(), listLeads()]);
  const contadores = users.filter((u) => u.role === "ACCOUNTANT");
  const novosLeads = leads.filter((l) => l.status === "NOVO").length;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Contadores ativos" value={contadores.filter((u) => u.ativo).length} />
        <Stat label="Contadores inativos" value={contadores.filter((u) => !u.ativo).length} />
        <Stat label="Leads novos" value={novosLeads} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
            <CardDescription>Assinantes com acesso ao simulador.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Escritório / CRC</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium">{u.nome}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">
                      {u.escritorio ?? "—"}
                      {u.crc && <p className="text-xs text-muted-foreground">{u.crc}</p>}
                      <p className="text-xs text-muted-foreground">{u._count.companies} empresa(s)</p>
                    </TableCell>
                    <TableCell>
                      {u.role === "ADMIN" ? (
                        <Badge>Admin</Badge>
                      ) : u.ativo ? (
                        <Badge variant="success">Ativo</Badge>
                      ) : (
                        <Badge variant="danger">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.role === "ACCOUNTANT" && <AccountantActions id={u.id} ativo={u.ativo} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Criar credencial de contador</CardTitle>
            <CardDescription>Envie o e-mail e a senha ao assinante por canal seguro.</CardDescription>
          </CardHeader>
          <CardContent>
            <AccountantForm />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads da landing page</CardTitle>
          <CardDescription>Últimos 200 cadastros.</CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum lead ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>CRC</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-sm">{formatDate(l.createdAt)}</TableCell>
                    <TableCell className="font-medium">{l.nome}</TableCell>
                    <TableCell className="text-sm">
                      <a href={`mailto:${l.email}`} className="hover:underline">
                        {l.email}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        <a href={`https://wa.me/55${l.telefone}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {l.telefone}
                        </a>
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">{l.crc}</TableCell>
                    <TableCell>
                      <LeadStatusSelect id={l.id} status={l.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
