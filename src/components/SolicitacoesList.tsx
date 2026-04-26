import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { SolicitacaoRow, ListFilters } from "@/types/electron";
import { STATUS_OPTIONS, TPDOC_OPTIONS, TPDOC_MAP } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Paperclip, Filter, RotateCw, Database, LogOut, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import SolicitacaoDetail from "./SolicitacaoDetail";

interface Lookups {
  instituicoes: { nom_agenteoperacao: string }[];
  instalacoes: { ins_id: string; nomecurto: string; cos_id: string }[];
  crcs: { cos_id: string; nomecurto: string }[];
}

export default function SolicitacoesList({ onLogout }: { onLogout: () => void }) {
  const [rows, setRows] = useState<SolicitacaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookups, setLookups] = useState<Lookups>({ instituicoes: [], instalacoes: [], crcs: [] });
  const [filters, setFilters] = useState<ListFilters>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);

  async function load(f: ListFilters = filters) {
    setLoading(true);
    const r = await api.listSolicitacoes(f);
    setLoading(false);
    if (r.ok && r.rows) setRows(r.rows);
    else toast.error("Erro ao listar", { description: r.error });
  }

  useEffect(() => {
    api.lookups().then((r) => {
      if (r.ok) setLookups({ instituicoes: r.instituicoes || [], instalacoes: r.instalacoes || [], crcs: r.crcs || [] });
    });
    load({});
  }, []);

  const filteredInstalacoes = useMemo(
    () => filters.crc ? lookups.instalacoes.filter((i) => i.cos_id === filters.crc) : lookups.instalacoes,
    [filters.crc, lookups.instalacoes]
  );

  function update<K extends keyof ListFilters>(k: K, v: ListFilters[K]) {
    const next = { ...filters, [k]: v };
    setFilters(next);
  }

  async function handleApply() { await load(filters); }
  async function handleClear() { setFilters({}); await load({}); }

  function handleOpenTpDoc(row: SolicitacaoRow) {
    const meta = TPDOC_MAP[row.id_tpdocumento];
    if (meta?.deprecated) {
      toast.warning(`"${meta.label}" não é mais utilizado`, {
        description: "Esse tipo de documento foi descontinuado.",
        icon: <AlertCircle className="size-4" />,
      });
    }
    setSelectedId(row.id_solicitacao);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 text-primary-foreground" style={{ background: "var(--gradient-header)" }}>
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="size-5" />
            <div>
              <h1 className="font-semibold leading-tight">Solicitações de Diagramas Unifilares</h1>
              <p className="text-xs opacity-80">ONS · Centro de Relacionamento com Agentes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => load()} disabled={loading}>
              <RotateCw className={loading ? "animate-spin" : ""} /> Atualizar
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout} className="text-primary-foreground hover:bg-white/10">
              <LogOut /> Desconectar
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="size-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">Filtros</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Instituição</label>
              <Select value={filters.cosId || "all"} onValueChange={(v) => update("cosId", v === "all" ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {lookups.instituicoes.map((i) => (
                    <SelectItem key={i.nom_agenteoperacao} value={i.nom_agenteoperacao}>{i.nom_agenteoperacao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">COS ONS</label>
              <Select value={filters.crc || "all"} onValueChange={(v) => update("crc", v === "all" ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {lookups.crcs.map((c) => (
                    <SelectItem key={c.cos_id} value={c.cos_id}>{c.nomecurto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Instalação</label>
              <Select value={filters.insId || "all"} onValueChange={(v) => update("insId", v === "all" ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {filteredInstalacoes.map((i) => (
                    <SelectItem key={i.ins_id} value={i.ins_id}>{i.nomecurto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tipo de Diagrama</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    {filters.tpdocumento?.length ? `${filters.tpdocumento.length} selec.` : "Todos"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2">
                  {TPDOC_OPTIONS.map((opt) => {
                    const checked = filters.tpdocumento?.includes(opt.id) || false;
                    return (
                      <label key={opt.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const set = new Set(filters.tpdocumento || []);
                            if (v) set.add(opt.id); else set.delete(opt.id);
                            update("tpdocumento", set.size ? Array.from(set) : undefined);
                          }}
                        />
                        <span className={opt.deprecated ? "text-muted-foreground italic" : ""}>{opt.label}</span>
                      </label>
                    );
                  })}
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    {filters.status?.length ? `${filters.status.length} selec.` : "Todos (exceto excluído)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2">
                  {STATUS_OPTIONS.map((opt) => {
                    const checked = filters.status?.includes(opt.id) || false;
                    return (
                      <label key={opt.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const set = new Set(filters.status || []);
                            if (v) set.add(opt.id); else set.delete(opt.id);
                            update("status", set.size ? Array.from(set) : undefined);
                          }}
                        />
                        <StatusBadge id={opt.id} />
                      </label>
                    );
                  })}
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">De</label>
                <Input type="date" value={filters.dataIni?.slice(0, 10) || ""} onChange={(e) => update("dataIni", e.target.value || undefined)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Até</label>
                <Input type="date" value={filters.dataFim?.slice(0, 10) || ""} onChange={(e) => update("dataFim", e.target.value || undefined)} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={handleClear}>Limpar</Button>
            <Button onClick={handleApply} disabled={loading}>Aplicar filtros</Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Criação</th>
                  <th className="text-left font-medium px-3 py-2">Modificação</th>
                  <th className="text-left font-medium px-3 py-2">Revisão</th>
                  <th className="text-left font-medium px-3 py-2">Tipo</th>
                  <th className="text-left font-medium px-3 py-2">Nº Rev.</th>
                  <th className="text-left font-medium px-3 py-2">Instituição</th>
                  <th className="text-left font-medium px-3 py-2">Instalação</th>
                  <th className="text-left font-medium px-3 py-2">COS ONS</th>
                  <th className="text-left font-medium px-3 py-2">Status</th>
                  <th className="text-left font-medium px-3 py-2">Arquivos</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading && (
                  <tr><td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">Nenhuma solicitação encontrada.</td></tr>
                )}
                {rows.map((r) => (
                  <tr
                    key={r.id_solicitacao}
                    className="border-t hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => handleOpenTpDoc(r)}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.din_criacao)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.din_modificacao)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.din_revisao)}</td>
                    <td className="px-3 py-2">{r.dsc_tpdocumento || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.num_revisao || "—"}</td>
                    <td className="px-3 py-2">{r.nom_agenteoperacao || "—"}</td>
                    <td className="px-3 py-2">{r.instalacao_nome || "—"}</td>
                    <td className="px-3 py-2">{r.cos_nome || r.cos_id?.trim() || "—"}</td>
                    <td className="px-3 py-2"><StatusBadge id={r.id_tpstatussolicitacao} /></td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Paperclip className="size-3.5" /> {r.qtd_anexos}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 text-xs text-muted-foreground border-t flex justify-between">
            <span>{rows.length} solicitações</span>
            {loading && <span>Carregando…</span>}
          </div>
        </Card>
      </div>

      {selectedId !== null && (
        <SolicitacaoDetail id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
