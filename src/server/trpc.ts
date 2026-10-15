import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { type Context } from "./context";
import { traduzirErro, ERRO_GENERICO } from "@/lib/erros";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const ehZod = error.cause instanceof ZodError;

    /**
     * Limpa a mensagem antes dela sair do servidor.
     *
     * Erros do Prisma e do driver do Postgres chegavam inteiros na tela do
     * usuário (stack, nome da query, host do banco). Aqui o texto bruto fica
     * só no log do servidor e o cliente recebe uma frase curta. Mensagens
     * que nós mesmos escrevemos (TRPCError com `message`) passam intactas.
     */
    let message = shape.message;
    if (!ehZod) {
      const amigavel = traduzirErro(message);
      if (amigavel) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[trpc] erro bruto:", error);
        } else {
          console.error("[trpc]", error.code, error.message);
        }
        message = amigavel;
      }
    }
    if (!message) message = ERRO_GENERICO;

    return {
      ...shape,
      message,
      data: {
        ...shape.data,
        zodError: ehZod ? (error.cause as ZodError).flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

/**
 * Middleware público — sem autenticação
 */
export const publicProcedure = t.procedure;

/**
 * Middleware protegido — requer sessão autenticada
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/**
 * Middleware admin — requer role admin ou coordinator
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.session.user.role as string;
  if (!["admin", "coordinator"].includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso restrito a administradores.",
    });
  }
  return next({ ctx });
});

/**
 * Middleware super admin — requer role admin (somente).
 * Usado para ações destrutivas (exclusão de leads, propostas e projetos).
 */
export const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.session.user.role as string;
  if (role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta ação é restrita à conta de administrador.",
    });
  }
  return next({ ctx });
});
