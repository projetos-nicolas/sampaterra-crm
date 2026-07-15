"use client";

import { useRef, useState } from "react";
import { trpc } from "@/trpc/client";
import { supabase, getPublicUrl, STORAGE_BUCKETS } from "@/lib/supabase";

type MaintenanceData = {
  id: string;
  date: string | Date;
  performedBy: string;
  operador: string | null;
  description: string;
  cost: number | string | null;
  photos: string[];
};

export function MaintenanceModal({
  machineId,
  maintenance,
  onClose,
  onSuccess,
}: {
  machineId: string;
  maintenance?: MaintenanceData;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!maintenance;
  const [form, setForm] = useState({
    date: maintenance ? new Date(maintenance.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    performedBy: maintenance?.performedBy ?? "",
    operador: maintenance?.operador ?? "",
    description: maintenance?.description ?? "",
    cost: maintenance?.cost ? String(maintenance.cost) : "",
  });
  const [photos, setPhotos] = useState<string[]>(maintenance?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const createMut = trpc.frota.createMaintenance.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setErro(e.message),
  });
  const updateMut = trpc.frota.updateMaintenance.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setErro(e.message),
  });
  const deleteMut = trpc.frota.deleteMaintenance.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });

  const isPending = createMut.isPending || updateMut.isPending || deleteMut.isPending;
  const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]";

  async function handlePhotosUpload(files: FileList) {
    setUploading(true);
    setErro("");
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `maintenances/${machineId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKETS.FROTA)
          .upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        uploaded.push(data.path);
      }
      setPhotos((prev) => [...prev, ...uploaded]);
    } catch (e: any) {
      setErro(`Falha ao enviar foto(s): ${e.message}`);
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(path: string) {
    setPhotos((prev) => prev.filter((p) => p !== path));
  }

  function handleSave() {
    if (!form.performedBy.trim()) { setErro("Informe quem realizou a manutenção."); return; }
    if (!form.description.trim()) { setErro("Descreva o que foi feito."); return; }
    const data = {
      date: new Date(form.date + "T12:00:00").toISOString(),
      performedBy: form.performedBy.trim(),
      operador: form.operador.trim() || undefined,
      description: form.description.trim(),
      cost: form.cost ? parseFloat(form.cost.replace(",", ".")) : undefined,
      photos,
    };
    if (isEdit && maintenance) {
      updateMut.mutate({ id: maintenance.id, data });
    } else {
      createMut.mutate({ machineId, ...data });
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-lg">{isEdit ? "Editar Manutenção" : "Nova Manutenção"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Data *</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Custo (R$)</label>
              <input value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} className={inputCls} placeholder="0,00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Realizado por *</label>
              <input value={form.performedBy} onChange={(e) => setForm((f) => ({ ...f, performedBy: e.target.value }))} className={inputCls} placeholder="Oficina / responsável" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Operador</label>
              <input value={form.operador} onChange={(e) => setForm((f) => ({ ...f, operador: e.target.value }))} className={inputCls} placeholder="Nome do operador" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">O que foi feito *</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} rows={3} placeholder="Ex: Troca de óleo hidráulico e filtros" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fotos</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {photos.map((p) => (
                <div key={p} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                  <img src={getPublicUrl(STORAGE_BUCKETS.FROTA, p)} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(p)}
                    className="absolute top-0 right-0 bg-black/60 text-white w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >×</button>
                </div>
              ))}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) handlePhotosUpload(e.target.files); }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-xs font-semibold text-[#1A1A1A] border border-[#1A1A1A]/30 rounded-lg px-3 py-1.5 hover:bg-[#1A1A1A]/5 disabled:opacity-50"
            >
              {uploading ? "Enviando..." : "+ Adicionar foto(s)"}
            </button>
          </div>

          {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{erro}</div>}
        </div>

        <div className="flex gap-2 mt-5">
          {isEdit && maintenance && (
            <button
              onClick={() => { if (confirm("Remover este registro de manutenção?")) deleteMut.mutate({ id: maintenance.id }); }}
              disabled={isPending}
              className="py-2.5 px-3 border border-red-200 text-red-400 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-60"
              title="Excluir"
            >🗑</button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={isPending || uploading} className="flex-1 py-2.5 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#2C2C2C] disabled:opacity-60">
            {isPending ? "Salvando..." : isEdit ? "Salvar" : "Registrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
