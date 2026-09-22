"use client";

import { useTransition } from "react";
import type { LeadStatus } from "@prisma/client";
import { updateLeadStatus } from "@/actions/admin";
import { NativeSelect } from "@/components/ui/select";

const LABELS: Record<LeadStatus, string> = {
  NOVO: "Novo",
  CONTATADO: "Contatado",
  CONVERTIDO: "Convertido",
  DESCARTADO: "Descartado",
};

export function LeadStatusSelect({ id, status }: { id: string; status: LeadStatus }) {
  const [pending, start] = useTransition();
  return (
    <NativeSelect
      className="h-8 w-36 text-xs"
      defaultValue={status}
      disabled={pending}
      onChange={(e) => start(async () => void (await updateLeadStatus(id, e.target.value as LeadStatus)))}
    >
      {Object.entries(LABELS).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </NativeSelect>
  );
}
