"use client";

import type {
  LayoutElement,
  TextElement,
  ImageElement,
  RectElement,
} from "@/lib/pdf/layout";

const inputCls =
  "w-full px-2 py-1.5 rounded-md border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]";
const labelCls =
  "block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-1";

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-md border border-gray-200 overflow-hidden">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`flex-1 py-1.5 text-[11px] border-r border-gray-200 last:border-r-0 transition ${
            value === v
              ? "bg-[#1A1A1A] text-white font-semibold"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function LayoutInspector({
  element,
  imageOptions,
  totalPages,
  onCommit,
  onPatch,
  onRemove,
  onReorder,
  onReattach,
}: {
  element: LayoutElement | null;
  imageOptions: { label: string; src: string }[];
  totalPages: number;
  onCommit: () => void;
  onPatch: (data: Partial<LayoutElement>) => void;
  onRemove: () => void;
  onReorder: (to: "front" | "back") => void;
  onReattach: (blockId: string) => void;
}) {
  if (!element) {
    return (
      <div className="p-4 text-xs text-gray-400 leading-relaxed">
        Clique num elemento da folha para editar.
        <br />
        <br />
        Para mexer num bloco que o sistema monta sozinho, use{" "}
        <strong className="text-gray-600">Soltar</strong> na lista de camadas — ele ganha
        posição própria e pode até mudar de folha.
      </div>
    );
  }

  const e = element;
  const set = (data: Partial<LayoutElement>) => {
    onCommit();
    onPatch(data);
  };
  // Arrastar o range dispara muitos eventos: só o primeiro entra no histórico.
  const live = (data: Partial<LayoutElement>) => onPatch(data);

  const NumField = ({ k, label, step = 1 }: { k: "x" | "y" | "w" | "h"; label: string; step?: number }) => (
    <div className="flex-1 min-w-0">
      <label className={labelCls}>{label}</label>
      <input
        type="number"
        step={step}
        value={Math.round((e as any)[k] * 10) / 10}
        onChange={(ev) => set({ [k]: parseFloat(ev.target.value) || 0 } as any)}
        className={`${inputCls} tabular-nums font-mono`}
      />
    </div>
  );

  return (
    <div className="text-xs">
      {/* Origem do elemento */}
      {e.sourceId && (
        <div className="px-3 py-2.5 bg-amber-50 border-b border-amber-200">
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Bloco solto do layout automático.
          </p>
          <button
            onClick={() => onReattach(e.sourceId!)}
            className="mt-1.5 w-full py-1.5 rounded-md border border-amber-300 bg-white text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
          >
            Devolver ao fluxo automático
          </button>
        </div>
      )}

      {/* Folha e posição */}
      <div className="p-3 border-b border-gray-100 space-y-2">
        <div>
          <label className={labelCls}>Folha</label>
          <select
            value={e.pageIndex}
            onChange={(ev) => set({ pageIndex: Number(ev.target.value) })}
            className={inputCls}
          >
            {Array.from({ length: Math.max(totalPages, e.pageIndex) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Folha {n}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-gray-400 mt-1">
            Trocar a folha move o elemento para lá, na mesma posição.
          </p>
        </div>
        <div className="flex gap-2">
          <NumField k="x" label="X" />
          <NumField k="y" label="Y" />
        </div>
        <div className="flex gap-2">
          <NumField k="w" label="Largura" />
          <NumField k="h" label="Altura" />
        </div>
        <div>
          <label className={labelCls}>Opacidade</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={e.opacity}
            onMouseDown={onCommit}
            onChange={(ev) => live({ opacity: parseFloat(ev.target.value) })}
            className="w-full accent-[#F5A623]"
          />
        </div>
      </div>

      {/* Texto */}
      {e.kind === "text" && (
        <>
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelCls}>Corpo</label>
                <input
                  type="number"
                  step={0.5}
                  value={(e as TextElement).size}
                  onChange={(ev) => set({ size: parseFloat(ev.target.value) || 9 } as any)}
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div className="flex-1">
                <label className={labelCls}>Peso</label>
                <select
                  value={(e as TextElement).weight}
                  onChange={(ev) => set({ weight: Number(ev.target.value) as any })}
                  className={inputCls}
                >
                  <option value={400}>Normal</option>
                  <option value={500}>Médio</option>
                  <option value={600}>Semi</option>
                  <option value={700}>Negrito</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelCls}>Entrelinha</label>
                <input
                  type="number"
                  step={0.05}
                  value={(e as TextElement).lineHeight}
                  onChange={(ev) => set({ lineHeight: parseFloat(ev.target.value) || 1.4 } as any)}
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div className="flex-1">
                <label className={labelCls}>Entre letras</label>
                <input
                  type="number"
                  step={0.1}
                  value={(e as TextElement).letterSpacing}
                  onChange={(ev) => set({ letterSpacing: parseFloat(ev.target.value) || 0 } as any)}
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className={labelCls}>Cor</label>
                <input
                  type="color"
                  value={(e as TextElement).color}
                  onMouseDown={onCommit}
                  onChange={(ev) => live({ color: ev.target.value } as any)}
                  className="w-full h-7 rounded-md border border-gray-200 cursor-pointer"
                />
              </div>
              <button
                onClick={() => set({ italic: !(e as TextElement).italic } as any)}
                className={`px-3 h-7 rounded-md border text-[11px] italic ${
                  (e as TextElement).italic
                    ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                    : "bg-white text-gray-500 border-gray-200"
                }`}
              >
                Itálico
              </button>
            </div>
            <div>
              <label className={labelCls}>Alinhamento</label>
              <Seg
                value={(e as TextElement).align}
                options={[["left", "Esq"], ["center", "Centro"], ["right", "Dir"], ["justify", "Just"]]}
                onChange={(v) => set({ align: v } as any)}
              />
            </div>
          </div>
          <div className="p-3 border-b border-gray-100">
            <label className={labelCls}>Destaque</label>
            <Seg
              value={(e as TextElement).highlight}
              options={[
                ["none", "Sem"],
                ["marker", "Marca"],
                ["box", "Caixa"],
                ["bar", "Barra"],
                ["block", "Bloco"],
              ]}
              onChange={(v) => set({ highlight: v } as any)}
            />
            <p className="text-[10px] text-gray-400 mt-1.5">
              Duplo clique no texto da folha para reescrever.
            </p>
          </div>
        </>
      )}

      {/* Imagem */}
      {e.kind === "image" && (
        <div className="p-3 border-b border-gray-100 space-y-2">
          <div>
            <label className={labelCls}>Recorte</label>
            <Seg
              value={(e as ImageElement).clip}
              options={[["hex", "Hexágono"], ["circle", "Círculo"], ["none", "Reto"]]}
              onChange={(v) => set({ clip: v } as any)}
            />
          </div>
          <div>
            <label className={labelCls}>Enquadramento</label>
            <Seg
              value={(e as ImageElement).fit}
              options={[["cover", "Preencher"], ["contain", "Caber inteira"]]}
              onChange={(v) => set({ fit: v } as any)}
            />
          </div>
          {imageOptions.length > 0 && (
            <div>
              <label className={labelCls}>Trocar a foto</label>
              <select
                value={(e as ImageElement).src}
                onChange={(ev) => set({ src: ev.target.value } as any)}
                className={inputCls}
              >
                {imageOptions.map((o) => (
                  <option key={o.src} value={o.src}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <p className="text-[10px] text-gray-400">
            Segure Shift ao redimensionar para não distorcer a foto.
          </p>
        </div>
      )}

      {/* Forma */}
      {e.kind === "rect" && (
        <div className="p-3 border-b border-gray-100">
          <label className={labelCls}>Cor</label>
          <input
            type="color"
            value={(e as RectElement).fill}
            onMouseDown={onCommit}
            onChange={(ev) => live({ fill: ev.target.value } as any)}
            className="w-full h-7 rounded-md border border-gray-200 cursor-pointer"
          />
        </div>
      )}

      {/* Ações */}
      <div className="p-3 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => { onCommit(); onReorder("front"); }}
            className="flex-1 py-1.5 rounded-md border border-gray-200 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
          >
            Trazer à frente
          </button>
          <button
            onClick={() => { onCommit(); onReorder("back"); }}
            className="flex-1 py-1.5 rounded-md border border-gray-200 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
          >
            Para trás
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => set({ locked: !e.locked })}
            className="flex-1 py-1.5 rounded-md border border-gray-200 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
          >
            {e.locked ? "Liberar" : "Travar"}
          </button>
          <button
            onClick={() => set({ hidden: !e.hidden })}
            className="flex-1 py-1.5 rounded-md border border-gray-200 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
          >
            {e.hidden ? "Mostrar" : "Ocultar"}
          </button>
        </div>
        <button
          onClick={() => { onCommit(); onRemove(); }}
          className="w-full py-1.5 rounded-md border border-red-200 text-[11px] font-semibold text-red-500 hover:bg-red-50"
        >
          Excluir elemento
        </button>
      </div>
    </div>
  );
}
