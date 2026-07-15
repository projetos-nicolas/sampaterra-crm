import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const authRouter = createTRPCRouter({
  // Solicitar reset de senha — envia e-mail via Resend
  requestReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findFirst({
        where: { email: input.email, active: true },
        select: { id: true, name: true, email: true },
      });

      // Sempre retorna sucesso para não revelar se e-mail existe
      if (!user) return { ok: true };

      // Invalida tokens anteriores
      await ctx.prisma.passwordResetToken.updateMany({
        where: { email: input.email, used: false },
        data: { used: true },
      });

      // Gera novo token (64 hex chars)
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

      await ctx.prisma.passwordResetToken.create({
        data: { email: input.email, token, expiresAt },
      });

      // Envia e-mail via Resend
      const appUrl = process.env.NEXTAUTH_URL ?? "https://sampaterra-crm.vercel.app";
      const resetUrl = `${appUrl}/reset-senha/${token}`;

      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: process.env.RESEND_FROM ?? "Sampa Terra CRM <noreply@sampaterra.com.br>",
        to: user.email,
        subject: "Redefinição de Senha — Sampa Terra CRM",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
            <div style="background:#1A1A1A;padding:20px 24px;border-radius:10px 10px 0 0;">
              <h1 style="color:#fff;font-size:20px;margin:0;font-weight:800;letter-spacing:1px;">SAMPA TERRA</h1>
            </div>
            <div style="border:1px solid #e5e7eb;border-top:none;padding:28px 24px;border-radius:0 0 10px 10px;">
              <p style="color:#1c1917;font-size:16px;font-weight:700;margin:0 0 8px;">Olá, ${user.name}</p>
              <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
                Recebemos uma solicitação para redefinir a senha da sua conta no Sampa Terra CRM.
                Clique no botão abaixo para criar uma nova senha. O link expira em <strong>1 hora</strong>.
              </p>
              <a href="${resetUrl}"
                style="display:inline-block;background:#F5A623;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">
                Redefinir Minha Senha
              </a>
              <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;">
                Se você não solicitou isso, ignore este e-mail. Sua senha permanece a mesma.
              </p>
              <p style="color:#9ca3af;font-size:11px;margin:8px 0 0;word-break:break-all;">
                Ou acesse: ${resetUrl}
              </p>
            </div>
          </div>
        `,
      });

      return { ok: true };
    }),

  // Confirmar nova senha com token
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(10),
        newPassword: z.string().min(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.prisma.passwordResetToken.findUnique({
        where: { token: input.token },
      });

      if (!record || record.used) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Link inválido ou já utilizado." });
      }

      if (new Date() > record.expiresAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Link expirado. Solicite um novo reset." });
      }

      const hash = await bcrypt.hash(input.newPassword, 10);

      await ctx.prisma.user.update({
        where: { email: record.email },
        data: { password: hash },
      });

      await ctx.prisma.passwordResetToken.update({
        where: { token: input.token },
        data: { used: true },
      });

      return { ok: true };
    }),

  // Validar token (para mostrar formulário ou erro antes de submeter)
  validateResetToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const record = await ctx.prisma.passwordResetToken.findUnique({
        where: { token: input.token },
        select: { used: true, expiresAt: true, email: true },
      });

      if (!record || record.used || new Date() > record.expiresAt) {
        return { valid: false };
      }

      return { valid: true, email: record.email };
    }),
});
