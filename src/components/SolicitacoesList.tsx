import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { SolicitacaoRow, ListFilters, AppUser } from "@/types/electron";
import { STATUS_OPTIONS, TPDOC_OPTIONS, TPDOC_MAP } from "@/lib/constants";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Paperclip, Filter, RotateCw, Database, LogOut, AlertCircle, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, BarChart3, User } from "lucide-react";
import { toast } from "sonner";
import SolicitacaoDetail from "./SolicitacaoDetail";
import Statistics from "./Statistics";
import { Autocomplete } from "./Autocomplete";
import { DateInputBR } from "./DateInputBR";
import { DateTimeCell } from "./DateTimeCell";

interface Lookups {
  instituicoes: { nom_agenteoperacao: string }[];
  instalacoes: { ins_id: string; nomecurto: string; cos_id: string }[];
  crcs: { cos_id: string; nomecurto: string }[];
}

export default function SolicitacoesList({ user, onLogout }: { user: AppUser; onLogout: () => void }) {
  const [rows, setRows] = useState<SolicitacaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookups, setLookups] = useState<Lookups>({ instituicoes: [], instalacoes: [], crcs: [] });
  const [filters, setFilters] = useState<ListFilters>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pageInput, setPageInput] = useState("1");
  const [showStats, setShowStats] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);

  async function load(f: ListFilters = filters) {
    setLoading(true);
    const r = await api.listSolicitacoes(f);
    setLoading(false);
    if (r.ok && r.rows) {
      setRows(r.rows);
      setPage(1);
      setPageInput("1");
    } else toast.error("Erro ao listar", { description: r.error });
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
              <h1 className="font-semibold leading-tight">Sistema de Diagramas Unifilares</h1>
              <p className="text-xs opacity-80">ONS · PDR - Gerência de Configurações de Rede</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowStats(true)}>
              <BarChart3 /> Estatísticas
            </Button>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Instituição</label>
              <Autocomplete
                value={filters.cosId}
                placeholder="Digite 3+ caracteres"
                options={lookups.instituicoes.map((i) => ({ value: i.nom_agenteoperacao, label: i.nom_agenteoperacao }))}
                onChange={(v) => update("cosId", v)}
              />
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
              <label className="text-xs font-medium text-muted-foreground">Sigla</label>
              <Autocomplete
                value={filters.sigla}
                placeholder="Digite 3+ caracteres"
                options={filteredInstalacoes.map((i) => ({
                  value: i.ins_id,
                  label: (i.ins_id || "").trim() || "—",
                  hint: i.nomecurto,
                }))}
                onChange={(v) => update("sigla", v)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Instalação</label>
              <Autocomplete
                value={filters.insId}
                placeholder="Digite 3+ caracteres"
                options={filteredInstalacoes.map((i) => ({
                  value: i.ins_id,
                  label: i.nomecurto,
                  hint: (i.ins_id || "").trim(),
                }))}
                onChange={(v) => update("insId", v)}
              />
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
            <div>
              <label className="text-xs font-medium text-muted-foreground">Modificado de</label>
              <DateInputBR value={filters.dataIni} onChange={(v) => update("dataIni", v)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Modificado até</label>
              <DateInputBR value={filters.dataFim} onChange={(v) => update("dataFim", v)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={handleClear}>Limpar</Button>
            <Button onClick={handleApply} disabled={loading}>Filtrar</Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          {/* Pagination header */}
          <div className="px-3 py-2 border-b bg-muted/30 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {rows.length === 0
                ? "Nenhuma solicitação"
                : `Exibindo ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, rows.length)} de ${rows.length}`}
            </span>
            <div className="flex items-center gap-1 ml-auto">
              <Button variant="ghost" size="sm" onClick={() => { setPage(1); setPageInput("1"); }} disabled={page <= 1}>
                <ChevronsLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { const p = Math.max(1, page - 1); setPage(p); setPageInput(String(p)); }} disabled={page <= 1}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs text-muted-foreground">Página</span>
              <Input
                type="text"
                inputMode="numeric"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))}
                onBlur={() => {
                  const total = Math.max(1, Math.ceil(rows.length / pageSize));
                  const p = Math.min(total, Math.max(1, Number(pageInput) || 1));
                  setPage(p);
                  setPageInput(String(p));
                }}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className="h-8 w-14 text-center"
              />
              <span className="text-xs text-muted-foreground">de {Math.max(1, Math.ceil(rows.length / pageSize))}</span>
              <Button variant="ghost" size="sm" onClick={() => { const total = Math.max(1, Math.ceil(rows.length / pageSize)); const p = Math.min(total, page + 1); setPage(p); setPageInput(String(p)); }} disabled={page >= Math.ceil(rows.length / pageSize)}>
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { const p = Math.max(1, Math.ceil(rows.length / pageSize)); setPage(p); setPageInput(String(p)); }} disabled={page >= Math.ceil(rows.length / pageSize)}>
                <ChevronsRight className="size-4" />
              </Button>
              <span className="text-xs text-muted-foreground ml-2">Por página:</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); setPageInput("1"); }}>
                <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[20, 40, 60, 80, 100, 120].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
                {rows.slice((page - 1) * pageSize, page * pageSize).map((r) => (
                  <tr
                    key={r.id_solicitacao}
                    className="border-t hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => handleOpenTpDoc(r)}
                  >
                    <td className="px-3 py-2 whitespace-nowrap"><DateTimeCell iso={r.din_criacao} /></td>
                    <td className="px-3 py-2 whitespace-nowrap"><DateTimeCell iso={r.din_modificacao} /></td>
                    <td className="px-3 py-2 whitespace-nowrap"><DateTimeCell iso={r.din_revisao} /></td>
                    <td className="px-3 py-2">{r.dsc_tpdocumento || "—"}</td>
                    <td className="px-3 py-2">{r.num_revisao || "—"}</td>
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
      {showStats && <Statistics onClose={() => setShowStats(false)} />}
    </div>
  );
}
