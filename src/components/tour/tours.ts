/*
 * Roteiros da apresentação guiada. Cada passo destaca um elemento marcado com
 * data-tour="..." na tela. Passos cujo elemento não está visível (ex.: menu
 * escondido no celular, botão só do admin) são pulados automaticamente.
 */

export type TourId = "assinatura" | "painel" | "simulador" | "conta" | "admin";

export interface TourStep {
  /** Valor do atributo data-tour; sem ele o balão aparece centralizado. */
  alvo?: string;
  titulo: string;
  texto: string;
  lado?: "top" | "bottom" | "left" | "right";
}

const saida: TourStep = {
  alvo: "sair",
  titulo: "Sair",
  texto: "Encerra sua sessão com segurança. Use sempre que estiver em um computador compartilhado.",
  lado: "bottom",
};

const botaoTutorial: TourStep = {
  alvo: "btn-tutorial",
  titulo: "Tutorial",
  texto: "Quer rever estas dicas? Clique aqui a qualquer momento e a apresentação da tela atual começa de novo.",
  lado: "bottom",
};

export const TOURS: Record<TourId, TourStep[]> = {
  painel: [
    {
      titulo: "Bem-vindo à Régua do Híbrido! 👋",
      texto:
        "Em um minuto vamos mostrar onde fica cada coisa e o que cada botão faz. Use <b>Próximo</b> (ou as setas do teclado) para avançar. Pode fechar quando quiser.",
    },
    {
      alvo: "nav-empresas",
      titulo: "Empresas",
      texto: "Sua carteira de clientes do Simples Nacional. É a tela inicial do sistema.",
      lado: "bottom",
    },
    {
      alvo: "nav-assinatura",
      titulo: "Assinatura",
      texto:
        "Veja até quando vai o seu acesso, renove pelo Pix, troque de plano, cancele a renovação do cartão e consulte o histórico de pagamentos.",
      lado: "bottom",
    },
    {
      alvo: "nav-conta",
      titulo: "Minha conta",
      texto: "Troque sua senha e reveja esta apresentação sempre que precisar.",
      lado: "bottom",
    },
    {
      alvo: "nav-admin",
      titulo: "Admin",
      texto: "Área do administrador: contadores, acessos de cortesia, pagamentos recebidos e leads da página de vendas.",
      lado: "bottom",
    },
    botaoTutorial,
    {
      alvo: "form-empresa",
      titulo: "Cadastrar empresa",
      texto:
        "Informe a <b>razão social</b> e o <b>CNPJ</b> do cliente e clique em <b>Cadastrar</b>. O CNPJ é validado e cada empresa fica visível só para você.",
      lado: "left",
    },
    {
      alvo: "lista-empresas",
      titulo: "Minhas empresas",
      texto:
        "Aqui ficam todas as empresas cadastradas, com o <b>último veredito</b> de cada uma. Clique no <b>nome</b> (ou na setinha) para abrir o simulador.",
      lado: "right",
    },
    saida,
    {
      titulo: "Pronto para começar!",
      texto:
        "Cadastre sua primeira empresa (ou abra uma existente). Ao abrir o simulador pela primeira vez, mostramos cada campo e botão de lá.",
    },
  ],

  simulador: [
    {
      titulo: "Este é o simulador",
      texto:
        "Aqui você compara o <b>Simples puro</b> com o <b>regime Híbrido</b>. Preenchemos um exemplo para você ver os resultados — <b>nada é salvo</b> até você clicar em Salvar.",
    },
    {
      alvo: "sim-anexo",
      titulo: "Anexo e faixa",
      texto:
        "Escolha o <b>Anexo do Simples</b> da empresa. A <b>faixa</b> é sugerida sozinha a partir do RBT12, mas você pode ajustar.",
      lado: "right",
    },
    {
      alvo: "sim-receitas",
      titulo: "RBT12 e receita mensal",
      texto:
        "<b>RBT12</b>: receita bruta dos últimos 12 meses (define a alíquota efetiva). <b>Receita mensal</b>: o faturamento do mês que será simulado.",
      lado: "right",
    },
    {
      alvo: "sim-percentuais",
      titulo: "Perfil da operação",
      texto:
        "<b>% Exportação</b>: parte da receita vendida ao exterior. <b>% B2B</b>: quanto da receita interna vai para empresas que aproveitam crédito. <b>% Compras creditáveis</b>: compras que geram crédito de IBS/CBS. <b>% Receita com ICMS-ST</b> (comércio e indústria): parte das vendas com ICMS já retido por substituição — o DAS sai sem o ICMS nessa parte.",
      lado: "right",
    },
    {
      alvo: "sim-reducoes",
      titulo: "Regime de alíquota e reduções",
      texto:
        "Escolha o <b>regime de alíquota na saída</b> (padrão, redução de 30%, de 60% ou alíquota zero) e a <b>redução na saída</b> é preenchida sozinha — ou use <b>Personalizado</b> para um mix. A <b>redução nas compras</b> é a média que os fornecedores aplicam: compras com alíquota reduzida geram menos crédito.",
      lado: "right",
    },
    {
      alvo: "sim-premissas",
      titulo: "Premissas da Reforma",
      texto:
        "<b>Horizonte</b>: o ano da simulação — transição 2027–2028, cada ano de 2029 a 2032 ou IVA pleno (2033). <b>Saldo credor</b>: se o crédito excedente pode ser recuperado. Alíquotas de CBS, IBS e IVA, e o <b>repasse esperado</b> do crédito ao seu cliente. Já vêm com os valores da LC 214/2025.",
      lado: "right",
    },
    {
      alvo: "sim-restaurar",
      titulo: "Restaurar premissas padrão",
      texto: "Mexeu nas premissas? Este botão volta todas para os valores oficiais.",
      lado: "top",
    },
    {
      alvo: "sim-veredito",
      titulo: "Veredito",
      texto:
        "A conclusão da análise: <b>Optar pelo Híbrido</b>, <b>Negociar repasse</b>, <b>Limítrofe</b> (diferença dentro de 0,3% da receita) ou <b>Manter no Simples puro</b>. Atualiza na hora a cada campo alterado.",
      lado: "bottom",
    },
    {
      alvo: "sim-kpis",
      titulo: "Indicadores de caixa",
      texto:
        "<b>Caixa sem negociar</b>: ganho/perda só pela mudança de regime. <b>Caixa c/ repasse</b>: considerando o repasse esperado. <b>Excedente na cadeia</b>: ganho total somando o cliente. <b>Repasse mínimo</b>: quanto do crédito precisa voltar em preço para o Híbrido compensar.",
      lado: "bottom",
    },
    {
      alvo: "sim-cenarios",
      titulo: "Cenário A × Cenário B",
      texto:
        "Comparativo mensal lado a lado: DAS, IBS/CBS por fora, créditos nas compras, crédito transferido ao cliente e o <b>custo tributário</b> de cada regime.",
      lado: "top",
    },
    {
      alvo: "sim-memoria",
      titulo: "Memória de cálculo",
      texto: "Todos os números intermediários (alíquota efetiva, partilha, parcelas) para você conferir e explicar ao cliente.",
      lado: "top",
    },
    {
      alvo: "sim-salvar",
      titulo: "Salvar simulação",
      texto:
        "Dê um nome opcional (ex.: “Cenário com redução de 30%”) e clique em <b>Salvar simulação</b>. Ela vai para o histórico e libera o <b>PDF</b>.",
      lado: "top",
    },
    {
      alvo: "sim-historico",
      titulo: "Histórico de simulações",
      texto:
        "<b>Carregar</b>: traz a simulação de volta para o formulário. <b>PDF</b>: relatório com a logo e o nome do seu escritório (configure em Minha conta), pronto para enviar ao cliente. <b>Lixeira</b>: exclui a simulação.",
      lado: "top",
    },
    {
      alvo: "btn-excluir-empresa",
      titulo: "Excluir empresa",
      texto: "Apaga a empresa e <b>todas</b> as simulações dela. Pede confirmação e não pode ser desfeito.",
      lado: "left",
    },
    {
      alvo: "nav-empresas",
      titulo: "Voltar para a carteira",
      texto: "Clique em <b>Empresas</b> para voltar à lista de clientes. Bom trabalho!",
      lado: "bottom",
    },
  ],

  assinatura: [
    {
      titulo: "Bem-vindo à Régua do Híbrido! 👋",
      texto:
        "Esta é a tela da sua <b>assinatura</b>. Vamos mostrar rapidamente como liberar e gerenciar o seu acesso.",
    },
    {
      alvo: "ass-status",
      titulo: "Situação do acesso",
      texto: "Mostra se o acesso está liberado e até quando. Com acesso ativo, aparece o botão para ir ao simulador.",
      lado: "bottom",
    },
    {
      alvo: "ass-cartao-ativo",
      titulo: "Assinatura no cartão",
      texto:
        "Plano e status da cobrança automática. <b>Cancelar assinatura</b> interrompe as próximas cobranças; o acesso continua até o fim do período já pago.",
      lado: "bottom",
    },
    {
      alvo: "ass-forma",
      titulo: "Forma de pagamento",
      texto:
        "<b>Cartão</b>: renovação automática (e teste grátis na primeira assinatura). <b>Pix</b>: mais barato, libera na hora; você renova a cada período.",
      lado: "bottom",
    },
    {
      alvo: "ass-plano",
      titulo: "Plano",
      texto: "Mensal ou anual. O anual sai mais em conta — o valor da economia aparece no selo.",
      lado: "top",
    },
    {
      alvo: "ass-pagar",
      titulo: "Pagamento",
      texto:
        "No <b>cartão</b>, digite os dados aqui mesmo (ambiente seguro do Mercado Pago). No <b>Pix</b>, gere o QR Code e pague pelo app do banco — o acesso libera sozinho em segundos.",
      lado: "top",
    },
    {
      alvo: "ass-historico",
      titulo: "Histórico de pagamentos",
      texto: "Todos os seus pagamentos, com status e até quando cada um liberou o acesso.",
      lado: "top",
    },
    {
      alvo: "nav-assinatura",
      titulo: "Sempre à mão",
      texto:
        "Volte aqui pelo menu <b>Assinatura</b> quando quiser. No Pix, avisamos no topo da tela quando faltarem 5 dias para vencer.",
      lado: "bottom",
    },
    botaoTutorial,
  ],

  conta: [
    {
      alvo: "conta-logo",
      titulo: "Logo do escritório",
      texto:
        "Envie a logo do seu escritório (PNG ou JPG). Ela fica salva e aparece no cabeçalho de <b>todos os relatórios em PDF</b> que você gerar.",
      lado: "right",
    },
    {
      alvo: "conta-escritorio",
      titulo: "Nome e CRC",
      texto: "O nome do escritório vai no topo do PDF e o CRC no rodapé. Clique em <b>Salvar dados</b> após alterar.",
      lado: "right",
    },
    {
      alvo: "conta-senha",
      titulo: "Trocar senha",
      texto: "Informe a senha atual e a nova senha duas vezes. A troca vale na hora.",
      lado: "right",
    },
    {
      alvo: "conta-tutorial",
      titulo: "Rever a apresentação",
      texto: "Reinicia as dicas de todas as telas, como no primeiro acesso.",
      lado: "top",
    },
  ],

  admin: [
    {
      titulo: "Área do administrador",
      texto: "Aqui você gerencia os contadores, acompanha os pagamentos e responde os interessados da página de vendas.",
    },
    {
      alvo: "adm-stats",
      titulo: "Resumo",
      texto: "Assinantes com acesso, contadores cadastrados, valor recebido no mês e leads novos.",
      lado: "bottom",
    },
    {
      alvo: "adm-criar",
      titulo: "Criar credencial",
      texto:
        "Cadastre um contador manualmente (ex.: cortesia ou parceria). Escolha o <b>acesso inicial</b>: sem acesso, 7, 30 ou 365 dias.",
      lado: "left",
    },
    {
      alvo: "adm-usuarios",
      titulo: "Usuários",
      texto:
        "Para cada contador: <b>calendário +</b> soma dias de acesso (0 revoga), <b>chave</b> redefine a senha e <b>Desativar/Ativar</b> bloqueia ou libera o login.",
      lado: "right",
    },
    {
      alvo: "adm-pagamentos",
      titulo: "Pagamentos",
      texto: "Últimos pagamentos via Pix e cartão, com plano, valor e status.",
      lado: "top",
    },
    {
      alvo: "adm-leads",
      titulo: "Leads",
      texto: "Pessoas que pediram contato na página de vendas. Clique no e-mail ou WhatsApp e atualize o status do atendimento.",
      lado: "top",
    },
    botaoTutorial,
  ],
};

/** Qual apresentação corresponde a cada rota. */
export function tourDaRota(pathname: string): TourId | null {
  if (pathname === "/painel") return "painel";
  if (pathname.startsWith("/painel/empresas/")) return "simulador";
  if (pathname.startsWith("/painel/assinatura")) return "assinatura";
  if (pathname.startsWith("/painel/conta")) return "conta";
  if (pathname.startsWith("/admin")) return "admin";
  return null;
}

export const TOUR_EVENTO = "rh:tour";
export const TOUR_EXEMPLO_EVENTO = "rh:tour-exemplo";
export const chaveTour = (userId: string, tour: TourId) => `rh-tour:${userId}:${tour}`;
