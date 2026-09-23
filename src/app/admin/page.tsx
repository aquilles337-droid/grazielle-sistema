import { listAccountants, listLeads, listPagamentos } from "@/actions/admin";
import { PLANOS } from "@/lib/billing/planos";
import { formatBRL } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AccountantForm } from "@/components/admin/accountant-form";
import { AccountantActions } from "@/components/admin/accountant-actions";
import { LeadStatusSelect } from "@/components/admin/lead-status-select";
import { formatDate } from "@/lib/format";

export default async function AdminPage() {
  const [users, leads, pagamentos] = await Promise.all([listAccountants(), listLeads(), listPagamentos()]);
  const agora = new Date();
  const contadores = users.filter((u) => u.role === "ACCOUNTANT");
  const assinantes = contadores.filter((u) => u.acessoAte && u.acessoAte > agora).length;
  const novosLeads = leads.filter((l) => l.status === "NOVO").length;
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const receitaMes = pagamentos
    .filter((p) => p.status === "APROVADO" && p.aprovadoEm && p.aprovadoEm >= inicioMes)
    .reduce((acc, p) => acc + Number(p.valor), 0);

  return (
    <div className="grid gap-6">
      <div data-tour="adm-stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Assinantes com acesso" value={assinantes} />
        <Stat label="Contadores cadastrados" value={contadores.length} />
        <Stat label="Recebido no mês" value={formatBRL(receitaMes)} />
        <Stat label="Leads novos" value={novosLeads} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card data-tour="adm-usuarios">
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
                  <TableHead>Acesso</TableHead>
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
                    <TableCell className="text-sm">
                      {u.role === "ADMIN" ? (
                        "Sempre"
                      ) : u.acessoAte ? (
                        <span className={u.acessoAte > agora ? "" : "text-destructive"}>
                          {u.acessoAte > agora ? "até " : "venceu "}
                          {formatDate(u.acessoAte)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Sem pagamento</span>
                      )}
                      {u.assinaturas[0] && (
                        <p className="text-xs text-muted-foreground">Cartão {PLANOS[u.assinaturas[0].plano].nome.toLowerCase()}</p>
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

        <Card data-tour="adm-criar" className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Criar credencial de contador</CardTitle>
            <CardDescription>Envie o e-mail e a senha ao assinante por canal seguro.</CardDescription>
          </CardHeader>
          <CardContent>
            <AccountantForm />
          </CardContent>
        </Card>
      </div>

      <Card data-tour="adm-pagamentos">
        <CardHeader>
          <CardTitle>Pagamentos</CardTitle>
          <CardDescription>Últimos 50 (Pix e cobranças do cartão).</CardDescription>
        </CardHeader>
        <CardContent>
          {pagamentos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pagamento ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Contador</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagamentos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap text-sm">{formatDate(p.createdAt)}</TableCell>
                    <TableCell className="text-sm">
                      {p.user.nome}
                      <p className="text-xs text-muted-foreground">{p.user.email}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {PLANOS[p.plano].nome} · {p.metodo === "PIX" ? "Pix" : "Cartão"}
                    </TableCell>
                    <TableCell className="text-sm">{formatBRL(Number(p.valor))}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "APROVADO" ? "success" : p.status === "PENDENTE" ? "warning" : "secondary"}>
                        {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card data-tour="adm-leads">
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

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
