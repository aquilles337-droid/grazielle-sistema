import { garantirAcessoOuRedirecionar } from "@/lib/auth";

/** Área do simulador: exige assinatura em dia (ADMIN sempre entra). */
export default async function AssinanteLayout({ children }: { children: React.ReactNode }) {
  await garantirAcessoOuRedirecionar();
  return <>{children}</>;
}
