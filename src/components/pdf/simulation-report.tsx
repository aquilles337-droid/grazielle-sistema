import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { VEREDITO_INFO, type SimulationInput, type SimulationResult, type VereditoTipo } from "@/lib/calc/motor";
import { ANEXOS } from "@/lib/calc/tabelas-simples";
import { formatBRL, formatCNPJ, formatDate, formatPct } from "@/lib/format";

/*
 * Relatório corporativo (white-label). Usa a fonte Helvetica embutida no PDF —
 * cobre acentuação pt-BR (WinAnsi); evite símbolos fora desse conjunto (Δ, −, ≤).
 */

// Paleta da marca: grafite + petróleo
const C = {
  primary: "#066782",
  grafite: "#1c1c1c",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  zebra: "#f8fafc",
};

const VEREDITO_COR: Record<VereditoTipo, { bg: string; fg: string }> = {
  OPTAR: { bg: "#ecfdf5", fg: "#047857" },
  NEGOCIAR: { bg: "#f0f9ff", fg: "#0369a1" },
  LIMITROFE: { bg: "#fffbeb", fg: "#b45309" },
  MANTER: { bg: "#fef2f2", fg: "#b91c1c" },
};

const s = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 56, paddingHorizontal: 0, fontSize: 9, fontFamily: "Helvetica", color: C.text },
  header: {
    backgroundColor: C.grafite,
    color: "#fff",
    paddingVertical: 18,
    paddingHorizontal: 36,
    marginBottom: 18,
    borderBottomWidth: 4,
    borderBottomColor: C.primary,
  },
  headerOffice: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  headerSub: { fontSize: 9, marginTop: 3, opacity: 0.85 },
  body: { paddingHorizontal: 36 },
  row: { flexDirection: "row" },
  companyBox: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  label: { fontSize: 7.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  companyName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  veredito: { borderRadius: 4, padding: 12, marginBottom: 14, borderLeftWidth: 4 },
  vereditoTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  kpis: { flexDirection: "row", gap: 8, marginBottom: 16 },
  kpi: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 8 },
  kpiValue: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 2 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
    marginBottom: 6,
    marginTop: 4,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: C.primary,
  },
  twoCols: { flexDirection: "row", gap: 16, marginBottom: 12 },
  col: { flex: 1 },
  tr: { flexDirection: "row", paddingVertical: 3.5, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: C.border },
  trTotal: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, backgroundColor: C.zebra, fontFamily: "Helvetica-Bold" },
  tdLabel: { flex: 1, color: C.muted },
  tdValue: { textAlign: "right" },
  th: { fontFamily: "Helvetica-Bold", color: C.text },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 7,
    color: C.muted,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export interface ReportData {
  escritorio: string;
  contador: string;
  crc?: string | null;
  empresa: { nome: string; cnpj: string };
  titulo?: string | null;
  data: Date | string;
  input: SimulationInput;
  resultado: SimulationResult;
}

