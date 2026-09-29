import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Mantém o banco do Supabase acordado.
 *
 * No plano gratuito o Supabase PAUSA o projeto depois de alguns dias sem
 * nenhuma consulta. Quando isso acontece, o login para de funcionar com uma
 * mensagem enganosa ("e-mail ou senha inválidos") — foi o que aconteceu em
 * 2026-09-29. Restaurar exige entrar no painel e esperar alguns minutos.
 *
 * Esta rota faz uma consulta mínima só para registrar atividade. É chamada
 * automaticamente pelo agendamento da Vercel (ver vercel.json).
 *
 * Isto é um CONTORNO, não a solução oficial: a Supabase pode mudar a regra de
 * pausa a qualquer momento. A solução definitiva é o plano Pro, que não pausa.
 */

// Nunca cacheia: uma resposta em cache não tocaria o banco e o projeto
// pausaria do mesmo jeito, silenciosamente.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  // A Vercel envia "Authorization: Bearer <CRON_SECRET>" quando essa variável
  // existe no projeto. Se não estiver configurada, a rota segue aberta — ela
  // só faz uma contagem, mas configurar o segredo é o recomendado.
  const segredo = process.env.CRON_SECRET;
  if (segredo) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${segredo}`) {
      return NextResponse.json({ ok: false, erro: "não autorizado" }, { status: 401 });
    }
  }

  const inicio = Date.now();
  try {
    // Consulta mais barata possível que ainda obriga uma ida ao banco
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      mensagem: "banco acordado",
      duracaoMs: Date.now() - inicio,
      em: new Date().toISOString(),
    });
  } catch (e: any) {
    // Se o banco já estiver pausado, isto falha — e é justamente o sinal de
    // que alguém precisa restaurar o projeto no painel do Supabase.
    return NextResponse.json(
      {
        ok: false,
        mensagem: "não consegui falar com o banco — pode estar pausado no Supabase",
        detalhe: e?.message?.slice(0, 200) ?? "erro desconhecido",
        em: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
