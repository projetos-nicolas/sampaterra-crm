"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Arrastar cards entre colunas de um kanban.
 *
 * Usa a API de drag-and-drop nativa do HTML5, sem biblioteca: o kanban tem
 * poucas colunas e um alvo simples (a coluna inteira), então não compensa
 * carregar uma dependência.
 *
 * Duas coisas importantes:
 *  - O arraste NÃO funciona por toque (celular e tablet). Os botões de avançar
 *    e voltar precisam continuar existindo — são a única forma nesses
 *    aparelhos.
 *  - Soltar na mesma coluna de origem não dispara nada, para não gravar uma
 *    mudança de status que não mudou nada.
 */
export function useKanbanDnD<T extends string>({
  onMove,
}: {
  /** Chamado quando um card é solto numa coluna diferente da de origem. */
  onMove: (cardId: string, para: T) => void;
}) {
  const [arrastando, setArrastando] = useState<{ id: string; de: T } | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<T | null>(null);

  /**
   * O que está sendo arrastado também vive numa ref.
   *
   * O estado do React só é aplicado no próximo render, e o primeiro
   * `dragover` costuma chegar antes disso. Se a decisão dependesse do estado,
   * o `preventDefault` não aconteceria a tempo e o navegador recusaria o
   * "soltar" — um arraste rápido simplesmente não funcionaria. A ref decide;
   * o estado serve só para o visual.
   */
  const arrastandoRef = useRef<{ id: string; de: T } | null>(null);

  /** Props para espalhar no card. */
  const cardProps = useCallback(
    (id: string, coluna: T) => ({
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        arrastandoRef.current = { id, de: coluna };
        setArrastando({ id, de: coluna });
        e.dataTransfer.effectAllowed = "move";
        // Alguns navegadores só iniciam o arraste se houver dado no evento
        e.dataTransfer.setData("text/plain", id);
      },
      onDragEnd: () => {
        arrastandoRef.current = null;
        setArrastando(null);
        setColunaAlvo(null);
      },
      style: {
        opacity: arrastando?.id === id ? 0.4 : undefined,
        cursor: "grab" as const,
      },
    }),
    [arrastando]
  );

  /** Props para espalhar na coluna que recebe. */
  const colunaProps = useCallback(
    (coluna: T) => ({
      onDragOver: (e: React.DragEvent) => {
        if (!arrastandoRef.current) return;
        // Sem o preventDefault o navegador recusa o "soltar"
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (colunaAlvo !== coluna) setColunaAlvo(coluna);
      },
      onDragLeave: (e: React.DragEvent) => {
        // Só limpa quando o ponteiro sai de verdade da coluna, e não ao passar
        // sobre um card filho
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setColunaAlvo((c) => (c === coluna ? null : c));
        }
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const atual = arrastandoRef.current;
        arrastandoRef.current = null;
        setArrastando(null);
        setColunaAlvo(null);
        if (!atual || atual.de === coluna) return;
        onMove(atual.id, coluna);
      },
    }),
    [colunaAlvo, onMove]
  );

  return {
    /** Card sendo arrastado, ou null. */
    arrastando,
    /** Coluna sob o ponteiro — para destacar o alvo. */
    colunaAlvo,
    cardProps,
    colunaProps,
  };
}
