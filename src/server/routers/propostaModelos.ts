/**
 * Modelos de proposta — o "PDF padrão" salvo e suas variações.
 *
 * Regra central: existe sempre exatamente um modelo padrão. Se o banco
 * estiver vazio, `padrao` cria o modelo inicial a partir do conteúdo base
 * (src/lib/pdf/conteudoBase.ts), de modo que o sistema nunca fica sem
 * um ponto de partida.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { secoesBase, CONDICOES_PAGAMENTO_BASE } from "@/lib/pdf/conteudoBase";
import { DEFAULT_BANK_INFO } from "@/lib/pdf/PropostaPDF";

const secaoSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  content: z.string(),
  type: z.enum(["text", "pagamento"]),
  enabled: z.boolean(),
  pageBreakBefore: z.boolean(),
});

const conteudoSchema = z.object({
  v: z.literal(1),
  secoes: z.array(secaoSchema).min(1),
  exibicaoValores: z.enum(["completo", "sem_total", "sem_valores"]),
  paymentNotes: z.string(),
  bankInfo: z
    .object({
      banco: z.string(),
      empresa: z.string(),
      cnpj: z.string(),
      agencia: z.string(),
      conta: z.string(),
    })
    .optional(),
  layout: z.any().optional(),
});

/** Conteúdo do modelo inicial, montado a partir do conteúdo base. */
function conteudoInicial() {
  return {
    v: 1 as const,
    secoes: secoesBase(),
    exibicaoValores: "completo" as const,
    paymentNotes: CONDICOES_PAGAMENTO_BASE,
    bankInfo: { ...DEFAULT_BANK_INFO },
    layout: undefined,
  };
}

export const propostaModelosRouter = createTRPCRouter({
  /** Todos os modelos, com o padrão primeiro. */
  list: protectedProcedure.query(async ({ ctx }) => {
    await garantirPadrao(ctx.prisma);
    return ctx.prisma.proposalTemplate.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  }),

  /** O modelo padrão — criado na hora se ainda não existir nenhum. */
  padrao: protectedProcedure.query(async ({ ctx }) => {
    return garantirPadrao(ctx.prisma);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const m = await ctx.prisma.proposalTemplate.findUnique({ where: { id: input.id } });
      if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "Modelo não encontrado." });
      return m;
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Dê um nome ao modelo."),
        description: z.string().optional(),
        content: conteudoSchema,
        tornarPadrao: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existe = await ctx.prisma.proposalTemplate.count();
      const padrao = input.tornarPadrao || existe === 0;

      return ctx.prisma.$transaction(async (tx) => {
        if (padrao) {
          await tx.proposalTemplate.updateMany({
            where: { isDefault: true },
            data: { isDefault: false },
          });
        }
        return tx.proposalTemplate.create({
          data: {
            name: input.name.trim(),
            description: input.description?.trim() || null,
            content: input.content as any,
            isDefault: padrao,
          },
        });
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        content: conteudoSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...resto } = input;
      return ctx.prisma.proposalTemplate.update({
        where: { id },
        data: {
          ...(resto.name !== undefined ? { name: resto.name.trim() } : {}),
          ...(resto.description !== undefined
            ? { description: resto.description.trim() || null }
            : {}),
          ...(resto.content !== undefined ? { content: resto.content as any } : {}),
        },
      });
    }),

  /** Marca um modelo como padrão e tira o marcador dos demais. */
  setPadrao: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx) => {
        await tx.proposalTemplate.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
        return tx.proposalTemplate.update({
          where: { id: input.id },
          data: { isDefault: true },
        });
      });
    }),

  duplicar: adminProcedure
    .input(z.object({ id: z.string().uuid(), name: z.string().min(1).optional() }))
    .mutation(async ({ ctx, input }) => {
      const base = await ctx.prisma.proposalTemplate.findUnique({ where: { id: input.id } });
      if (!base) throw new TRPCError({ code: "NOT_FOUND", message: "Modelo não encontrado." });
      return ctx.prisma.proposalTemplate.create({
        data: {
          name: input.name?.trim() || `${base.name} (cópia)`,
          description: base.description,
          content: base.content as any,
          isDefault: false,
        },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const m = await ctx.prisma.proposalTemplate.findUnique({ where: { id: input.id } });
      if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "Modelo não encontrado." });
      if (m.isDefault) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este é o modelo padrão. Defina outro como padrão antes de excluir.",
        });
      }
      await ctx.prisma.proposalTemplate.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  /** Devolve o modelo padrão ao conteúdo base de fábrica. */
  restaurarBase: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.proposalTemplate.update({
        where: { id: input.id },
        data: { content: conteudoInicial() as any },
      });
    }),
});

/**
 * Garante que existe um modelo padrão.
 *
 * Três casos: não há nenhum modelo (cria o inicial), há modelos mas nenhum
 * marcado (promove o mais antigo), ou já está tudo certo.
 */
async function garantirPadrao(prisma: any) {
  const padrao = await prisma.proposalTemplate.findFirst({ where: { isDefault: true } });
  if (padrao) return padrao;

  const qualquer = await prisma.proposalTemplate.findFirst({ orderBy: { createdAt: "asc" } });
  if (qualquer) {
    return prisma.proposalTemplate.update({
      where: { id: qualquer.id },
      data: { isDefault: true },
    });
  }

  return prisma.proposalTemplate.create({
    data: {
      name: "Modelo padrão Sampa Terra",
      description: "Conteúdo base das propostas — gerado automaticamente.",
      content: conteudoInicial() as any,
      isDefault: true,
    },
  });
}
