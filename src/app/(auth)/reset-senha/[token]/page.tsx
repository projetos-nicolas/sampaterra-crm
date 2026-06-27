"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SampaTerraLogo } from "@/components/SampaTerraLogo";
import { trpc } from "@/trpc/client";

export default function ResetSenhaPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [erro, setErro] = useState("");

  const { data: validation, isLoading } = trpc.auth.validateResetToken.useQuery(
    { token },
    { retry: false }
  );

  const resetMut = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => setErro(e.message),
  });

  const inputCls =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent transition";

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <div
        className="absolute top-0 right-0 w-64 h-64 opacity-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #fff 0, #fff 2px, transparent 0, transparent 50%)",
          backgroundSize: "12px 12px",
        }}
      />

      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <SampaTerraLogo variant="azul-quadrado" height={72} />
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-8">
          {isLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Verificando link...</div>
          ) : done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" className="w-7 h-7">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2 className="text-gray-900 font-bold text-lg mb-2">Senha Redefinida!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Sua senha foi atualizada com sucesso. Você já pode fazer login.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="w-full py-2.5 bg-[#F5A623] hover:bg-[#F7BB52] text-white font-semibold rounded-lg text-sm transition"
              >
                Ir para o Login
              </button>
            </div>
          ) : !validation?.valid ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" className="w-7 h-7">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h2 className="text-gray-900 font-bold text-lg mb-2">Link Inválido ou Expirado</h2>
              <p className="text-gray-500 text-sm mb-6">
                Este link de redefinição não é mais válido. Solicite um novo na página de login.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="w-full py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Voltar ao Login
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-gray-900 font-bold text-xl mb-1">Nova Senha</h1>
              <p className="text-gray-400 text-sm mb-6">
                Defina uma nova senha para <strong>{validation.email}</strong>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErro(""); }}
                    placeholder="Mínimo 6 caracteres"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Confirmar Senha
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setErro(""); }}
                    placeholder="Repita a senha"
                    className={inputCls}
                  />
                </div>

                {erro && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                    {erro}
                  </div>
                )}

                <button
                  onClick={() => {
                    if (password.length < 6) { setErro("Senha deve ter pelo menos 6 caracteres."); return; }
                    if (password !== confirm) { setErro("As senhas não coincidem."); return; }
                    resetMut.mutate({ token, newPassword: password });
                  }}
                  disabled={resetMut.isPending}
                  className="w-full py-2.5 bg-[#F5A623] hover:bg-[#F7BB52] text-white font-semibold rounded-lg text-sm transition disabled:opacity-60"
                >
                  {resetMut.isPending ? "Salvando..." : "Redefinir Senha"}
                </button>

                <button
                  onClick={() => router.push("/login")}
                  className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition"
                >
                  ← Voltar ao login
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          Sampa Terra e Construções Ltda
        </p>
      </div>
    </div>
  );
}