function KV({ rows }: { rows: [string, string][] }) {
  return (
    <View>
      {rows.map(([k, v]) => (
        <View key={k} style={s.tr}>
          <Text style={s.tdLabel}>{k}</Text>
          <Text style={s.tdValue}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

export function SimulationReport({ escritorio, contador, crc, empresa, titulo, data, input, resultado: r }: ReportData) {
  const { empresa: e, premissas: p } = input;
  const cor = VEREDITO_COR[r.veredito];
  const anexoLabel = ANEXOS.find((a) => a.value === e.anexo)?.label ?? `Anexo ${e.anexo}`;
  const repasseMin =
    r.repasseMin === null ? "Inviável" : r.repasseMin <= 0 ? "0% (não precisa)" : formatPct(r.repasseMin, 1);

  const comparativo: [string, number, number][] = [
    ["DAS", r.dasPuro, r.dasHib],
    ["IBS/CBS por fora (débito)", 0, r.ivaDeb],
    ["(-) Crédito nas compras", 0, -r.ivaCred],
    ["IBS/CBS líquido", 0, r.ivaLiq],
    ["Crédito transferido ao cliente", r.credPuro, r.credHib],
  ];

  return (
    <Document title={`Régua do Híbrido — ${empresa.nome}`} author={escritorio} creator="Régua do Híbrido">
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.headerOffice}>{escritorio}</Text>
          <Text style={s.headerSub}>
            Relatório de Triagem Tributária · Simples puro x Regime Híbrido (LC 214/2025)
          </Text>
        </View>

        <View style={s.body}>
          <View style={s.companyBox}>
            <View>
              <Text style={s.label}>Empresa</Text>
              <Text style={s.companyName}>{empresa.nome}</Text>
              <Text style={{ color: C.muted, marginTop: 2 }}>CNPJ {formatCNPJ(empresa.cnpj)}</Text>
              {titulo ? <Text style={{ marginTop: 2 }}>{titulo}</Text> : null}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.label}>Data da simulação</Text>
              <Text>{formatDate(data)}</Text>
              <Text style={[s.label, { marginTop: 6 }]}>Horizonte</Text>
              <Text>{p.horizonte === "2027" ? "Transição 2027" : "IVA pleno"}</Text>
            </View>
          </View>

          <View style={[s.veredito, { backgroundColor: cor.bg, borderLeftColor: cor.fg }]}>
            <Text style={s.label}>Veredito</Text>
            <Text style={[s.vereditoTitle, { color: cor.fg }]}>{VEREDITO_INFO[r.veredito].titulo}</Text>
            <Text>{VEREDITO_INFO[r.veredito].descricao}</Text>
          </View>

          <View style={s.kpis}>
            {(
              [
                ["Caixa sem negociar", formatBRL(r.caixaSemNegociar)],
                [`Caixa c/ repasse ${formatPct(p.repasseEsperado, 0)}`, formatBRL(r.caixaComRepasse)],
                ["Repasse mínimo", repasseMin],
                ["Excedente na cadeia", formatBRL(r.excedenteCadeia)],
              ] as const
            ).map(([k, v]) => (
              <View key={k} style={s.kpi}>
                <Text style={s.label}>{k}</Text>
                <Text style={s.kpiValue}>{v}</Text>
              </View>
            ))}
          </View>

          <Text style={s.sectionTitle}>Comparativo mensal</Text>
          <View style={{ marginBottom: 12 }}>
            <View style={[s.tr, { backgroundColor: C.zebra }]}>
              <Text style={[s.tdLabel, s.th]}>Item</Text>
              <Text style={[s.tdValue, s.th, { width: 110 }]}>A · Simples puro</Text>
              <Text style={[s.tdValue, s.th, { width: 110 }]}>B · Híbrido</Text>
            </View>
            {comparativo.map(([k, a, b]) => (
              <View key={k} style={s.tr}>
                <Text style={s.tdLabel}>{k}</Text>
                <Text style={[s.tdValue, { width: 110 }]}>{formatBRL(a)}</Text>
                <Text style={[s.tdValue, { width: 110 }]}>{formatBRL(b)}</Text>
              </View>
            ))}
            <View style={s.trTotal}>
              <Text style={{ flex: 1 }}>Custo tributário</Text>
              <Text style={[s.tdValue, { width: 110 }]}>{formatBRL(r.custoPuro)}</Text>
              <Text style={[s.tdValue, { width: 110 }]}>{formatBRL(r.custoHib)}</Text>
            </View>
          </View>

          <View style={s.twoCols}>
            <View style={s.col}>
              <Text style={s.sectionTitle}>Dados informados</Text>
              <KV
                rows={[
                  ["Anexo / faixa", `${anexoLabel} · ${e.faixa}ª faixa`],
                  ["RBT12", formatBRL(e.rbt12)],
                  ["Receita mensal", formatBRL(e.receitaMensal)],
                  ["% Exportação", formatPct(e.pctExportacao)],
                  ["% B2B (receita interna)", formatPct(e.pctB2B)],
                  ["% Compras creditáveis", formatPct(e.pctComprasCreditaveis)],
                  ["Redução na saída", formatPct(e.reducaoSaida)],
                  ["Redução nas compras", formatPct(e.reducaoCompras)],
                ]}
              />
            </View>
            <View style={s.col}>
              <Text style={s.sectionTitle}>Premissas</Text>
              <KV
                rows={[
                  ["CBS de referência", formatPct(p.cbsReferencia)],
                  ["IBS de transição", formatPct(p.ibsTransicao)],
                  ["IVA pleno", formatPct(p.ivaPleno)],
                  ["Repasse esperado", formatPct(p.repasseEsperado)],
                  ["Saldo credor", p.saldoCredorRecuperavel ? "Recuperável" : "Não recuperável"],
                  ["Tolerância (0,3% receita)", formatBRL(r.tolerancia)],
                ]}
              />
            </View>
          </View>

          <View style={s.twoCols} wrap={false}>
            <View style={s.col}>
              <Text style={s.sectionTitle}>Memória de cálculo</Text>
              <KV
                rows={[
                  ["Alíquota efetiva", formatPct(r.aliqEf, 4)],
                  ["Partilha CBS / IBS no DAS", `${formatPct(r.shareCBS)} / ${formatPct(r.shareIBS)}`],
                  ["Parcela que sai do DAS", formatPct(r.shareSai)],
                  ["IVA saída / compras", `${formatPct(r.ivaSaida)} / ${formatPct(r.ivaCompra)}`],
                ]}
              />
            </View>
            <View style={s.col}>
              <Text style={s.sectionTitle}>Indicadores</Text>
              <KV
                rows={[
                  ["Variação de custo (B - A)", formatBRL(r.deltaCusto)],
                  ["Variação de crédito (B - A)", formatBRL(r.deltaCredito)],
                  ["Ganho do cliente B2B", formatBRL(r.ganhoCliente)],
                  ["Repasse mínimo", repasseMin],
                ]}
              />
            </View>
          </View>

          <Text style={{ fontSize: 7.5, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>
            Simulação de caráter estimativo, elaborada com base na LC 214/2025 e na partilha dos Anexos da LC 123/2006, a
            partir das informações e premissas acima. Não substitui a análise individualizada do profissional responsável.
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text>
            {contador}
            {crc ? ` · CRC ${crc}` : ""} · {escritorio}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
