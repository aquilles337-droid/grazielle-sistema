"use client";

import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reiniciarApresentacao } from "./tour-guiado";

/** Reinicia as dicas de todas as telas e volta para o painel, onde a apresentação recomeça. */
export function ReverApresentacao({ userId }: { userId: string }) {
  const router = useRouter();
  return (
    <Button
      data-tour="conta-tutorial"
      variant="outline"
      onClick={() => {
        reiniciarApresentacao(userId);
        router.push("/painel");
      }}
    >
      <PlayCircle /> Rever apresentação do sistema
    </Button>
  );
}
