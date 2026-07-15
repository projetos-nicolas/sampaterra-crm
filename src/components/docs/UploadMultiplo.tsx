"use client";

import { useState, useRef, useCallback } from "react";
import { supabase, STORAGE_BUCKETS } from "@/lib/supabase";
import { trpc } from "@/trpc/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type DocType = "art" | "rrt" | "memorial_descritivo" | "contrato" | "planilha_calculo" | "prancha_pdf" | "link_externo" | "outro";

/** Detecta o tipo do documento pelo nome do arquivo */
function detectarTipo(filename: string): DocType {
  const upper = filename.toUpperCase();
  if (upper.includes("ART"))              return "art";
  if (upper.includes("RRT"))              return "rrt";
  if (upper.includes("MEMORIAL") || upper.includes("MEM.") || upper.includes("DESCRITIVO")) return "memorial_descritivo";
  if (upper.includes("CONTRATO") || upper.includes("CTR"))  return "contrato";
  if (upper.includes("PLANILHA") || upper.includes("CALC")) return "planilha_calculo";
  // PDF como padrão para pranchas
  if (filename.toLowerCase().endsWith(".pdf"))              return "prancha_pdf";
  return "outro";
}

/** Remove extensão e limpa o nome para usar como título */
function limparNome(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim();
}

/** Formata tamanho do arquivo */
function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ArquivoStatus = "aguardando" | "enviando" | "concluido" | "erro";

