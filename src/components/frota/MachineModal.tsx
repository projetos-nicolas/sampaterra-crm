"use client";

import { useRef, useState } from "react";
import { trpc } from "@/trpc/client";
import { supabase, getPublicUrl, STORAGE_BUCKETS } from "@/lib/supabase";

const CATEGORIES = [
  "Escavadeira", "Retroescavadeira", "Pá-Carregadeira", "Trator de Esteira",
  "Caminhão Basculante", "Caminhão Munck", "Rolo Compactador",
  "Motoniveladora", "Mini Carregadeira", "Perfuratriz", "Outro",
];

const STATUS_LABEL: Record<string, string> = {
  disponivel: "Disponível",
  em_locacao: "Em Locação",
  em_manutencao: "Em Manutenção",
  inativa: "Inativa",
};

type MachineData = {
  id: string;
  name: string;
  category: string | null;
  plateOrCode: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  photoPath: string | null;
  status: string;
  notes: string | null;
};

export function MachineModal({
  machine,
  onClose,
  onSuccess,
}: {
  machine?: MachineData;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!machine;
  const [form, setForm] = useState({
    name: machine?.name ?? "",
    category: machine?.category ?? "",
    plateOrCode: machine?.plateOrCode ?? "",
    brand: machine?.brand ?? "",
    model: machine?.model ?? "",
    year: machine?.year ? String(machine.year) : "",
    status: machine?.status ?? "disponivel",
    notes: machine?.notes ?? "",
  });
  const [photoPath, setPhotoPath] = useState(machine?.photoPath ?? "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [erro, setErro] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const createMut = trpc.frota.createMachine.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setErro(e.message),
  });
  const updateMut = trpc.frota.updateMachine.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setErro(e.message),
  });
  const deleteMut = trpc.frota.deleteMachine.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });

  const isPending = createMut.isPending || updateMut.isPending || deleteMut.isPending;
  const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]";

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true);
    setErro("");
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `machines/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.FROTA)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      setPhotoPath(data.path);
    } catch (e: any) {
      setErro(`Falha ao enviar foto: ${e.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleSave() {
    if (!form.name.trim()) { setErro("Informe o nome/descrição da máquina."); return; }
    const data = {
      name: form.name.trim(),
      category: form.category || undefined,
      plateOrCode: form.plateOrCode || undefined,
      brand: form.brand || undefined,
      model: form.model || undefined,
      year: form.year ? parseInt(form.year) : undefined,
      photoPath: photoPath || undefined,
      status: form.status as any,
      notes: form.notes || undefined,
    };
    if (isEdit && machine) {
      updateMut.mutate({ id: machine.id, data });
    } else {
      createMut.mutate(data);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-lg">{isEdit ? "Editar Máquina" : "Nova Máquina"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          {/* Foto fixa */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Foto da Máquina</label>
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                {photoPath ? (
                  <img src={getPublicUrl(STORAGE_BUCKETS.FROTA, photoPath)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="w-8 h-8">
                    <rect x="1" y="7" width="13" height="9" rx="1" /><path d="M14 10h4l3 3v3h-7z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="text-xs font-semibold text-[#1A1A1A] border border-[#1A1A1A]/30 rounded-lg px-3 py-1.5 hover:bg-[#1A1A1A]/5 disabled:opacity-50"
                >
                  {uploadingPhoto ? "Enviando..." : photoPath ? "Trocar foto" : "Enviar foto"}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nome / Descrição *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Ex: Escavadeira Hidráulica CAT 320" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Categoria</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
                <option value="">Selecione...</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Placa / Código</label>
              <input value={form.plateOrCode} onChange={(e) => setForm((f) => ({ ...f, plateOrCode: e.target.value }))} className={inputCls} placeholder="Ex: PAT-014" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Marca</label>
              <input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Modelo</label>
              <input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ano</label>
              <input value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="2022" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Observações</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} rows={2} />
          </div>

          {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{erro}</div>}
        </div>

        <div className="flex gap-2 mt-5">
          {isEdit && machine && (
            <button
              onClick={() => { if (confirm(`Remover "${machine.name}"? Esta ação não pode ser desfeita.`)) deleteMut.mutate({ id: machine.id }); }}
              disabled={isPending}
              className="py-2.5 px-3 border border-red-200 text-red-400 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-60"
              title="Excluir"
            >🗑</button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={isPending || uploadingPhoto} className="flex-1 py-2.5 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#2C2C2C] disabled:opacity-60">
            {isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { STATUS_LABEL };
