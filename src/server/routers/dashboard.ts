import { createTRPCRouter, protectedProcedure } from "../trpc";

export const dashboardRouter = createTRPCRouter({
  kpis: protectedProcedure.query(async ({ ctx }) => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    const [
      totalLeadsAtivos,
      leadsGanhosMes,
      projAtivos,
      recebidoMes,
      previstoPendente,
      parcelasAtrasadas,
    ] = await Promise.all([
      ctx.prisma.lead.count({
        where: { status: { notIn: ["fechado_ganho", "perdido"] } },
      }),
      ctx.prisma.lead.count({
        where: { status: "fechado_ganho", updatedAt: { gte: inicioMes, lte: fimMes } },
      }),
      ctx.prisma.project.count({
        where: { status: "em_andamento" },
      }),
      ctx.prisma.paymentSchedule.aggregate({
        where: { paidAt: { gte: inicioMes, lte: fimMes } },
        _sum: { receivedValue: true },
      }),
      ctx.prisma.paymentSchedule.aggregate({
        where: { status: { in: ["pendente", "parcial"] } },
        _sum: { expectedValue: true, receivedValue: true },
      }),
      ctx.prisma.paymentSchedule.count({
        where: { status: { in: ["pendente", "parcial"] }, dueDate: { lt: hoje } },
      }),
    ]);

    const totalPendente =
      Number(previstoPendente._sum.expectedValue ?? 0) -
      Number(previstoPendente._sum.receivedValue ?? 0);

    return {
      totalLeadsAtivos,
      leadsGanhosMes,
      projAtivos,
      recebidoMes: Number(recebidoMes._sum.receivedValue ?? 0),
      totalPendente,
      parcelasAtrasadas,
    };
  }),

  // Funil comercial por estágio
  funnelSummary: protectedProcedure.query(async ({ ctx }) => {
    const leads = await ctx.prisma.lead.findMany({
      where: { status: { notIn: ["proposta_declinada", "perdido", "fechado_ganho"] } },
      select: { status: true, estimatedValue: true, title: true, client: { select: { name: true, company: true } } },
    });

    const ganhos = await ctx.prisma.lead.findMany({
      where: { status: "fechado_ganho" },
      select: { estimatedValue: true },
    });

    const byStage = {
      contato_inicial:     { count: 0, value: 0 },
      visita_tecnica:      { count: 0, value: 0 },
      elaboracao_proposta: { count: 0, value: 0 },
      negociacao:          { count: 0, value: 0 },
    };

    for (const l of leads) {
      const stage = l.status as keyof typeof byStage;
      if (byStage[stage]) {
        byStage[stage].count++;
        byStage[stage].value += Number(l.estimatedValue ?? 0);
      }
    }

    const totalPipeline = Object.values(byStage).reduce((s, v) => s + v.value, 0);
    const totalFechado = ganhos.reduce((s, l) => s + Number(l.estimatedValue ?? 0), 0);

    return { byStage, totalPipeline, totalFechado, leadsAtivos: leads };
  }),

  // Faturamento mensal — últimos 12 meses
  monthlyRevenue: protectedProcedure.query(async ({ ctx }) => {
    const hoje = new Date();
    const meses: { label: string; mes: number; ano: number; recebido: number; previsto: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
      const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const [recebido, previsto] = await Promise.all([
        ctx.prisma.paymentSchedule.aggregate({
          where: { paidAt: { gte: inicio, lte: fim } },
          _sum: { receivedValue: true },
        }),
        ctx.prisma.paymentSchedule.aggregate({
          where: { dueDate: { gte: inicio, lte: fim } },
          _sum: { expectedValue: true },
        }),
      ]);

      const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      meses.push({
        label: `${MESES_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        mes: d.getMonth() + 1,
        ano: d.getFullYear(),
        recebido: Number(recebido._sum.receivedValue ?? 0),
        previsto: Number(previsto._sum.expectedValue ?? 0),
      });
    }

    return meses;
  }),

  // Projetos por status
  projectsByStatus: protectedProcedure.query(async ({ ctx }) => {
    const counts = await ctx.prisma.project.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const LABELS: Record<string, string> = {
      aguardando_inicio: "Aguardando",
      em_andamento:      "Em Andamento",
      pausado:           "Pausado",
      concluido:         "Concluído",
      cancelado:         "Cancelado",
    };

    const COLORS: Record<string, string> = {
      aguardando_inicio: "#94a3b8",
      em_andamento:      "#1A1A1A",
      pausado:           "#f59e0b",
      concluido:         "#22c55e",
      cancelado:         "#ef4444",
    };

    return counts.map((c) => ({
      status: c.status,
      label: LABELS[c.status] ?? c.status,
      count: c._count.id,
      color: COLORS[c.status] ?? "#94a3b8",
    }));
  }),

  // Documentos por status
  docsByStatus: protectedProcedure.query(async ({ ctx }) => {
    const counts = await ctx.prisma.technicalDoc.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const LABELS: Record<string, string> = {
      a_iniciar:          "A Iniciar",
      previa:             "Prévia",
      em_producao:        "Em Produção",
      em_revisao:         "Em Revisão",
      em_conferencia:     "Em Conferência",
      liberado_para_obra: "Lib. p/ Obra",
      finalizado:         "Finalizado",
      superado:           "Superado",
    };

    const COLORS: Record<string, string> = {
      a_iniciar:          "#94a3b8",
      previa:             "#a78bfa",
      em_producao:        "#3b82f6",
      em_revisao:         "#f59e0b",
      em_conferencia:     "#f97316",
      liberado_para_obra: "#1A1A1A",
      finalizado:         "#22c55e",
      superado:           "#d1d5db",
    };

    return counts.map((c) => ({
      status: c.status,
      label: LABELS[c.status] ?? c.status,
      count: c._count.id,
      color: COLORS[c.status] ?? "#94a3b8",
    }));
  }),

  // Atividade recente
  recentActivity: protectedProcedure.query(async ({ ctx }) => {
    const [recentLeads, recentProjects] = await Promise.all([
      ctx.prisma.lead.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { client: { select: { name: true, company: true } } },
      }),
      ctx.prisma.project.findMany({
        take: 5,
        where: { status: "em_andamento" },
        orderBy: { updatedAt: "desc" },
        include: { client: { select: { name: true, company: true } } },
      }),
    ]);

    return { recentLeads, recentProjects };
  }),
});
