"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/trpc/client";
import { formatDate, maskCPF, maskCNPJ, maskPhone, formatCpfCnpj } from "@/lib/utils";

const ESTADOS_BR = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

type ClientFormData = { type: "PF"|"PJ"; name:string; company:string; cpf_cnpj:string; email:string; phone:string; cep:string; address:string; addressNumber:string; complement:string; city:string; state:string; notes:string; };

function formatBRL(v: number|string|null|undefined) {
  const n = typeof v==="string"?parseFloat(v):(v??0);
  return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);
}

const LEAD_STATUS_LABELS: Record<string,string> = { contato_inicial:"Contato Inicial", visita_tecnica:"Visita Técnica", elaboracao_proposta:"Elab. Proposta", negociacao:"Negociação", fechado_ganho:"Fechado", proposta_declinada:"Declinado" };
const LEAD_STATUS_COLORS: Record<string,string> = { contato_inicial:"bg-gray-100 text-gray-600", visita_tecnica:"bg-blue-100 text-blue-700", elaboracao_proposta:"bg-yellow-100 text-yellow-700", negociacao:"bg-orange-100 text-orange-700", fechado_ganho:"bg-green-100 text-green-700", proposta_declinada:"bg-red-100 text-red-600" };

function ClientForm({ initial, onSubmit, onCancel, isPending, submitLabel }: { initial:ClientFormData; onSubmit:(d:ClientFormData)=>void; onCancel:()=>void; isPending:boolean; submitLabel:string; }) {
  const [form, setForm] = useState<ClientFormData>(initial);
  const f = (k: keyof ClientFormData, v: string) => setForm(p=>({...p,[k]:v}));
  return (
    <form onSubmit={e=>{e.preventDefault();onSubmit(form);}} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tipo de Pessoa</label>
        <div className="flex gap-2">
          {(["PF","PJ"] as const).map(t=>(
            <button key={t} type="button" onClick={()=>f("type",t)} className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${form.type===t?"bg-[#1A1A1A] text-white border-[#1A1A1A]":"bg-white text-gray-600 border-gray-200 hover:border-[#1A1A1A]"}`}>
              {t==="PF"?"Pessoa Física":"Pessoa Jurídica"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="col-span-1 sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{form.type==="PF"?"Nome Completo *":"Nome do Responsável *"}</label>
          <input required value={form.name} onChange={e=>f("name",e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="Nome completo"/>
        </div>
        {form.type==="PJ"&&(
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Razão Social</label>
            <input value={form.company} onChange={e=>f("company",e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="Empresa Ltda"/>
          </div>
        )}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{form.type==="PF"?"CPF":"CNPJ"}</label>
          <input value={form.cpf_cnpj} onChange={e=>f("cpf_cnpj", form.type==="PF" ? maskCPF(e.target.value) : maskCNPJ(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder={form.type==="PF"?"000.000.000-00":"00.000.000/0000-00"}/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">E-mail</label>
          <input type="email" value={form.email} onChange={e=>f("email",e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="email@empresa.com"/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Telefone</label>
          <input value={form.phone} onChange={e=>f("phone", maskPhone(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="(11) 99999-0000"/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">CEP</label>
          <input value={form.cep} onChange={e=>f("cep",e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="00000-000"/>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Rua / Logradouro</label>
          <input value={form.address} onChange={e=>f("address",e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="Rua, Avenida, Estrada..."/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Número</label>
          <input value={form.addressNumber} onChange={e=>f("addressNumber",e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="123"/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Complemento</label>
          <input value={form.complement} onChange={e=>f("complement",e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="Apto, Sala, Bloco..."/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Cidade</label>
          <input value={form.city} onChange={e=>f("city",e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="São Paulo"/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Estado</label>
          <select value={form.state} onChange={e=>f("state",e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]">
            {ESTADOS_BR.map(uf=><option key={uf}>{uf}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Observações</label>
          <textarea value={form.notes} onChange={e=>f("notes",e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] resize-none" placeholder="Informações adicionais..."/>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition">Cancelar</button>
        <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-[#F5A623] hover:bg-[#F7BB52] text-white text-sm font-semibold rounded-lg transition disabled:opacity-60">{isPending?"Salvando...":submitLabel}</button>
      </div>
    </form>
  );
}

function NovoClienteModal({ onClose, onSuccess }: { onClose:()=>void; onSuccess:()=>void; }) {
  const [error, setError] = useState("");
  const createClient = trpc.clients.create.useMutation({ onSuccess:()=>{onSuccess();onClose();}, onError:e=>setError(e.message) });
  const initial: ClientFormData = { type:"PF", name:"", company:"", cpf_cnpj:"", email:"", phone:"", cep:"", address:"", addressNumber:"", complement:"", city:"", state:"SP", notes:"" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">Novo Cliente</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-4">
          {error&&<div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}
          <ClientForm initial={initial} onSubmit={data=>createClient.mutate({...data,email:data.email||undefined,company:data.company||undefined,cpf_cnpj:data.cpf_cnpj||undefined,phone:data.phone||undefined,cep:data.cep||undefined,address:data.address||undefined,addressNumber:data.addressNumber||undefined,complement:data.complement||undefined,city:data.city||undefined,notes:data.notes||undefined})} onCancel={onClose} isPending={createClient.isPending} submitLabel="Cadastrar Cliente"/>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, onUpdated }: { project: any; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(parseFloat(project.contractValue ?? "0")));
  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => { onUpdated(); setEditing(false); },
  });

  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm font-semibold text-gray-800">{project.name}</div>
          {project.code && <div className="text-xs font-mono text-gray-400">{project.code}</div>}
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${project.status==="concluido"?"bg-green-100 text-green-700":project.status==="em_andamento"?"bg-blue-100 text-blue-700":"bg-gray-100 text-gray-500"}`}>
          {project.status?.replace(/_/g," ")}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-gray-500">Contrato:</span>
        {editing ? (
          <div className="flex items-center gap-1 flex-1">
            <span className="text-xs text-gray-400">R$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="flex-1 text-xs border border-[#1A1A1A]/40 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-mono"
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter") updateProject.mutate({ id: project.id, contractValue: parseFloat(value) || 0 });
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <button
              onClick={() => updateProject.mutate({ id: project.id, contractValue: parseFloat(value) || 0 })}
              disabled={updateProject.isPending}
              className="text-[10px] font-semibold text-white bg-[#1A1A1A] px-2 py-0.5 rounded hover:bg-[#0a3a37] transition disabled:opacity-50"
            >
              {updateProject.isPending ? "..." : "OK"}
            </button>
            <button onClick={() => setEditing(false)} className="text-[10px] text-gray-400 hover:text-gray-600 px-1">✕</button>
          </div>
        ) : (
          <button
            onClick={() => { setValue(String(parseFloat(project.contractValue ?? "0"))); setEditing(true); }}
            className="group flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-[#1A1A1A] transition"
          >
            {formatBRL(project.contractValue)}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 opacity-0 group-hover:opacity-60 transition">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function EmpresaVinculadaSection({ client, onUpdated }: { client: any; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(client.linkedCompanyName ?? "");
  const [cnpj, setCnpj] = useState(client.linkedCompanyCnpj ?? "");
  const [error, setError] = useState("");
  const linkCompany = trpc.clients.linkCompany.useMutation({
    onSuccess: () => { onUpdated(); setEditing(false); setError(""); },
    onError: (e) => setError(e.message),
  });

  const hasCompany = !!client.linkedCompanyName;

  if (!editing) {
    return (
      <div className="mt-5 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Empresa Vinculada</span>
          <button
            onClick={() => { setName(client.linkedCompanyName ?? ""); setCnpj(client.linkedCompanyCnpj ?? ""); setEditing(true); }}
            className="text-xs font-semibold text-[#1A1A1A] hover:bg-[#1A1A1A]/5 px-2 py-1 rounded-lg transition"
          >
            {hasCompany ? "Editar" : "+ Adicionar"}
          </button>
        </div>
        {hasCompany ? (
          <div className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
            <p className="text-sm font-semibold text-gray-800">{client.linkedCompanyName}</p>
            {client.linkedCompanyCnpj && <p className="text-xs text-gray-400 font-mono mt-0.5">CNPJ: {client.linkedCompanyCnpj}</p>}
          </div>
        ) : (
          <p className="text-xs text-gray-400">Nenhuma empresa vinculada. Use esta opção se este cliente (pessoa física) posteriormente abrir uma empresa — os dados ficam vinculados ao mesmo cadastro, sem perder o histórico de leads e projetos.</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-5 pt-4 border-t border-gray-100">
      <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Empresa Vinculada</span>
      <div className="space-y-2 mt-2">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Razão Social</label>
          <input value={name} onChange={e=>setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="Empresa Ltda"/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">CNPJ</label>
          <input value={cnpj} onChange={e=>setCnpj(maskCNPJ(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" placeholder="00.000.000/0000-00"/>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={()=>setEditing(false)} className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition">Cancelar</button>
          {hasCompany && (
            <button
              onClick={() => { if (confirm("Remover o vínculo com a empresa?")) linkCompany.mutate({ id: client.id, linkedCompanyName: null, linkedCompanyCnpj: null }); }}
              disabled={linkCompany.isPending}
              className="flex-1 py-2 border border-red-200 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 transition disabled:opacity-50"
            >
              Remover
            </button>
          )}
          <button
            onClick={() => {
              if (!name.trim()) { setError("Informe a razão social."); return; }
              linkCompany.mutate({ id: client.id, linkedCompanyName: name.trim(), linkedCompanyCnpj: cnpj.trim() || null });
            }}
            disabled={linkCompany.isPending}
            className="flex-1 py-2 bg-[#F5A623] hover:bg-[#F7BB52] text-white text-xs font-semibold rounded-lg transition disabled:opacity-60"
          >
            {linkCompany.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientPanel({ clientId, onClose, onUpdated, onDeleted, isAdmin }: { clientId:string; onClose:()=>void; onUpdated:()=>void; onDeleted:()=>void; isAdmin:boolean; }) {
  const [activeTab, setActiveTab] = useState<"dados"|"financeiro"|"historico"|"acesso">("dados");
  const [editing, setEditing] = useState(false);
  const { data: client, refetch } = trpc.clients.byId.useQuery({ id: clientId });
  const updateClient = trpc.clients.update.useMutation({ onSuccess:()=>{ refetch(); onUpdated(); setEditing(false); } });
  const deleteClient = trpc.clients.delete.useMutation({
    onSuccess: onDeleted,
    onError: (e) => alert(e.message),
  });

  if (!client) return (
    <div className="fixed inset-0 z-30 sm:static sm:z-auto w-full sm:w-96 flex-shrink-0 border-l border-gray-200 bg-white flex items-center justify-center">
      <div className="text-gray-400 text-sm">Carregando...</div>
    </div>
  );

  const allPayments = client.projects.flatMap((p: any) => p.paymentSchedule ?? []);
  const totalContratado = client.projects.reduce((s:number,p:any)=>s+parseFloat(p.contractValue??0),0);
  const totalRecebido = allPayments.filter((p:any)=>p.status==="pago"||p.status==="parcial").reduce((s:number,p:any)=>s+parseFloat(p.receivedValue??0),0);
  const totalAReceber = totalContratado - totalRecebido;

  const formInitial: ClientFormData = { type:client.type as "PF"|"PJ", name:client.name, company:client.company??"", cpf_cnpj:formatCpfCnpj(client.cpf_cnpj), email:client.email??"", phone:client.phone ? maskPhone(client.phone) : "", cep:client.cep??"", address:client.address??"", addressNumber:client.addressNumber??"", complement:client.complement??"", city:client.city??"", state:client.state??"SP", notes:client.notes??"" };

  return (
    <div className="fixed inset-0 z-30 sm:static sm:z-auto w-full sm:w-[420px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col h-full overflow-hidden">
      <div className="bg-[#1A1A1A] text-white px-5 py-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base truncate">{client.company||client.name}</div>
            {client.company&&<div className="text-white/70 text-xs mt-0.5">{client.name}</div>}
            {client.cpf_cnpj&&<div className="text-white/60 text-xs font-mono mt-0.5">{client.type==="PJ"?"CNPJ":"CPF"}: {formatCpfCnpj(client.cpf_cnpj)}</div>}
            {client.city&&<div className="text-white/60 text-xs mt-0.5">{client.city}/{client.state}</div>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isAdmin && (
              <button
                onClick={() => {
                  if (confirm(`Excluir o cliente "${client.company || client.name}"? Isso só é possível se não houver leads, propostas ou projetos vinculados. Esta ação não pode ser desfeita.`)) {
                    deleteClient.mutate({ id: clientId });
                  }
                }}
                disabled={deleteClient.isPending}
                className="text-white/60 hover:text-red-300 transition disabled:opacity-50"
                title="Excluir cliente"
              >
                🗑
              </button>
            )}
            <button onClick={onClose} className="ml-2 text-white/60 hover:text-white transition flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[{label:"Contratado",value:totalContratado,color:"text-white"},{label:"Recebido",value:totalRecebido,color:"text-green-300"},{label:"A Receber",value:totalAReceber,color:"text-yellow-300"}].map(c=>(
            <div key={c.label} className="bg-white/10 rounded-lg px-3 py-2 text-center">
              <div className="text-white/60 text-[10px] uppercase tracking-wide">{c.label}</div>
              <div className={`text-sm font-bold mt-0.5 ${c.color}`}>{formatBRL(c.value)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex border-b border-gray-200 bg-white">
        {(["dados","financeiro","historico","acesso"] as const).map(tab=>(
          <button key={tab} onClick={()=>{setActiveTab(tab);setEditing(false);}} className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wide transition border-b-2 ${activeTab===tab?"border-[#1A1A1A] text-[#1A1A1A]":"border-transparent text-gray-400 hover:text-gray-600"}`}>
            {tab==="dados"?"Dados":tab==="financeiro"?"Financeiro":tab==="historico"?"Histórico":"Acesso"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab==="dados"&&(
          <div className="p-4">
            {editing?(
              <ClientForm initial={formInitial} onSubmit={data=>updateClient.mutate({id:clientId,...data,email:data.email||undefined,company:data.company||undefined,cpf_cnpj:data.cpf_cnpj||undefined,phone:data.phone||undefined,cep:data.cep||undefined,address:data.address||undefined,addressNumber:data.addressNumber||undefined,complement:data.complement||undefined,city:data.city||undefined,notes:data.notes||undefined})} onCancel={()=>setEditing(false)} isPending={updateClient.isPending} submitLabel="Salvar Alterações"/>
            ):(
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Dados do Cliente</span>
                  <button onClick={()=>setEditing(true)} className="flex items-center gap-1.5 text-xs font-semibold text-[#1A1A1A] hover:bg-[#1A1A1A]/5 px-2 py-1 rounded-lg transition">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Editar
                  </button>
                </div>
                <dl className="space-y-2.5">
                  {[{label:"Nome",value:client.name},...(client.company?[{label:"Razão Social",value:client.company}]:[]),...(client.cpf_cnpj?[{label:client.type==="PJ"?"CNPJ":"CPF",value:formatCpfCnpj(client.cpf_cnpj),mono:true}]:[]),...(client.email?[{label:"E-mail",value:client.email}]:[]),...(client.phone?[{label:"Telefone",value:maskPhone(client.phone)}]:[]),...(client.cep?[{label:"CEP",value:client.cep,mono:true}]:[]),...(client.address?[{label:"Endereço",value:[client.address,client.addressNumber,client.complement].filter(Boolean).join(", ")}]:[]),...(client.city?[{label:"Localização",value:`${client.city} / ${client.state}`}]:[]),...(client.notes?[{label:"Obs.",value:client.notes}]:[])].map((row:any)=>(
                    <div key={row.label} className="flex gap-2">
                      <dt className="w-24 text-xs text-gray-400 flex-shrink-0 pt-0.5">{row.label}</dt>
                      <dd className={`text-sm text-gray-800 font-medium ${row.mono?"font-mono":""}`}>{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <EmpresaVinculadaSection client={client} onUpdated={refetch} />

                <div className="mt-5 pt-4 border-t border-gray-100">
                  <div className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-3">Projetos ({client.projects.length})</div>
                  {client.projects.length===0?(
                    <p className="text-xs text-gray-400">Nenhum projeto contratado.</p>
                  ):(
                    <div className="space-y-2">
                      {client.projects.map((p:any)=>(
                        <ProjectCard key={p.id} project={p} onUpdated={refetch}/>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab==="financeiro"&&(
          <div className="p-4">
            <div className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-3">Parcelas por Projeto</div>
            {client.projects.length===0?(
              <p className="text-xs text-gray-400">Nenhum projeto com parcelas.</p>
            ):(
              <div className="space-y-4">
                {client.projects.map((proj:any)=>{
                  const parcelas = (proj.paymentSchedule??[]).slice().sort((a:any,b:any)=>a.sortOrder-b.sortOrder);
                  if(parcelas.length===0) return null;
                  const rec = parcelas.filter((p:any)=>p.status==="pago"||p.status==="parcial").reduce((s:number,p:any)=>s+parseFloat(p.receivedValue??0),0);
                  const tot = parcelas.reduce((s:number,p:any)=>s+parseFloat(p.expectedValue??0),0);
                  const STATUS_BADGE: Record<string,string> = { pago:"bg-green-100 text-green-700", parcial:"bg-blue-100 text-blue-700", atrasado:"bg-red-100 text-red-600", pendente:"bg-gray-100 text-gray-500" };
                  const STATUS_LABEL: Record<string,string> = { pago:"Pago", parcial:"Parcial", atrasado:"Atrasado", pendente:"Pendente" };
                  return (
                    <div key={proj.id}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="text-sm font-semibold text-gray-700">{proj.name}</div>
                        <div className="text-xs text-gray-400">{formatBRL(rec)} / {formatBRL(tot)}</div>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full mb-2">
                        <div className="h-1.5 bg-[#1A1A1A] rounded-full" style={{width:tot>0?`${Math.min(100,(rec/tot)*100)}%`:"0%"}}/>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs min-w-[420px]">
                          <thead><tr className="text-gray-400 border-b border-gray-100"><th className="text-left pb-1">Parcela</th><th className="text-left pb-1">Vencimento</th><th className="text-right pb-1">Previsto</th><th className="text-right pb-1">Recebido</th><th className="text-right pb-1">Status</th></tr></thead>
                          <tbody>
                            {parcelas.map((p:any)=>(
                              <tr key={p.id} className="border-b border-gray-50">
                                <td className="py-1 text-gray-700">{p.description}</td>
                                <td className="py-1 text-gray-500">{p.dueDate?formatDate(p.dueDate):"—"}</td>
                                <td className="py-1 text-right font-semibold text-gray-700">{formatBRL(p.expectedValue)}</td>
                                <td className="py-1 text-right text-gray-500">{formatBRL(p.receivedValue)}</td>
                                <td className="py-1 text-right"><span className={`px-1.5 py-0.5 rounded-full font-semibold ${STATUS_BADGE[p.status]??STATUS_BADGE.pendente}`}>{STATUS_LABEL[p.status]??p.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab==="historico"&&(
          <div className="p-4">
            <div className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-3">Oportunidades ({client.leads.length})</div>
            {client.leads.length===0?(
              <p className="text-xs text-gray-400">Nenhuma oportunidade registrada.</p>
            ):(
              <div className="space-y-2">
                {client.leads.map((lead:any)=>(
                  <div key={lead.id} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-semibold text-sm text-gray-800 flex-1 min-w-0 truncate">{lead.title}</div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${LEAD_STATUS_COLORS[lead.status]??"bg-gray-100 text-gray-500"}`}>{LEAD_STATUS_LABELS[lead.status]??lead.status}</span>
                    </div>
                    {lead.estimatedValue&&<div className="text-xs text-gray-500 mt-1">Valor estimado: <span className="font-semibold text-gray-700">{formatBRL(lead.estimatedValue)}</span></div>}
                    <div className="text-xs text-gray-400 mt-1">{formatDate(lead.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab==="acesso"&&(
          <AbaAcesso clienteId={clientId} />
        )}
      </div>
    </div>
  );
}

// ─── Aba Acesso ao Portal ─────────────────────────────────────────────────────

function AbaAcesso({ clienteId }: { clienteId: string }) {
  const { data: portalUser, refetch } = trpc.users.getPortalUser.useQuery({ clienteId });
  const createMut = trpc.users.createPortalUser.useMutation({ onSuccess: () => { refetch(); setShowForm(false); } });
  const toggleMut = trpc.users.togglePortalAccess.useMutation({ onSuccess: () => refetch() });
  const resetMut  = trpc.users.resetPassword.useMutation({ onSuccess: () => { setResetPass(""); setShowReset(false); } });

  const [showForm,  setShowForm]  = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [resetPass, setResetPass] = useState("");
  const [err, setErr] = useState("");

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30";

  return (
    <div className="p-4">
      <div className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-4">
        Acesso ao Portal do Cliente
      </div>

      {portalUser ? (
        /* ── Conta existente ── */
        <div className="space-y-4">
          <div className={`rounded-xl border p-4 ${portalUser.active ? "border-green-200 bg-green-50/40" : "border-gray-200 bg-gray-50"}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${portalUser.active ? "bg-green-500" : "bg-gray-400"}`} />
                <span className="text-xs font-bold text-gray-700">
                  {portalUser.active ? "Acesso Ativo" : "Acesso Suspenso"}
                </span>
              </div>
              <button
                onClick={() => toggleMut.mutate({ userId: portalUser.id, active: !portalUser.active })}
                disabled={toggleMut.isPending}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${portalUser.active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
              >
                {portalUser.active ? "Suspender" : "Reativar"}
              </button>
            </div>
            <dl className="space-y-1.5 text-xs">
              <div className="flex gap-2">
                <dt className="text-gray-400 w-16">Nome</dt>
                <dd className="font-semibold text-gray-700">{portalUser.name}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-400 w-16">E-mail</dt>
                <dd className="font-semibold text-gray-700">{portalUser.email}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-400 w-16">Criado em</dt>
                <dd className="text-gray-500">{new Date(portalUser.createdAt).toLocaleDateString("pt-BR")}</dd>
              </div>
            </dl>
          </div>

          {/* Reset de senha */}
          {showReset ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase">Nova Senha</label>
              <input
                type="password"
                value={resetPass}
                onChange={(e) => setResetPass(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={inputCls}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => resetMut.mutate({ userId: portalUser.id, newPassword: resetPass })}
                  disabled={resetPass.length < 6 || resetMut.isPending}
                  className="flex-1 py-2 bg-[#1A1A1A] text-white text-xs font-bold rounded-lg disabled:opacity-50 hover:bg-[#2C2C2C] transition"
                >
                  {resetMut.isPending ? "Salvando..." : "Salvar Nova Senha"}
                </button>
                <button onClick={() => setShowReset(false)} className="px-3 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowReset(true)}
              className="w-full py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              🔑 Redefinir Senha
            </button>
          )}
        </div>
      ) : showForm ? (
        /* ── Formulário de criação ── */
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nome *</label>
            <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do responsável" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">E-mail de Acesso *</label>
            <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@cliente.com" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Senha Inicial *</label>
            <input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" className={inputCls} />
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                if (!form.name || !form.email || form.password.length < 6) { setErr("Preencha todos os campos."); return; }
                setErr("");
                createMut.mutate({ clienteId, ...form });
              }}
              disabled={createMut.isPending}
              className="flex-1 py-2.5 bg-[#F5A623] text-white text-xs font-bold rounded-lg disabled:opacity-50 hover:bg-[#F7BB52] transition"
            >
              {createMut.isPending ? "Criando..." : "Criar Acesso"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        /* ── Sem conta ainda ── */
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="w-6 h-6">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <p className="text-xs text-gray-500 font-semibold mb-1">Sem acesso ao portal</p>
          <p className="text-xs text-gray-400 mb-4">Este cliente ainda não tem login no portal.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-bold rounded-lg hover:bg-[#2C2C2C] transition"
          >
            + Criar Acesso
          </button>
        </div>
      )}
    </div>
  );
}

export default function ClientesPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const { data, refetch } = trpc.clients.list.useQuery({ search: search||undefined });
  const clients = data?.items??[];
  const total = data?.total??0;

  return (
    <div className="flex h-full gap-0 relative">
      <div className={`flex-1 min-w-0 flex flex-col ${selectedId ? "hidden sm:flex" : ""}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 uppercase tracking-wide">Clientes</h1>
            <p className="text-gray-400 text-sm mt-0.5">{total} cadastrados</p>
          </div>
          <button onClick={()=>setShowModal(true)} className="px-4 py-2 bg-[#F5A623] hover:bg-[#F7BB52] text-white text-sm font-semibold rounded-lg transition whitespace-nowrap">
            + Novo Cliente
          </button>
        </div>

        <div className="mb-4 relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nome, empresa, e-mail ou CPF/CNPJ..." className="w-full max-w-md pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"/>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-[#1A1A1A] text-white text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-semibold">Nome / Empresa</th>
                <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold">E-mail</th>
                <th className="px-4 py-3 text-left font-semibold">Telefone</th>
                <th className="px-4 py-3 text-left font-semibold">Cidade</th>
                <th className="px-4 py-3 text-center font-semibold">Leads</th>
                <th className="px-4 py-3 text-center font-semibold">Projetos</th>
              </tr>
            </thead>
            <tbody>
              {clients.length===0?(
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">{search?"Nenhum cliente encontrado.":"Nenhum cliente cadastrado ainda."}</td></tr>
              ):(
                clients.map((client,i)=>(
                  <tr key={client.id} onClick={()=>setSelectedId(selectedId===client.id?null:client.id)} className={`border-b border-gray-100 cursor-pointer transition ${selectedId===client.id?"bg-[#1A1A1A]/5 border-l-2 border-l-[#1A1A1A]":i%2===0?"bg-white hover:bg-gray-50":"bg-[#FAFAF9] hover:bg-gray-50"}`}>
                    <td className="px-4 py-3"><p className="font-semibold text-gray-900">{client.company||client.name}</p>{client.company&&<p className="text-xs text-gray-400">{client.name}</p>}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${client.type==="PJ"?"bg-[#1A1A1A]/10 text-[#1A1A1A]":"bg-gray-100 text-gray-600"}`}>{client.type}</span></td>
                    <td className="px-4 py-3 text-gray-600">{client.email??"—"}</td>
                    <td className="px-4 py-3 text-gray-600">{client.phone ? maskPhone(client.phone) : "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{client.city?`${client.city}/${client.state}`:"—"}</td>
                    <td className="px-4 py-3 text-center font-semibold text-[#1A1A1A]">{client._count.leads}</td>
                    <td className="px-4 py-3 text-center font-semibold text-[#1A1A1A]">{client._count.projects}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId&&(
        <ClientPanel
          key={selectedId}
          clientId={selectedId}
          onClose={()=>setSelectedId(null)}
          onUpdated={()=>refetch()}
          onDeleted={()=>{ setSelectedId(null); refetch(); }}
          isAdmin={isAdmin}
        />
      )}

      {showModal&&(
        <NovoClienteModal onClose={()=>setShowModal(false)} onSuccess={()=>refetch()}/>
      )}
    </div>
  );
}
