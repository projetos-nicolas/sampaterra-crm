"use client";

/**
 * Avisos flutuantes no canto da tela.
 *
 * Substitui os `alert()` do navegador, que travavam a página e mostravam o
 * texto cru do erro numa caixa cinza do sistema. Aqui a mensagem aparece em
 * um cartão discreto e some sozinha.
 *
 * Uso: `toastErro("...")` / `toastOk("...")` de qualquer lugar — não precisa
 * de provider nem de contexto, basta o <ToastHost /> estar montado no layout.
 */

import { useEffect, useState } from "react";

type Tipo = "erro" | "ok";
interface Aviso {
  id: number;
  tipo: Tipo;
  texto: string;
}

let proximoId = 1;
const ouvintes = new Set<(avisos: Aviso[]) => void>();
let avisos: Aviso[] = [];

function emitir() {
  const copia = [...avisos];
  Array.from(ouvintes).forEach((o) => o(copia));
}

function adicionar(tipo: Tipo, texto: string, duracao: number) {
  const aviso: Aviso = { id: proximoId++, tipo, texto };
  avisos = [...avisos, aviso];
  emitir();
  setTimeout(() => {
    avisos = avisos.filter((a) => a.id !== aviso.id);
    emitir();
  }, duracao);
}

export function toastErro(texto: string) {
  adicionar("erro", texto, 6000);
}

export function toastOk(texto: string) {
  adicionar("ok", texto, 3500);
}

export function ToastHost() {
  const [lista, setLista] = useState<Aviso[]>([]);

  useEffect(() => {
    ouvintes.add(setLista);
    setLista([...avisos]);
    return () => {
      ouvintes.delete(setLista);
    };
  }, []);

  if (lista.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none max-w-[92vw] w-80">
      {lista.map((a) => (
        <div
          key={a.id}
          role="status"
          className={
            "pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg text-sm animate-[toastIn_.18s_ease-out] " +
            (a.tipo === "erro"
              ? "bg-white border-red-200 text-red-800"
              : "bg-white border-emerald-200 text-emerald-800")
          }
        >
          <span className="mt-0.5 shrink-0">
            {a.tipo === "erro" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4.5M12 16h.01" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <circle cx="12" cy="12" r="9" />
                <path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span className="leading-snug flex-1">{a.texto}</span>
          <button
            onClick={() => {
              avisos = avisos.filter((x) => x.id !== a.id);
              emitir();
            }}
            className="shrink-0 text-gray-300 hover:text-gray-500 leading-none text-lg -mt-0.5"
            aria-label="Fechar aviso"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/** Faixa de erro padrão para usar dentro de formulários e modais. */
export function ErroInline({ mensagem }: { mensagem?: string | null }) {
  if (!mensagem) return null;
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 mt-0.5 shrink-0">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4.5M12 16h.01" strokeLinecap="round" />
      </svg>
      <span className="leading-snug">{mensagem}</span>
    </div>
  );
}