interface ArquivoItem {
  file: File;
  nome: string; // nome detectado (editável)
  tipo: DocType;
  status: ArquivoStatus;
  progresso: number;
  erro?: string;
  storagePath?: string;
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface UploadMultiploProps {
  projectId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function UploadMultiplo({ projectId, onSuccess, onCancel }: UploadMultiploProps) {
  const [arquivos, setArquivos] = useState<ArquivoItem[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const createManyMut = trpc.docs.createMany.useMutation({ onSuccess });

  // ── Adicionar arquivos ──────────────────────────────────────────────────────

  function adicionarArquivos(files: FileList | File[]) {
    const novos: ArquivoItem[] = Array.from(files).map((file) => ({
      file,
      nome: limparNome(file.name),
      tipo: detectarTipo(file.name),
      status: "aguardando",
      progresso: 0,
    }));
    setArquivos((prev) => [...prev, ...novos]);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) adicionarArquivos(e.dataTransfer.files);
  }, []);

  function removerArquivo(idx: number) {
    setArquivos((prev) => prev.filter((_, i) => i !== idx));
  }

  function atualizarNome(idx: number, nome: string) {
    setArquivos((prev) => prev.map((a, i) => i === idx ? { ...a, nome } : a));
  }

  function atualizarTipo(idx: number, tipo: DocType) {
    setArquivos((prev) => prev.map((a, i) => i === idx ? { ...a, tipo } : a));
  }

  // ── Upload ──────────────────────────────────────────────────────────────────

  async function fazerUpload() {
    if (!arquivos.length || enviando) return;
    setEnviando(true);

    const resultados: { name: string; type: DocType; storagePath?: string; fileSize?: number }[] = [];

    for (let i = 0; i < arquivos.length; i++) {
      const arq = arquivos[i];
      setArquivos((prev) => prev.map((a, idx) => idx === i ? { ...a, status: "enviando", progresso: 10 } : a));

      try {
        const ext = arq.file.name.split(".").pop() ?? "";
        const path = `${projectId}/${Date.now()}-${arq.nome.replace(/\s+/g, "-")}.${ext}`;

        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKETS.DOCUMENTOS)
          .upload(path, arq.file, { upsert: false });

        if (error) throw new Error(error.message);

        setArquivos((prev) => prev.map((a, idx) => idx === i ? { ...a, status: "concluido", progresso: 100, storagePath: data.path } : a));
        resultados.push({ name: arq.nome, type: arq.tipo, storagePath: data.path, fileSize: arq.file.size });

      } catch (err: any) {
        setArquivos((prev) => prev.map((a, idx) => idx === i ? { ...a, status: "erro", erro: err.message } : a));
      }
    }

    if (resultados.length > 0) {
      await createManyMut.mutateAsync({ projectId, docs: resultados });
    }

    setEnviando(false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const DOC_TYPES: { value: DocType; label: string }[] = [
    { value: "prancha_pdf",         label: "Prancha PDF" },
    { value: "art",                 label: "ART" },
    { value: "rrt",                 label: "RRT" },
    { value: "memorial_descritivo", label: "Memorial Descritivo" },
    { value: "contrato",            label: "Contrato" },
    { value: "planilha_calculo",    label: "Planilha de Cálculo" },
    { value: "outro",               label: "Outro" },
  ];

  const todosFinalizados = arquivos.length > 0 && arquivos.every((a) => a.status === "concluido" || a.status === "erro");
  const algumPendente = arquivos.some((a) => a.status === "aguardando");

  return (
    <div className="bg-white border border-[#1A1A1A]/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#1A1A1A]/5">
        <div>
          <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wide">Upload de Documentos</h3>
          <p className="text-xs text-gray-400 mt-0.5">Selecione vários arquivos — o nome é detectado automaticamente</p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
      </div>

      <div className="p-5 space-y-4">
        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragOver ? "border-[#1A1A1A] bg-[#1A1A1A]/5" : "border-gray-300 hover:border-[#1A1A1A]/50 hover:bg-gray-50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && adicionarArquivos(e.target.files)}
          />
          <div className="flex flex-col items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.5" className="w-10 h-10 opacity-40">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round"/>
              <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/>
            </svg>
            <p className="text-sm font-semibold text-gray-600">
              {isDragOver ? "Solte os arquivos aqui" : "Arraste os arquivos ou clique para selecionar"}
            </p>
            <p className="text-xs text-gray-400">PDF, DWG, DXF, XLSX, DOCX — qualquer formato</p>
          </div>
        </div>

        {/* Lista de arquivos */}
        {arquivos.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {arquivos.map((arq, i) => (
              <div key={i} className={`border rounded-xl p-3 transition ${
                arq.status === "concluido" ? "border-green-200 bg-green-50/50" :
                arq.status === "erro"      ? "border-red-200 bg-red-50/50" :
                arq.status === "enviando"  ? "border-blue-200 bg-blue-50/50" :
                "border-gray-200"
              }`}>
                <div className="flex items-start gap-3">
                  {/* Ícone de status */}
                  <div className="flex-shrink-0 mt-0.5">
                    {arq.status === "concluido" && <span className="text-green-500 text-lg">✓</span>}
                    {arq.status === "erro"      && <span className="text-red-400 text-lg">✕</span>}
                    {arq.status === "enviando"  && <span className="text-blue-500 text-lg animate-spin inline-block">◌</span>}
                    {arq.status === "aguardando"&& <span className="text-gray-400 text-lg">○</span>}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Nome editável */}
                    <input
                      value={arq.nome}
                      onChange={(e) => atualizarNome(i, e.target.value)}
                      disabled={arq.status !== "aguardando"}
                      className="w-full font-semibold text-sm text-gray-900 border-0 border-b border-transparent focus:border-[#1A1A1A] focus:outline-none bg-transparent pb-0.5 disabled:text-gray-500"
                    />
                    <div className="flex items-center gap-2">
                      {/* Tipo editável */}
                      <select
                        value={arq.tipo}
                        onChange={(e) => atualizarTipo(i, e.target.value as DocType)}
                        disabled={arq.status !== "aguardando"}
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/30 bg-white disabled:opacity-60"
                      >
                        {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <span className="text-xs text-gray-400">{fmtSize(arq.file.size)}</span>
                    </div>

                    {/* Barra de progresso */}
                    {arq.status === "enviando" && (
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all animate-pulse" style={{ width: "60%" }} />
                      </div>
                    )}
                    {arq.erro && <p className="text-xs text-red-500">{arq.erro}</p>}
                  </div>

                  {/* Remover */}
                  {arq.status === "aguardando" && (
                    <button onClick={() => removerArquivo(i)} className="text-gray-300 hover:text-red-400 text-lg leading-none flex-shrink-0">×</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} disabled={enviando}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
            Cancelar
          </button>
          {todosFinalizados ? (
            <button onClick={onSuccess}
              className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition">
              Concluído ✓
            </button>
          ) : (
            <button
              onClick={fazerUpload}
              disabled={!algumPendente || enviando}
              className="flex-1 px-4 py-2 bg-[#F5A623] hover:bg-[#F7BB52] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
            >
              {enviando ? `Enviando...` : `Enviar ${arquivos.filter((a) => a.status === "aguardando").length} arquivo(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
