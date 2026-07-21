"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { SampaTerraLogo } from "@/components/SampaTerraLogo";
import { trpc } from "@/trpc/client";

// ─── Formulário de Cadastro ───────────────────────────────────────────────────

function CadastroForm({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState({
    type: "PF" as "PF" | "PJ",
    name: "",
    company: "",
    email: "",
    cpf_cnpj: "",
    phone: "",
  });
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const createMut = trpc.requests.create.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => setError(e.message),
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  const inputCls = "w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent transition";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" className="w-7 h-7">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h2 className="text-gray-900 font-bold text-lg mb-2">Solicitação Enviada!</h2>
        <p className="text-gray-500 text-sm mb-6">
          Sua solicitação foi recebida e será analisada pela equipe Sampa Terra.
          Você receberá o acesso assim que for aprovada.
        </p>
        <button onClick={onBack}
          className="w-full py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-lg text-sm hover:bg-gray-50 transition">
          Voltar ao Login
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-gray-900 font-bold text-xl mb-1">Criar Cadastro</h1>
        <p className="text-gray-400 text-sm">Solicite seu acesso ao portal</p>
      </div>

      {/* Tipo PF/PJ */}
      <div className="flex gap-2">
        {(["PF", "PJ"] as const).map((t) => (
          <button key={t} type="button"
            onClick={() => set("type", t)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold border transition ${
              form.type === t
                ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
            }`}>
            {t === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
          </button>
        ))}
      </div>

      {/* Nome */}
      <div>
        <label className={labelCls}>{form.type === "PJ" ? "Nome do Responsável" : "Nome Completo"} *</label>
        <input value={form.name} onChange={(e) => set("name", e.target.value)}
          placeholder={form.type === "PJ" ? "João Silva" : "João da Silva"}
          className={inputCls} />
      </div>

      {/* Razão Social (PJ) */}
      {form.type === "PJ" && (
        <div>
          <label className={labelCls}>Razão Social / Nome da Empresa *</label>
          <input value={form.company} onChange={(e) => set("company", e.target.value)}
            placeholder="Empresa LTDA"
            className={inputCls} />
        </div>
      )}

      {/* E-mail */}
      <div>
        <label className={labelCls}>E-mail *</label>
        <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
          placeholder="seu@email.com"
          className={inputCls} />
      </div>

      {/* CPF/CNPJ */}
      <div>
        <label className={labelCls}>{form.type === "PJ" ? "CNPJ" : "CPF"}</label>
        <input value={form.cpf_cnpj} onChange={(e) => set("cpf_cnpj", e.target.value)}
          placeholder={form.type === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
          className={inputCls} />
      </div>

      {/* Telefone */}
      <div>
        <label className={labelCls}>Telefone / WhatsApp</label>
        <input value={form.phone} onChange={(e) => set("phone", e.target.value)}
          placeholder="(00) 00000-0000"
          className={inputCls} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        onClick={() => {
          if (!form.name || !form.email) { setError("Nome e e-mail são obrigatórios."); return; }
          if (form.type === "PJ" && !form.company) { setError("Informe a razão social."); return; }
          createMut.mutate({
            type: form.type,
            name: form.name,
            email: form.email,
            company: form.company || undefined,
            cpf_cnpj: form.cpf_cnpj || undefined,
            phone: form.phone || undefined,
          });
        }}
        disabled={createMut.isPending}
        className="w-full py-2.5 bg-[#F5A623] hover:bg-[#F7BB52] text-white font-semibold rounded-lg text-sm transition disabled:opacity-60">
        {createMut.isPending ? "Enviando..." : "Solicitar Acesso"}
      </button>

      <button type="button" onClick={onBack}
        className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition">
        ← Voltar ao login
      </button>
    </div>
  );
}

// ─── Página de Login ──────────────────────────────────────────────────────────

// ─── Formulário Esqueci Senha ─────────────────────────────────────────────────

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const requestMut = trpc.auth.requestReset.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => setError(e.message),
  });

  const inputCls =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent transition";

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" className="w-7 h-7">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h2 className="text-gray-900 font-bold text-lg mb-2">E-mail Enviado!</h2>
        <p className="text-gray-500 text-sm mb-6">
          Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
          Verifique também a caixa de spam.
        </p>
        <button onClick={onBack}
          className="w-full py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-lg text-sm hover:bg-gray-50 transition">
          Voltar ao Login
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-gray-900 font-bold text-xl mb-1">Esqueci minha senha</h1>
        <p className="text-gray-400 text-sm">
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          placeholder="seu@email.com"
          className={inputCls}
        />
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      <button
        onClick={() => {
          if (!email) { setError("Informe seu e-mail."); return; }
          requestMut.mutate({ email });
        }}
        disabled={requestMut.isPending}
        className="w-full py-2.5 bg-[#1A1A1A] hover:bg-[#2C2C2C] text-white font-semibold rounded-lg text-sm transition disabled:opacity-60"
      >
        {requestMut.isPending ? "Enviando..." : "Enviar Link de Redefinição"}
      </button>
      <button type="button" onClick={onBack}
        className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition">
        ← Voltar ao login
      </button>
    </div>
  );
}

// ─── Página de Login ──────────────────────────────────────────────────────────

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCadastro, setShowCadastro] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    // Hard redirect para garantir que o cookie de sessão seja lido na primeira navegação
    window.location.href = "/dashboard";
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      {/* Padrão decorativo */}
      <div
        className="absolute top-0 right-0 w-64 h-64 opacity-10"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 2px, transparent 0, transparent 50%)",
          backgroundSize: "12px 12px",
        }}
      />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <SampaTerraLogo variant="azul-quadrado" height={72} />
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {showCadastro ? (
            <CadastroForm onBack={() => setShowCadastro(false)} />
          ) : showForgot ? (
            <ForgotPasswordForm onBack={() => setShowForgot(false)} />
          ) : (
            <>
              <h1 className="text-gray-900 font-bold text-xl mb-1">Acesso ao Sistema</h1>
              <p className="text-gray-400 text-sm mb-6">Entre com suas credenciais</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent transition"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 pr-10 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent transition"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs text-[#1A1A1A] hover:underline font-medium"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#F5A623] hover:bg-[#F7BB52] text-white font-semibold rounded-lg text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>

              {/* Divisor */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">ou</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Botão Criar Cadastro */}
              <button
                onClick={() => setShowCadastro(true)}
                className="w-full py-2.5 border-2 border-[#1A1A1A] text-[#1A1A1A] font-semibold rounded-lg text-sm hover:bg-[#1A1A1A]/5 transition"
              >
                Criar Cadastro
              </button>
            </>
          )}
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          Sampa Terra e Construções Ltda
        </p>
   