"use client";

import { useRef, useState } from "react";
import { trpc } from "@/trpc/client";
import { supabase, getPublicUrl, STORAGE_BUCKETS } from "@/lib/supabase";

type MaintenanceData = {
  id: string;
  date: string | Date;
  endDate?: string | Date | null;
  immobilizes?: boolean;
  performedBy: string;
  operador: string | null;
  operatorId?: string | null;
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
    endDate: maintenance?.endDate ? new Date(maintenance.endDate).toISOString().slice(0, 10) : "",
    immobilizes: maintenance?.immobilizes ?? false,
    performedBy: maintenance?.performedBy ?? "",
    operatorId: maintenance?.operatorId ?? "",
    operador: maintenance?.operador ?? "",
    description: maintenance?.description ?? "",
    cost: maintenance?.cost ? String(maintenance.cost) : "",
  });
  // Locações que colidem com esta manutenção, devolvidas pelo servidor
  const [conflitos, setConflitos] = useState<any[]>([]);
  const [photos, setPhotos] = useState<string[]>(maintenance?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: operadores } = trpc.operadores.list.useQuery({ includeInactive: false });

  const createMut = trpc.frota.createMaintenance.useMutation({
    onSuccess: (res: any) => {
      // Se a manutenção imobiliza e pega uma locação, mostra o aviso antes de fechar
      if (res?.conflitos?.length) {
        setConflitos(res.conflitos);
        onSuccess();
        return;
      }
      onSuccess();
      onClose();
    },
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
    if (form.endDate && form.endDate < form.date) {
      setErro("A previsão de término não pode ser anterior à data de início.");
      return;
    }
    const data = {
      date: new Date(form.date + "T12:00:00").toISOString(),
      endDate: form.endDate ? new Date(form.endDate + "T12:00:00").toISOString() : null,
      immobilizes: form.immobilizes,
      performedBy: form.performedBy.trim(),
      operatorId: form.operatorId || null,
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Início *</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Término</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Custo (R$)</label>
              <input value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} className={inputCls} placeholder="0,00" />
            </div>
          </div>

          {/* Só manutenção que imobiliza muda o status da máquina e gera conflito
              com locação. Troca de óleo no canteiro não pára nada. */}
          <label className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.immobilizes}
              onChange={(e) => setForm((f) => ({ ...f, immobilizes: e.target.checked }))}
              className="mt-0.5 rounded border-gray-300"
            />
            <span>
              <span className="block text-sm font-semibold text-gray-800">Imobiliza a máquina</span>
              <span className="block text-[11px] text-gray-500 leading-relaxed">
                Marque quando o equipamento fica parado. A máquina aparece como
                <strong> Em Manutenção</strong> no período e avisa se houver locação em cima.
                {!form.endDate && form.immobilizes ? " Sem data de término, fica parada por tempo indeterminado." : ""}
              </span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Realizado por *</label>
              <input value={form.performedBy} onChange={(e) => setForm((f) => ({ ...f, performedBy: e.target.value }))} className={inputCls} placeholder="Oficina / responsável" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Operador</label>
              <select
                value={form.operatorId}
                onChange={(e) => setForm((f) => ({ ...f, operatorId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Não informado</option>
                {operadores?.map((o: any) => (
                  <option key={o.id} value={o.id}>
                    {o.name}{o.role ? ` — ${o.role}` : ""}
                  </option>
                ))}
              </select>
              {!form.operatorId && form.operador && (
                <p className="text-[10px] text-gray-400 mt-1">Registro antigo: {form.operador}</p>
              )}
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

          {conflitos.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-lg px-3 py-2.5">
              <p className="text-sm font-bold text-amber-800 mb-1">
                ⚠️ Atenção: essa máquina tem locação no mesmo período
              </p>
              <ul className="space-y-1">
                {conflitos.map((c: any) => (
                  <li key={c.id} className="text-xs text-amber-800">
                    <strong>{c.label}</strong>
                    {c.detail ? ` — ${c.detail}` : ""}
                    <span className="block text-[11px] text-amber-600">
                      {new Date(c.startDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })} →{" "}
                      {c.endDate ? new Date(c.endDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "em aberto"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-700 mt-1.5">
                A manutenção foi salva. Ajuste as datas ou a locação para resolver o conflito.
              </p>
            </div>
          )}

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
