"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCompany } from "@/actions/companies";
import { Button } from "@/components/ui/button";

export function DeleteCompanyButton({ id, nome }: { id: string; nome: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Excluir "${nome}" e todas as simulações?`)) return;
        start(async () => {
          const res = await deleteCompany(id);
          if (res.ok) router.push("/painel");
          else alert(res.error);
        });
      }}
    >
      <Trash2 /> Excluir empresa
    </Button>
  );
}
