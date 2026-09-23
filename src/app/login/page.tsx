import { Suspense } from "react";
import { DesenvolvidoPor, FaixasDecorativas, Logo } from "@/components/brand/logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session?.user) redirect(session.user.role === "ADMIN" ? "/admin" : "/painel");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-secondary/40 p-4">
      <FaixasDecorativas className="absolute -bottom-16 -right-24 w-[640px] opacity-[0.15]" />
      <div className="relative w-full max-w-sm space-y-6">
        <Link href="/" className="flex items-center justify-center gap-2 font-bold">
          <Logo />
        </Link>
        <Card className="border-t-4 border-t-accent shadow-lg">
          <CardHeader>
            <CardTitle>Área do contador</CardTitle>
            <CardDescription>Entre com seu e-mail e senha.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense>
              <LoginForm />
            </Suspense>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Ainda não é assinante?{" "}
              <Link href="/#planos" className="font-medium text-accent hover:underline">
                Conheça os planos
              </Link>
            </p>
          </CardContent>
        </Card>
        <div className="flex justify-center">
          <DesenvolvidoPor />
        </div>
      </div>
    </div>
  );
}
