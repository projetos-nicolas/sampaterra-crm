"use client";

import { useState, useRef } from "react";
import { trpc } from "@/trpc/client";
import { supabase } from "@/lib/supabase";

const BUCKET = "arquivos-recebidos";

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function UploadArquivos({
  projectId,
  onSuccess,
  onCancel,
}: {
  projectId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const createMut = trpc.clientFiles.create.useMutation();
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, "pending" | "done" | "error">>({});
  const [dragging, setDragging] = useState(false);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  async function handleUpload() {
    if (!files.length) return;
    setUploading(true);

    for (const file of files) {
      setProgress((p) => ({ ...p, [file.name]: "pending" }));
      try {
        const ext = file.name.split(".").pop() ?? "";
        const path = `${projectId}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;

        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (error) throw error;

        await createMut.mutateAsync({
          projectId,
          name: file.name,
          storagePath: path,
          fileSize: file.size,
          mimeType: file.type || undefined,
        });

        setProgress((p) => ({ ...p, [file.name]: "done" }));
      } catch {
        setProgress((p) => ({ ...p, [file.name]: "error" }));
      }
    }

    setUploading(false);
    const allDone = files.every((f) => progress[f.name] !== "error");
    if (allDone) setTimeout(() => { onSuccess(); }, 600);
  }

  return (
    <div className="border border-[#1A1A1A]/30 rounded-xl p-4 bg-[#1A1A1A]/3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wide">Enviar Arquivos ao Projeto</p>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
          dragging ? "border-[#1A1A1A] bg-[#1A1A1A]/8" : "border-gray-300 hover:border-[#1A1A1A]/50 hover:bg-[#1A1A1A]/3"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.5" className="w-8 h-8 mx-auto mb-2 opacity-50">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p className="text-sm text-gray-500">Arraste arquivos ou <span className="text-[#1A1A1A] font-semibold">clique para selecionar</span></p>
        <p className="text-xs text-gray-400 mt-1">PDF, DWG, imagens, planilhas — qualquer formato</p>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </div>

      {/* Lista de arquivos selecionados */}
      {files.length > 0 && (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {files.map((f) => {
            const st = progress[f.name];
            return (
              <div key={f.name} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" className="w-4 h-4 shrink-0">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <span className="text-xs text-gray-700 flex-1 truncate">{f.name}</span>
                <span className="text-xs text-gray-400 shrink-0">{fmtSize(f.size)}</span>
                {st === "done"  && <span className="text-green-500 text-xs font-bold">✓</span>}
                {st === "error" && <span className="text-red-500 text-xs font-bold">✗</span>}
                {st === "pending" && <span className="text-yellow-500 text-xs">...</span>}
                {!st && (
                  <button onClick={(e) => { e.stopPropagation(); setFiles(prev => prev.filter(x => x.name !== f.name)); }}
                    className="text-gray-300 hover:text-red-400 text-sm leading-none">×</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleUpload}
          disabled={!files.length || uploading}
          className="flex-1 py-2 bg-[#1A1A1A] text-white text-xs font-bold rounded-lg disabled:opacity-50 hover:bg-[#2C2C2C] transition"
        >
          {uploading ? "Enviando..." : `Enviar ${files.length > 0 ? `(${files.length})` : ""}`}
        </button>
        <button onClick={onCancel} className="px-4 py-2 border border-gray-200 text-xs text-gray-500 rounded-lg hover:bg-gray-50 transition">
          Cancelar
        </button>
      </div>
    </div>
  );
}
