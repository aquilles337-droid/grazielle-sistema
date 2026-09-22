import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Calculator } from "lucide-react";
import { getSession } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session?.user) redirect(session.user.role === "ADMIN" ? "/admin" : "/painel");

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <Link href="/" className="flex items-center justify-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Calculator className="h-4 w-4" />
          </span>
          Régua do Híbrido
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Área do contador</CardTitle>
            <CardDescription>Entre com as credenciais fornecidas pelo administrador.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
