"use client";

import type { LayoutElement, LayerPageKind, ProposalLayout } from "@/lib/pdf/layout";
import type { AutoBlockDef } from "./autoBlocks";

const ICON: Record<string, string> = { text: "T", image: "▣", rect: "▭" };

/**
 * Lista de camadas da folha aberta.
 *
 * Duas seções: os blocos que o sistema monta sozinho (com o botão Soltar) e
 * os elementos livres já posicionados. É aqui que o usuário tira um bloco do
 * fluxo para poder arrastá-lo ou mandá-lo para outra folha.
 */
export function LayerList({
  page,
  layout,
  elements,
  autoBlocks,
  selected,
  onSelect,
  onDetach,
  onReattach,
  onToggleLock,
  onDetachAll,
}: {
  page: LayerPageKind;
  layout: ProposalLayout;
  elements: LayoutElement[];
  autoBlocks: AutoBlockDef[];
  selected: string[];
  onSelect: (ids: string[]) => void;
  onDetach: (def: AutoBlockDef) => void;
  onReattach: (blockId: string) => void;
  onToggleLock: (id: string) => void;
  onDetachAll: () => void;
}) {
  const doPage = autoBlocks.filter((b) => b.page === page);
  const presos = doPage.filter((b) => !layout.detached.includes(b.id));

  return (
    <div className="text-xs">
      {doPage.length > 0 && (
        <>
          <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
            <p className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">
              Montado pelo sistema
            </p>
            {presos.length > 0 && (
              <button
                onClick={onDetachAll}
                className="text-[10px] font-semibold text-[#F5A623] hover:underline"
                title="Solta todos os blocos desta folha de uma vez"
              >
                Soltar tudo
              </button>
            )}
          </div>
          {doPage.map((b) => {
            const solto = layout.detached.includes(b.id);
            return (
              <div
                key={b.id}
                className={`flex items-center gap-2 px-3 py-1.5 ${
                  solto ? "opacity-45" : "hover:bg-white"
                }`}
              >
                <span className="w-3 text-center text-[10px] text-gray-400">≡</span>
                <span className="flex-1 truncate text-gray-600">{b.label}</span>
                {solto ? (
                  <button
                    onClick={() => onReattach(b.id)}
                    className="text-[10px] font-semibold text-gray-400 hover:text-gray-700 whitespace-nowrap"
                  >
                    devolver
                  </button>
                ) : (
                  <button
                    onClick={() => onDetach(b)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 hover:border-[#F5A623] hover:text-[#F5A623] whitespace-nowrap"
                  >
                    Soltar
                  </button>
                )}
              </div>
            );
          })}
        </>
      )}

      <p className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1.5">
        Elementos livres
      </p>
      {elements.length === 0 ? (
        <p className="px-3 pb-3 text-[11px] text-gray-400 leading-relaxed">
          Nada solto nesta folha ainda.
        </p>
      ) : (
        // De cima para baixo na lista = da frente para trás na folha
        [...elements].reverse().map((e) => (
          <div
            key={e.id}
            onClick={() => onSelect([e.id])}
            className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer border-l-2 ${
              selected.includes(e.id)
                ? "bg-blue-50 border-blue-500 text-gray-900"
                : "border-transparent text-gray-600 hover:bg-white"
            } ${e.hidden ? "opacity-40" : ""}`}
          >
            <span className="w-3 text-center text-[10px] text-gray-400">{ICON[e.kind]}</span>
            <span className="flex-1 truncate">{e.name}</span>
            {e.sourceId && (
              <span className="text-[9px] text-[#F5A623] font-bold uppercase">solto</span>
            )}
            <button
              onClick={(ev) => { ev.stopPropagation(); onToggleLock(e.id); }}
              className="text-[10px] opacity-50 hover:opacity-100"
              title={e.locked ? "Liberar" : "Travar"}
            >
              {e.locked ? "🔒" : "🔓"}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
