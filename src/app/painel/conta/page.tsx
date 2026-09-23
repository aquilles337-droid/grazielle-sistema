import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/painel/change-password-form";
import { ReverApresentacao } from "@/components/tour/rever-apresentacao";

export default async function ContaPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto grid max-w-md gap-6">
      <Card data-tour="conta-senha">
        <CardHeader>
          <CardTitle>Minha conta</CardTitle>
          <CardDescription>
            {user.nome} · {user.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Apresentação do sistema</CardTitle>
          <CardDescription>
            Mostra de novo, tela a tela, o que cada botão faz. Você também pode usar o botão <b>Tutorial</b> no topo de
            qualquer tela.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReverApresentacao userId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
