import type { VereditoTipo } from "@/lib/calc/motor";
import { VEREDITO_INFO } from "@/lib/calc/motor";
import { Badge, type BadgeProps } from "@/components/ui/badge";

const VARIANT: Record<VereditoTipo, BadgeProps["variant"]> = {
  OPTAR: "success",
  NEGOCIAR: "info",
  LIMITROFE: "warning",
  MANTER: "danger",
};

export function VereditoBadge({ veredito, className }: { veredito: VereditoTipo; className?: string }) {
  return (
    <Badge variant={VARIANT[veredito]} className={className}>
      {VEREDITO_INFO[veredito].titulo}
    </Badge>
  );
}
