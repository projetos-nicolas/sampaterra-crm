import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const clientFilesRouter = createTRPCRouter({
  // Registrar arquivo após upload direto para Supabase Storage
  create: protectedProcedure
    .input(
      z.object({
        projectId:   z.string().uuid(),
        name:        z.string().min(1),
        storagePath: z.string(),
        fileSize:    z.number().optional(),
        mimeType:    z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clienteId = (ctx.session.user as any).clienteId as string | null;
      if (!clienteId) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas clientes podem enviar arquivos." });

      // Confirma que o projeto pertence ao cliente
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, clientId: clienteId },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "Projeto não encontrado." });

      return ctx.prisma.clientFile.create({
        data: {
          projectId:   input.projectId,
          clientId:    clienteId,
          name:        input.name,
          storagePath: input.storagePath,
          fileSize:    input.fileSize,
          mimeType:    input.mimeType,
        },
      });
    }),

  // Listar arquivos de um projeto (admin vê tudo, cliente vê só os seus)
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const role = (ctx.session.user as any).role as string;
      const clienteId = (ctx.session.user as any).clienteId as string | null;
      return ctx.prisma.clientFile.findMany({
        where: {
          projectId: input.projectId,
          ...(role === "client" && clienteId ? { clientId: clienteId } : {}),
        },
        include: { client: { select: { id: true, name: true, company: true } } },
        orderBy: { uploadedAt: "desc" },
      });
    }),

  // Deletar arquivo (admin only)
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.clientFile.delete({ where: { id: input.id } });
    }),
});
