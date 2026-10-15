"use client";

/**
 * Gestão dos modelos de proposta — o "PDF padrão" e suas variações.
 *
 * Daqui o usuário abre o PDF padrão para editar, salva variações, escolhe
 * qual é o padrão e apaga o que não usa mais. Toda proposta nova nasce do
 * modelo marcado como padrão.
 */

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { mensagemErro } from "@/lib/erros";
import { toastErro, toastOk, ErroInline } from "@/components/Toast";
import { secoesBase, CONDICOES_PAGAMENTO_BASE } from "@/lib/pdf/conteudoBase";
import { DEFAULT_BANK_INFO } from "@/lib/pdf/PropostaPDF";
import { ModeloPdfModal } from "./PdfModal";

export function ModelosModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: modelos, isLoading } = trpc.propostaModelos.list.useQuery();

  const [erro, setErro] = useState("");
  const [editandoPdf, setEditandoPdf] = useState<string | null>(null);
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [nomeTemp, setNomeTemp] = useState("");
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [criandoNome, setCriandoNome] = useState("");
  const [criando, setCriando] = useState(false);

  const recarregar = () => utils.propostaModelos.list.invalidate();
  const aoFalhar = (e: unknown) => setErro(mensagemErro(e));

  const criar = trpc.propostaModelos.create.useMutation({
    onSuccess: (m) => {
      recarregar();
      setCriando(false);
      setCriandoNome("");
      toastOk(`Modelo "${m.name}" criado.`);
      setEditandoPdf(m.id);
    },
    onError: aoFalhar,
  });
  const duplicar = trpc.propostaModelos.duplicar.useMutation({
    onSuccess: (m) => { recarregar(); toastOk(`Cópia criada: "${m.name}".`); },
    onError: aoFalhar,
  });
  const setPadrao = trpc.propostaModelos.setPadrao.useMutation({
    onSuccess: (m) => { recarregar(); toastOk(`"${m.name}" agora é o modelo padrão.`); },
    onError: aoFalhar,
  });
  const renomear = trpc.propostaModelos.update.useMutation({
    onSuccess: () => { recarregar(); setRenomeando(null); },
    onError: aoFalhar,
  });
  const excluir = trpc.propostaModelos.delete.useMutation({
    onSuccess: () => { recarregar(); setConfirmando(null); toastOk("Modelo excluído."); },
    onError: (e) => { aoFalhar(e); setConfirmando(null); },
  });
  const restaurar = trpc.propostaModelos.restaurarBase.useMutation({
    onSuccess: () => { recarregar(); toastOk("Modelo restaurado para o conteúdo base."); },
    onError: aoFalhar,
  });

  /** Um modelo novo começa do conteúdo base — nunca em branco. */
  const criarModelo = () => {
    const nome = criandoNome.trim();
    if (!nome) { setErro("Dê um nome ao modelo."); return; }
    setErro("");
    criar.mutate({
      name: nome,
      content: {
        v: 1,
        secoes: secoesBase(),
        exibicaoValores: "completo",
        paymentNotes: CONDICOES_PAGAMENTO_BASE,
        bankInfo: { ...DEFAULT_BANK_INFO },
      },
      tornarPadrao: false,
    });
  };

  if (editandoPdf) {
    return <ModeloPdfModal modeloId={editandoPdf} onClose={() => { setEditandoPdf(null); recarregar(); }} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Modelos de proposta</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              O modelo padrão é o ponto de partida de toda proposta nova.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none -mt-1">
            ×
          </button>
        </div>

        <div className="px-6 py-4">
          <ErroInline mensagem={erro} />

          {isLoading && <p className="text-sm text-gray-400 py-6 text-center">Carregando modelos...</p>}

          <div className="space-y-2">
            {(modelos ?? []).map((m: any) => (
              <div
                key={m.id}
                className={
                  "rounded-xl border px-4 py-3 transition " +
                  (m.isDefault ? "border-[#F5A623]/50 bg-[#F5A623]/5" : "border-gray-200 hover:border-gray-300")
                }
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    {renomeando === m.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={nomeTemp}
                          onChange={(e) => setNomeTemp(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && nomeTemp.trim())
                              renomear.mutate({ id: m.id, name: nomeTemp.trim() });
                            if (e.key === "Escape") setRenomeando(null);
                          }}
                          className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50"
                        />
                        <button
                          onClick={() => nomeTemp.trim() && renomear.mutate({ id: m.id, name: nomeTemp.trim() })}
                          className="text-xs font-semibold text-[#F5A623] hover:underline"
                        >
                          Salvar
                        </button>
                        <button onClick={() => setRenomeando(null)} className="text-xs text-gray-400 hover:underline">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-sm truncate">{m.name}</span>
                          {m.isDefault && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-[#F5A623] text-white rounded-full px-2 py-0.5">
                              Padrão
                            </span>
                          )}
                        </div>
                        {m.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{m.description}</p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setEditandoPdf(m.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1A1A1A] text-white hover:bg-black transition"
                    >
                      Abrir PDF
                    </button>
                    {!m.isDefault && (
                      <button
                        onClick={() => setPadrao.mutate({ id: m.id })}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                      >
                        Tornar padrão
                      </button>
                    )}
                    <button
                      onClick={() => { setRenomeando(m.id); setNomeTemp(m.name); }}
                      title="Renomear"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      onClick={() => duplicar.mutate({ id: m.id })}
                      title="Duplicar"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <rect x="9" y="9" width="12" height="12" rx="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                    </button>
                    {m.isDefault ? (
                      <button
                        onClick={() => restaurar.mutate({ id: m.id })}
                        title="Restaurar o conteúdo base de fábrica"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmando(m.id)}
                        title="Excluir"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {confirmando === m.id && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                    <span className="text-xs text-red-700">
                      Excluir "{m.name}"? As propostas já criadas não mudam.
                    </span>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => excluir.mutate({ id: m.id })}
                        className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md px-2.5 py-1"
                      >
                        Excluir
                      </button>
                      <button onClick={() => setConfirmando(null)} className="text-xs text-gray-500 hover:underline">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Novo modelo */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            {criando ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={criandoNome}
                  onChange={(e) => setCriandoNome(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") criarModelo();
                    if (e.key === "Escape") setCriando(false);
                  }}
                  placeholder="Nome do modelo (ex.: Locação com operador)"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50"
                />
                <button
                  onClick={criarModelo}
                  disabled={criar.isPending}
                  className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-[#F5A623] text-white hover:bg-[#F7BB52] disabled:opacity-60 transition"
                >
                  {criar.isPending ? "Criando..." : "Criar e abrir"}
                </button>
                <button onClick={() => setCriando(false)} className="text-sm text-gray-400 hover:underline px-1">
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setErro(""); setCriando(true); }}
                className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A] hover:text-[#F5A623] transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                Novo modelo
              </button>
            )}
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Um modelo novo começa com o conteúdo base e abre direto no editor.
              Alterações num modelo valem para as próximas propostas — as já criadas não mudam.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
