"use client";

import { useRef, useState } from "react";
import { trpc } from "@/trpc/client";
import { supabase, getPublicUrl, STORAGE_BUCKETS } from "@/lib/supabase";
import { MachineModal, STATUS_LABEL } from "./MachineModal";
import { MaintenanceModal } from "./MaintenanceModal";

const STATUS_COLOR: Record<string, string> = {
  disponivel: "bg-green-100 text-green-700",
  em_locacao: "bg-blue-100 text-blue-700",
  em_manutencao: "bg-amber-100 text-amber-700",
  inativa: "bg-gray-100 text-gray-500",
};

// ─── Modal de Manutenção Preventiva ───────────────────────────────────────────

function PreventiveModal({
  machineId,
  item,
  onClose,
  onSuccess,
}: {
  machineId: string;
  item?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    title: item?.title ?? "",
    description: item?.description ?? "",
    requestedBy: item?.requestedBy ?? "",
    dueDate: item?.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : "",
    intervalDays: item?.intervalDays ? String(item.intervalDays) : "",
  });
  const [photoPath, setPhotoPath] = useState<string | null>(item?.photoPath ?? null);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]";

  const createMut = trpc.frota.createPreventiveMaintenance.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setErro(e.message),
  });
  const updateMut = trpc.frota.updatePreventiveMaintenance.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setErro(e.message),
  });
  const deleteMut = trpc.frota.deletePreventiveMaintenance.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });

  const isPending = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErro("");
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `preventivas/${machineId}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.FROTA)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      setPhotoPath(data.path);
    } catch (e: any) {
      setErro(`Falha ao enviar foto: ${e.message}`);
    } finally {
      setUploading(false);
    }
  }

  function handleSave() {
    if (!form.title.trim()) { setErro("Informe o título da manutenção."); return; }
    const data = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      requestedBy: form.requestedBy.trim() || undefined,
      photoPath: photoPath ?? null,
      dueDate: form.dueDate ? new Date(form.dueDate + "T12:00:00").toISOString() : null,
      intervalDays: form.intervalDays ? parseInt(form.intervalDays) : null,
    };
    if (isEdit) {
      updateMut.mutate({ id: item.id, data });
    } else {
      createMut.mutate({ machineId, ...data });
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-lg">{isEdit ? "Editar Preventiva" : "Nova Preventiva"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Título *</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Ex: Troca de óleo hidráulico" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Descrição</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} rows={2} placeholder="Detalhes do que deve ser feito..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Solicitado por</label>
            <input value={form.requestedBy} onChange={(e) => setForm((f) => ({ ...f, requestedBy: e.target.value }))} className={inputCls} placeholder="Nome de quem está solicitando" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Data Prevista</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Periodicidade (dias)</label>
              <input value={form.intervalDays} onChange={(e) => setForm((f) => ({ ...f, intervalDays: e.target.value.replace(/\D/g, "") }))} className={inputCls} placeholder="Ex: 90" />
            </div>
          </div>

          {/* Foto de referência */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Foto de Referência</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            {photoPath ? (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group">
                <img src={getPublicUrl(STORAGE_BUCKETS.FROTA, photoPath)} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoPath(null)}
                  className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs font-bold"
                >Remover</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs font-semibold text-[#1A1A1A] border border-[#1A1A1A]/30 rounded-lg px-3 py-1.5 hover:bg-[#1A1A1A]/5 disabled:opacity-50"
              >
                {uploading ? "Enviando..." : "+ Adicionar foto"}
              </button>
            )}
          </div>

          {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{erro}</div>}
        </div>

        <div className="flex gap-2 mt-5">
          {isEdit && (
            <button
              onClick={() => { if (confirm("Remover este alerta de manutenção preventiva?")) deleteMut.mutate({ id: item.id }); }}
              disabled={isPending}
              className="py-2.5 px-3 border border-red-200 text-red-400 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-60"
              title="Excluir"
            >🗑</button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={isPending || uploading} className="flex-1 py-2.5 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#2C2C2C] disabled:opacity-60">
            {isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MachineDetail ─────────────────────────────────────────────────────────────

export function MachineDetail({ machineId, onClose }: { machineId: string; onClose: () => void }) {
  const { data: machine, refetch } = trpc.frota.getMachine.useQuery({ id: machineId });
  const { data: preventivas, refetch: refetchPreventivas } = trpc.frota.listPreventiveMaintenances.useQuery({ machineId });
  const toggleDone = trpc.frota.updatePreventiveMaintenance.useMutation({ onSuccess: () => refetchPreventivas() });

  const [editMachine, setEditMachine] = useState(false);
  const [maintModal, setMaintModal] = useState<{ open: boolean; maintenance?: any }>({ open: false });
  const [prevModal, setPrevModal] = useState<{ open: boolean; item?: any }>({ open: false });
  const [tab, setTab] = useState<"historico" | "preventivas">("historico");

  if (!machine) return null;

  const pendentes = preventivas?.filter((p: any) => !p.done) ?? [];
  const concluidas = preventivas?.filter((p: any) => p.done) ?? [];

  function isVencida(p: any) {
    if (!p.dueDate || p.done) return false;
    return new Date(p.dueDate) < new Date();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start gap-4">
          <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
            {machine.photoPath ? (
              <img src={getPublicUrl(STORAGE_BUCKETS.FROTA, machine.photoPath)} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="w-8 h-8">
                <rect x="1" y="7" width="13" height="9" rx="1" /><path d="M14 10h4l3 3v3h-7z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-gray-900 text-lg">{machine.name}</h2>
              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_COLOR[machine.status]}`}>
                {STATUS_LABEL[machine.status] ?? machine.status}
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-1">
              {[machine.category, machine.brand, machine.model, machine.year].filter(Boolean).join(" · ") || "Sem detalhes cadastrados"}
              {machine.plateOrCode ? ` · ${machine.plateOrCode}` : ""}
            </p>
            {machine.notes && <p className="text-gray-500 text-xs mt-1.5">{machine.notes}</p>}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button onClick={() => setEditMachine(true)} className="text-xs font-semibold text-[#1A1A1A] border border-[#1A1A1A]/30 rounded-lg px-3 py-1.5 hover:bg-[#1A1A1A]/5">Editar</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none self-end">×</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 pt-4 gap-1">
          {([
            { id: "historico", label: "Histórico de Manutenções" },
            { id: "preventivas", label: `Preventivas${pendentes.length > 0 ? ` (${pendentes.length})` : ""}` },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition -mb-px ${
                tab === t.id
                  ? "border-[#1A1A1A] text-[#1A1A1A]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Histórico de Manutenções */}
        {tab === "historico" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Histórico</h3>
              <button
                onClick={() => setMaintModal({ open: true })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5A623] text-white text-xs font-semibold rounded-lg hover:bg-[#F7BB52] transition"
              >
                + Nova Manutenção
              </button>
            </div>

            {machine.maintenances.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm bg-gray-50 rounded-lg">
                Nenhuma manutenção registrada ainda.
              </div>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {machine.maintenances.map((m: any) => (
                  <div key={m.id} className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition cursor-pointer" onClick={() => setMaintModal({ open: true, maintenance: m })}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{m.performedBy}</p>
                      <p className="text-xs text-gray-400">{new Date(m.date).toLocaleDateString("pt-BR")}</p>
                    </div>
                    {m.operador && <p className="text-xs text-gray-500 mt-0.5">Operador: {m.operador}</p>}
                    <p className="text-sm text-gray-600 mt-0.5">{m.description}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      {m.cost ? <p className="text-xs font-semibold text-gray-500">R$ {Number(m.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p> : <span />}
                      {m.photos?.length > 0 && (
                        <div className="flex gap-1">
                          {m.photos.slice(0, 4).map((p: string) => (
                            <img key={p} src={getPublicUrl(STORAGE_BUCKETS.FROTA, p)} alt="" className="w-8 h-8 rounded object-cover border border-gray-200" />
                          ))}
                          {m.photos.length > 4 && <span className="text-xs text-gray-400 self-center">+{m.photos.length - 4}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Manutenções Preventivas */}
        {tab === "preventivas" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Preventivas a Fazer</h3>
              <button
                onClick={() => setPrevModal({ open: true })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-semibold rounded-lg hover:bg-[#2C2C2C] transition"
              >
                + Adicionar Alerta
              </button>
            </div>

            {pendentes.length === 0 && concluidas.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm bg-gray-50 rounded-lg">
                Nenhuma manutenção preventiva cadastrada ainda.
              </div>
            ) : (
              <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                {/* Pendentes */}
                {pendentes.map((p: any) => {
                  const vencida = isVencida(p);
                  return (
                    <div
                      key={p.id}
                      className={`border rounded-lg p-3 transition cursor-pointer ${
                        vencida
                          ? "border-red-200 bg-red-50 hover:border-red-300"
                          : "border-amber-200 bg-amber-50 hover:border-amber-300"
                      }`}
                      onClick={() => setPrevModal({ open: true, item: p })}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleDone.mutate({ id: p.id, data: { done: true } }); }}
                          className="mt-0.5 w-4 h-4 rounded border-2 border-gray-400 hover:border-green-500 flex-shrink-0 transition"
                          title="Marcar como feita"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900">{p.title}</p>
                            {vencida && (
                              <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full uppercase">Vencida</span>
                            )}
                          </div>
                          {p.description && <p className="text-xs text-gray-600 mt-0.5">{p.description}</p>}
                          <div className="flex items-center gap-3 mt-1">
                            {p.dueDate && (
                              <p className={`text-xs font-semibold ${vencida ? "text-red-600" : "text-amber-700"}`}>
                                Prevista: {new Date(p.dueDate).toLocaleDateString("pt-BR")}
                              </p>
                            )}
                            {p.intervalDays && (
                              <p className="text-xs text-gray-400">a cada {p.intervalDays} dias</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Concluídas */}
                {concluidas.length > 0 && (
                  <>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider pt-2 pb-1">Concluídas</p>
                    {concluidas.map((p: any) => (
                      <div
                        key={p.id}
                        className="border border-gray-200 rounded-lg p-3 opacity-60 cursor-pointer hover:border-gray-300 transition"
                        onClick={() => setPrevModal({ open: true, item: p })}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleDone.mutate({ id: p.id, data: { done: false } }); }}
                            className="mt-0.5 w-4 h-4 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center flex-shrink-0"
                            title="Desfazer"
                          >
                            <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          <div>
                            <p className="text-sm font-semibold text-gray-700 line-through">{p.title}</p>
                            {p.doneAt && <p className="text-xs text-gray-400">Feita em: {new Date(p.doneAt).toLocaleDateString("pt-BR")}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {editMachine && (
        <MachineModal
          machine={machine}
          onClose={() => setEditMachine(false)}
          onSuccess={() => { refetch(); }}
        />
      )}
      {maintModal.open && (
        <MaintenanceModal
          machineId={machine.id}
          maintenance={maintModal.maintenance}
          onClose={() => setMaintModal({ open: false })}
          onSuccess={() => refetch()}
        />
      )}
      {prevModal.open && (
        <PreventiveModal
          machineId={machine.id}
          item={prevModal.item}
          onClose={() => setPrevModal({ open: false })}
          onSuccess={() => refetchPreventivas()}
        />
      )}
    </div>
  );
}
