import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DateInputBR } from "./DateInputBR";
import { api } from "@/lib/api";
import type { AuditoriaRow, AppUser } from "@/types/electron";
import { Loader2, BarChart3, Download, RotateCw, Clock, CheckCircle2, AlertCircle, ListChecks, TrendingUp, Info, Sparkles, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import * as XLSX from "xlsx";

// Cores temáticas para Pendências: verde (Agente) e azul (ONS), iguais aos charts de COS
const PEND_COLOR_AGENTE = "hsl(var(--primary))";
const PEND_COLOR_ONS = "#10b981";

type TimeUnit = "h" | "d" | "m" | "y";
function msToUnit(ms: number, u: TimeUnit): number {
  const h = ms / 3600000;
  if (u === "h") return +h.toFixed(2);
  if (u === "d") return +(h / 24).toFixed(2);
  if (u === "m") return +(h / 24 / 30).toFixed(2);
  return +(h / 24 / 365).toFixed(2);
}
function unitSuffix(u: TimeUnit): string {
  return u === "h" ? "h" : u === "d" ? "d" : u === "m" ? "m" : "a";
}
function fmtUnit(ms: number, u: TimeUnit): string {
  if (!isFinite(ms) || ms <= 0) return "—";
  return `${msToUnit(ms, u)} ${unitSuffix(u)}`;
}

type Preset = "7d" | "15d" | "30d" | "180d" | "365d" | "custom";

const PRESETS: { id: Preset; label: string; days?: number }[] = [
  { id: "7d", label: "Últimos 7 dias", days: 7 },
  { id: "15d", label: "Últimos 15 dias", days: 15 },
  { id: "30d", label: "Último mês", days: 30 },
  { id: "180d", label: "Últimos 6 meses", days: 180 },
  { id: "365d", label: "Último ano", days: 365 },
  { id: "custom", label: "Personalizado" },
];

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6", "#06b6d4", "#84cc16", "#ec4899", "#14b8a6"];

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
function isoEndOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
function fmtMs(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return "—";
  const min = ms / 60000;
  if (min < 60) return `${min.toFixed(0)} min`;
  const h = min / 60;
  if (h < 24) return `${h.toFixed(1)} h`;
  const d = h / 24;
  return `${d.toFixed(1)} d`;
}
function fmtDateBR(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

interface AnalysisStat {
  id_solicitacao: number;
  cos_nome: string;
  agente: string;
  instalacao: string;
  ins_id: string;
  tipo: string;
  usuario: string;
  totalMs: number;          // Solicitado -> Distribuído (ou último status)
  pureAnalysisMs: number;   // soma de tempos em "Em Análise"
  pendenciaMs: number;      // soma de tempos em "Pendência"
  pendAgenteMs: number;     // soma de tempos em "Pendência" originada por Em Análise -> Pendência (espera do agente)
  pendOnsMs: number;        // soma de tempos em "Em Análise" originada por Pendência -> Em Análise (resposta do ONS)
  qtdPendAgente: number;    // nº de transições Em Análise -> Pendência
  qtdPendOns: number;       // nº de transições Pendência -> Em Análise
  finalizado: boolean;
  pendente: boolean;
  deAcordo: boolean;        // último status "De Acordo" (ainda não Distribuído)
  numEventos: number;
  inicio: string;
  fim: string;
}

export default function Statistics({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const [preset, setPreset] = useState<Preset>("30d");
  const [dataIni, setDataIni] = useState<string | undefined>(isoDaysAgo(30));
  const [dataFim, setDataFim] = useState<string | undefined>(isoEndOfToday());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AuditoriaRow[]>([]);
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("h");
  const [maximizedChart, setMaximizedChart] = useState<null | { title: string; node: React.ReactNode }>(null);

  // Filtros adicionais
  const [filtroCos, setFiltroCos] = useState<string>("all");
  const [filtroAgente, setFiltroAgente] = useState<string>("all");
  const [filtroTipo, setFiltroTipo] = useState<string>("all");
  const [ignorarPendencias, setIgnorarPendencias] = useState<boolean>(false);
  const [onlyMine, setOnlyMine] = useState<boolean>(false);

  function applyPreset(p: Preset) {
    setPreset(p);
    const item = PRESETS.find((x) => x.id === p);
    if (item?.days) {
      setDataIni(isoDaysAgo(item.days));
      setDataFim(isoEndOfToday());
    }
  }

  async function load() {
    setLoading(true);
    const r = await api.auditoria({ dataIni, dataFim });
    setLoading(false);
    if (r.ok && r.rows) setRows(r.rows);
    else toast.error("Erro ao carregar auditoria", { description: r.error });
  }

  useEffect(() => { load(); }, []); // primeira carga

  // Agrupar por solicitação para calcular tempos
  const stats = useMemo(() => {
    // map id_solicitacao -> sorted events
    const bySol = new Map<number, AuditoriaRow[]>();
    for (const r of rows) {
      if (!r.id_solicitacao) continue;
      if (!bySol.has(r.id_solicitacao)) bySol.set(r.id_solicitacao, []);
      bySol.get(r.id_solicitacao)!.push(r);
    }
    const list: AnalysisStat[] = [];
    for (const [idSol, evts] of bySol) {
      // ordenar por din_evento
      evts.sort((a, b) => new Date(a.din_evento).getTime() - new Date(b.din_evento).getTime());

      // Pegar transições de Status (eventos com dsc_campoalterado contendo "Status")
      const statusEvts = evts.filter((e) => (e.dsc_campoalterado || "").toLowerCase().includes("status"));

      // Tempos por status: pares (din_evento_atual, din_evento_proximo)
      let pureAnalysisMs = 0;
      let pendenciaMs = 0;
      let pendAgenteMs = 0;
      let pendOnsMs = 0;
      let qtdPendAgente = 0;
      let qtdPendOns = 0;
      let totalMs = 0;
      let finalizado = false;
      let pendente = false;
      let deAcordo = false;
      let inicio = evts[0]?.din_evento || "";
      let fim = evts[evts.length - 1]?.din_evento || "";

      // Marca status atual (último id_tpstatussolicitacao registrado)
      const ultimoStatus = evts[evts.length - 1]?.dsc_statussolicitacao || "";
      finalizado = ultimoStatus === "Distribuído";
      pendente = ultimoStatus === "Pendência";
      deAcordo = ultimoStatus === "De Acordo";

      // Calcular tempo total: do primeiro evento até último (Distribuído se for o caso)
      if (inicio && fim) totalMs = new Date(fim).getTime() - new Date(inicio).getTime();

      // Calcular tempo em cada status pelas transições
      for (let i = 0; i < statusEvts.length; i++) {
        const cur = statusEvts[i];
        const next = statusEvts[i + 1];
        const dt = next ? new Date(next.din_evento).getTime() - new Date(cur.din_evento).getTime() : 0;
        const novoStatus = (cur.dsc_valornovo || "").trim();
        const antigoStatus = (cur.dsc_valorantigo || "").trim();

        if (next && novoStatus === "Em Análise") pureAnalysisMs += dt;
        else if (next && novoStatus === "Pendência") pendenciaMs += dt;

        // Pendência do AGENTE: status passou para "Pendência" vindo de "Em Análise"
        if (novoStatus === "Pendência" && antigoStatus === "Em Análise") {
          qtdPendAgente += 1;
          if (next) pendAgenteMs += dt; // tempo até sair de Pendência
        }
        // Pendência do ONS: status passou para "Em Análise" vindo de "Pendência"
        if (novoStatus === "Em Análise" && antigoStatus === "Pendência") {
          qtdPendOns += 1;
          if (next) pendOnsMs += dt; // tempo até sair de Em Análise
        }
      }

      // Pegar metadados dominantes (último não nulo)
      const last = evts[evts.length - 1];
      list.push({
        id_solicitacao: idSol,
        cos_nome: last.cos_nome || last.cos_id?.trim() || "—",
        agente: last.nom_agenteoperacao || "—",
        instalacao: last.nom_instalacao || "—",
        ins_id: (last.ins_id || "").trim(),
        tipo: last.dsc_tpdocumento || "—",
        usuario: statusEvts[statusEvts.length - 1]?.nom_usuario || last.nom_usuario || "—",
        totalMs,
        pureAnalysisMs,
        pendenciaMs,
        pendAgenteMs,
        pendOnsMs,
        qtdPendAgente,
        qtdPendOns,
        finalizado,
        pendente,
        deAcordo,
        numEventos: evts.length,
        inicio,
        fim,
      });
    }
    return list;
  }, [rows]);

  // Listas distintas para filtros
  const optionsCos = useMemo(() => Array.from(new Set(stats.map((s) => s.cos_nome))).sort(), [stats]);
  const optionsAgente = useMemo(() => Array.from(new Set(stats.map((s) => s.agente))).sort(), [stats]);
  const optionsTipo = useMemo(() => Array.from(new Set(stats.map((s) => s.tipo))).sort(), [stats]);

  const minhasSolicitacoes = useMemo(() => {
    const lgn = (user.lgn_usuario || "").trim().toLowerCase();
    const set = new Set<number>();
    if (!lgn) return set;
    for (const r of rows) {
      if (!r.id_solicitacao || !r.nom_usuario) continue;
      if (r.nom_usuario.trim().toLowerCase() === lgn) set.add(r.id_solicitacao);
    }
    return set;
  }, [rows, user.lgn_usuario]);

  const filtered = useMemo(() => stats.filter((s) =>
    (filtroCos === "all" || s.cos_nome === filtroCos) &&
    (filtroAgente === "all" || s.agente === filtroAgente) &&
    (filtroTipo === "all" || s.tipo === filtroTipo) &&
    (!onlyMine || minhasSolicitacoes.has(s.id_solicitacao))
  ), [stats, filtroCos, filtroAgente, filtroTipo, onlyMine, minhasSolicitacoes]);

  // KPIs
  const kpis = useMemo(() => {
    const finalizados = filtered.filter((s) => s.finalizado);
    const pendentes = filtered.filter((s) => s.pendente);
    const deAcordoArr = filtered.filter((s) => s.deAcordo);
    const adj = (s: AnalysisStat) => ignorarPendencias ? Math.max(0, s.totalMs - s.pendenciaMs) : s.totalMs;
    const tempos = finalizados.map(adj).filter((x) => x > 0);
    const tempoTotal = tempos.reduce((a, b) => a + b, 0);
    const tempoMedio = tempos.length ? tempoTotal / tempos.length : 0;
    const tempoMax = tempos.length ? Math.max(...tempos) : 0;
    const analiseTotal = filtered.reduce((a, s) => a + s.pureAnalysisMs, 0);
    const analiseMed = filtered.length ? analiseTotal / filtered.length : 0;
    // Pendência médias (usar apenas casos com qtd > 0)
    const pAg = filtered.filter((s) => s.qtdPendAgente > 0);
    const pOns = filtered.filter((s) => s.qtdPendOns > 0);
    const pendAgenteMed = pAg.length ? pAg.reduce((a, s) => a + s.pendAgenteMs, 0) / pAg.length : 0;
    const pendOnsMed = pOns.length ? pOns.reduce((a, s) => a + s.pendOnsMs, 0) / pOns.length : 0;
    const totalPendAgente = filtered.reduce((a, s) => a + s.qtdPendAgente, 0);
    const totalPendOns = filtered.reduce((a, s) => a + s.qtdPendOns, 0);
    return {
      totalSolicitacoes: filtered.length,
      finalizadas: finalizados.length,
      pendentes: pendentes.length,
      deAcordo: deAcordoArr.length,
      tempoTotal,
      tempoMedio,
      tempoMax,
      analiseTotal,
      analiseMed,
      pendAgenteMed,
      pendOnsMed,
      totalPendAgente,
      totalPendOns,
    };
  }, [filtered, ignorarPendencias]);

  // Agrupamentos para gráficos (com pendências por COS/agente)
  function groupBy<K extends keyof AnalysisStat>(key: K) {
    const adj = (s: AnalysisStat) => ignorarPendencias ? Math.max(0, s.totalMs - s.pendenciaMs) : s.totalMs;
    const map = new Map<string, { count: number; tempoTotal: number; pendOnsCount: number; pendOnsMs: number }>();
    for (const s of filtered) {
      const k = String(s[key] || "(vazio)");
      const cur = map.get(k) || { count: 0, tempoTotal: 0, pendOnsCount: 0, pendOnsMs: 0 };
      cur.count += 1;
      cur.tempoTotal += adj(s);
      cur.pendOnsCount += s.qtdPendOns;
      cur.pendOnsMs += s.pendOnsMs;
      map.set(k, cur);
    }
    return Array.from(map.entries()).map(([name, v]) => ({
      name,
      count: v.count,
      tempoMedio: msToUnit(v.tempoTotal / Math.max(1, v.count), timeUnit),
      tempoTotal: msToUnit(v.tempoTotal, timeUnit),
      tempoMedioH: +(v.tempoTotal / Math.max(1, v.count) / 3600000).toFixed(2),
      tempoTotalH: +(v.tempoTotal / 3600000).toFixed(2),
      pendOnsCount: v.pendOnsCount,
      pendOnsMedio: msToUnit(v.pendOnsCount > 0 ? v.pendOnsMs / v.pendOnsCount : 0, timeUnit),
      pendOnsTotal: msToUnit(v.pendOnsMs, timeUnit),
    })).sort((a, b) => b.count - a.count);
  }

  const porCos = useMemo(() => groupBy("cos_nome"), [filtered, timeUnit, ignorarPendencias]);
  const porAgente = useMemo(() => groupBy("agente").slice(0, 12), [filtered, timeUnit, ignorarPendencias]);
  const porInstalacao = useMemo(() =>
    Array.from(filtered.reduce((m, s) => {
      const key = `${s.instalacao}${s.ins_id ? ` (${s.ins_id})` : ""}`;
      const cur = m.get(key) || { count: 0, tempoTotal: 0 };
      cur.count += 1;
      cur.tempoTotal += s.totalMs;
      m.set(key, cur);
      return m;
    }, new Map<string, { count: number; tempoTotal: number }>()).entries())
      .map(([name, v]) => ({ name, count: v.count, tempoMedioH: +(v.tempoTotal / v.count / 3600000).toFixed(2) }))
      .sort((a, b) => b.count - a.count).slice(0, 12),
  [filtered]);
  const porTipo = useMemo(() => groupBy("tipo"), [filtered, timeUnit, ignorarPendencias]);
  const porUsuario = useMemo(() => groupBy("usuario")
    .filter((x) => x.name.toLowerCase().startsWith("ons\\"))
    .map((x) => ({ ...x, name: x.name.substring(4) }))
    .slice(0, 12), [filtered, timeUnit, ignorarPendencias]);

  // Pendências por agente / COS
  function pendGroup<K extends keyof AnalysisStat>(key: K) {
    const map = new Map<string, { agente: number; ons: number; tempoAgenteMs: number; tempoOnsMs: number }>();
    for (const s of filtered) {
      const k = String(s[key] || "—");
      const cur = map.get(k) || { agente: 0, ons: 0, tempoAgenteMs: 0, tempoOnsMs: 0 };
      cur.agente += s.qtdPendAgente;
      cur.ons += s.qtdPendOns;
      cur.tempoAgenteMs += s.pendAgenteMs;
      cur.tempoOnsMs += s.pendOnsMs;
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        agente: v.agente,
        ons: v.ons,
        total: v.agente + v.ons,
        tempoAgenteH: msToUnit(v.tempoAgenteMs, timeUnit),
        tempoOnsH: msToUnit(v.tempoOnsMs, timeUnit),
      }))
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total);
  }
  const pendPorAgente = useMemo(() => pendGroup("agente").slice(0, 12), [filtered, timeUnit]);
  const pendPorCos = useMemo(() => pendGroup("cos_nome"), [filtered, timeUnit]);

  // Série temporal: análises finalizadas por dia
  const porDia = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of filtered) {
      if (!s.fim) continue;
      const k = fmtDateBR(s.fim);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => {
        const [da, ma, ya] = a.date.split("/").map(Number);
        const [db, mb, yb] = b.date.split("/").map(Number);
        return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
      });
  }, [filtered]);

  function exportExcel() {
    const wb = XLSX.utils.book_new();

    // Sheet única "Auditoria" com TODAS as colunas brutas vindas da consulta SQL,
    // formato tabelar pronto para consumo em Power BI / Excel.
    const evts = rows.map((r) => ({
      id_auditoria: r.id_auditoria,
      id_solicitacao: r.id_solicitacao,
      din_evento: r.din_evento ? new Date(r.din_evento).toISOString() : "",
      din_evento_br: r.din_evento ? new Date(r.din_evento).toLocaleString("pt-BR") : "",
      nom_agenteoperacao: r.nom_agenteoperacao,
      nom_instalacao: r.nom_instalacao,
      ins_id: r.ins_id,
      nom_usuario: r.nom_usuario,
      id_tpstatussolicitacao: r.id_tpstatussolicitacao,
      dsc_statussolicitacao: r.dsc_statussolicitacao,
      id_tpdocumento: r.id_tpdocumento,
      dsc_tpdocumento: r.dsc_tpdocumento,
      cos_id: r.cos_id,
      cos_nome: r.cos_nome,
      id_auditoriadetalhe: r.id_auditoriadetalhe,
      dsc_campoalterado: r.dsc_campoalterado,
      dsc_valorantigo: r.dsc_valorantigo,
      dsc_valornovo: r.dsc_valornovo,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(evts), "Auditoria");

    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    XLSX.writeFile(wb, `auditoria-diagramas-${ts}.xlsx`);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[92vh] overflow-y-auto sm:max-w-[95vw]">
        <TooltipProvider delayDuration={150}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="size-5" /> Estatísticas e Indicadores
          </DialogTitle>
        </DialogHeader>

        {/* Filtros */}
        <Card className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Período</label>
              <Select value={preset} onValueChange={(v) => applyPreset(v as Preset)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">De</label>
              <DateInputBR value={dataIni} onChange={(v) => { setDataIni(v); setPreset("custom"); }} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Até</label>
              <DateInputBR value={dataFim} onChange={(v) => { setDataFim(v); setPreset("custom"); }} />
            </div>
            <div className="flex gap-2 md:col-span-2">
              <Button onClick={load} disabled={loading} className="flex-1">
                <RotateCw className={loading ? "animate-spin" : ""} /> Atualizar
              </Button>
              <Button onClick={exportExcel} variant="secondary" disabled={!filtered.length}>
                <Download /> Excel
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">COS ONS</label>
              <Select value={filtroCos} onValueChange={setFiltroCos}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {optionsCos.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Instituição</label>
              <Select value={filtroAgente} onValueChange={setFiltroAgente}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {optionsAgente.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tipo de Diagrama</label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {optionsTipo.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Unidade:</span>
              <Select value={timeUnit} onValueChange={(v) => setTimeUnit(v as TimeUnit)}>
                <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="h">Horas</SelectItem>
                  <SelectItem value="d">Dias</SelectItem>
                  <SelectItem value="m">Meses</SelectItem>
                  <SelectItem value="y">Anos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={ignorarPendencias} onCheckedChange={(v) => setIgnorarPendencias(!!v)} />
              <span className="flex items-center gap-1.5">Ignorar Pendências
                <InfoTip text="Quando ativo, o tempo gasto em 'Pendência' é descontado do tempo total e médio." /></span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={onlyMine} onCheckedChange={(v) => setOnlyMine(!!v)} />
              <span>Apenas Meus Resultados</span>
            </label>
            <Button size="sm" variant="outline" disabled className="ml-auto opacity-50 cursor-not-allowed" title="Funcionalidade em breve">
              <Sparkles className="size-3.5" /> Análise Copilot
            </Button>
          </div>
        </Card>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            {/* KPIs - 12 indicadores em 4 colunas x 3 linhas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Linha 1: Solicitações | Em Pendência | De Acordo | Finalizadas */}
              <Kpi icon={<ListChecks className="size-4" />} label="Solicitações no período" value={String(kpis.totalSolicitacoes)} tip="Total de solicitações distintas no período." />
              <Kpi icon={<AlertCircle className="size-4 text-amber-600" />} label="Em pendência" value={String(kpis.pendentes)} tip="Solicitações cujo último status é 'Pendência'." />
              <Kpi icon={<CheckCircle2 className="size-4 text-blue-600" />} label="De Acordo (não distribuídas)" value={String(kpis.deAcordo)} tip="Último status é 'De Acordo'." />
              <Kpi icon={<CheckCircle2 className="size-4 text-emerald-600" />} label="Finalizadas" value={String(kpis.finalizadas)} tip="Último status é 'Distribuído'." />
              {/* Linha 2 */}
              <Kpi icon={<Clock className="size-4" />} label="Tempo Médio Em Análise" value={fmtUnit(kpis.analiseMed, timeUnit)} tip="Tempo médio em 'Em Análise' por solicitação." />
              <Kpi icon={<Clock className="size-4" />} label="Tempo Médio Finalização" value={fmtUnit(kpis.tempoMedio, timeUnit)} tip="Tempo médio do início ao fim das finalizadas." />
              <Kpi icon={<TrendingUp className="size-4" />} label="Tempo Máximo" value={fmtUnit(kpis.tempoMax, timeUnit)} tip="Maior tempo de finalização registrado." />
              <Kpi icon={<Clock className="size-4" />} label="Tempo Total Acumulado" value={fmtUnit(kpis.tempoTotal, timeUnit)} tip="Soma do tempo de finalização." />
              {/* Linha 3 */}
              <Kpi icon={<AlertCircle className="size-4" style={{ color: PEND_COLOR_AGENTE }} />} label="Pendências do Agente" value={String(kpis.totalPendAgente)} tip="Transições 'Em Análise → Pendência'." />
              <Kpi icon={<Clock className="size-4" style={{ color: PEND_COLOR_AGENTE }} />} label="Tempo Médio Pend. Agente" value={fmtUnit(kpis.pendAgenteMed, timeUnit)} tip="Tempo médio aguardando o agente." />
              <Kpi icon={<AlertCircle className="size-4" style={{ color: PEND_COLOR_ONS }} />} label="Pendências ONS" value={String(kpis.totalPendOns)} tip="Transições 'Pendência → Em Análise'." />
              <Kpi icon={<Clock className="size-4" style={{ color: PEND_COLOR_ONS }} />} label="Tempo Médio Pend. ONS" value={fmtUnit(kpis.pendOnsMed, timeUnit)} tip="Tempo médio do ONS após resposta de pendência." />
            </div>

            {/* Série temporal */}
            <Card className="p-3">
              <h3 className="font-semibold text-sm mb-2">Análises finalizadas por dia</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={porDia}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke={COLORS[0]} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Por COS */}
            <div className="grid md:grid-cols-2 gap-3">
              <ChartCard title="Análises por COS ONS" onMaximize={setMaximizedChart}>
                <ChartBar data={porCos} dataKey="count" name="Análises" />
              </ChartCard>
              <ChartCard title={`Tempo médio por COS (${unitSuffix(timeUnit)})`} onMaximize={setMaximizedChart}>
                <ChartBar data={porCos} dataKey="tempoMedio" name={unitSuffix(timeUnit)} color={COLORS[1]} />
              </ChartCard>
              <ChartCard title="Por Tipo de Diagrama" onMaximize={setMaximizedChart}>
                <ChartPie data={porTipo} />
              </ChartCard>
              <ChartCard title="Top Instituições" onMaximize={setMaximizedChart}>
                <ChartBar data={porAgente} dataKey="count" name="Análises" color={COLORS[2]} />
              </ChartCard>
              <ChartCard title="Top Instalações" onMaximize={setMaximizedChart}>
                <ChartBar data={porInstalacao} dataKey="count" name="Análises" color={COLORS[3]} />
              </ChartCard>
              <ChartCard title="Top Usuários (analistas)" onMaximize={setMaximizedChart}>
                <ChartBar data={porUsuario} dataKey="count" name="Análises" color={COLORS[4]} />
              </ChartCard>
            </div>

            {/* Pendências */}
            <Card className="p-3">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                <AlertCircle className="size-4 text-amber-600" /> Análise de Pendências
                <InfoTip text="Pendência do Agente: status mudou de 'Em Análise' para 'Pendência' (ONS pediu complemento ao agente). Pendência do ONS: status mudou de 'Pendência' para 'Em Análise' (agente respondeu e o ONS retomou)." />
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <ChartCard title="Quantidade de pendências por COS ONS" subtle onMaximize={setMaximizedChart}>
                  <ChartStackedPend data={pendPorCos} mode="count" />
                </ChartCard>
                <ChartCard title="Quantidade de pendências por Instituição (Top 12)" subtle onMaximize={setMaximizedChart}>
                  <ChartStackedPend data={pendPorAgente} mode="count" />
                </ChartCard>
                <ChartCard title={`Tempo de pendência por COS (${unitSuffix(timeUnit)})`} subtle onMaximize={setMaximizedChart}>
                  <ChartStackedPend data={pendPorCos} mode="time" />
                </ChartCard>
                <ChartCard title={`Tempo de pendência por Instituição (${unitSuffix(timeUnit)})`} subtle onMaximize={setMaximizedChart}>
                  <ChartStackedPend data={pendPorAgente} mode="time" />
                </ChartCard>
              </div>
            </Card>

            {/* Métricas por COS */}
            <Card className="p-3">
              <h3 className="font-semibold text-sm mb-2">Métricas por COS ONS</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-2 py-1.5">COS ONS</th>
                      <th className="text-right font-medium px-2 py-1.5">Análises</th>
                      <th className="text-right font-medium px-2 py-1.5">Tempo Total Análises ({unitSuffix(timeUnit)})</th>
                      <th className="text-right font-medium px-2 py-1.5">Tempo Médio Análises ({unitSuffix(timeUnit)})</th>
                      <th className="text-right font-medium px-2 py-1.5">Nº de Pendências</th>
                      <th className="text-right font-medium px-2 py-1.5">Tempo Médio Pend. ({unitSuffix(timeUnit)})</th>
                      <th className="text-right font-medium px-2 py-1.5">Tempo Total Pend. ({unitSuffix(timeUnit)})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porCos.map((p) => (
                      <tr key={p.name} className="border-t">
                        <td className="px-2 py-1.5">{p.name}</td>
                        <td className="px-2 py-1.5 text-right">{p.count}</td>
                        <td className="px-2 py-1.5 text-right">{p.tempoTotal}</td>
                        <td className="px-2 py-1.5 text-right">{p.tempoMedio}</td>
                        <td className="px-2 py-1.5 text-right">{p.pendOnsCount}</td>
                        <td className="px-2 py-1.5 text-right">{p.pendOnsMedio}</td>
                        <td className="px-2 py-1.5 text-right">{p.pendOnsTotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
        </TooltipProvider>

        {maximizedChart && (
          <Dialog open onOpenChange={(o) => !o && setMaximizedChart(null)}>
            <DialogContent className="max-w-3xl w-full max-h-[85vh]">
              <DialogHeader>
                <DialogTitle>{maximizedChart.title}</DialogTitle>
              </DialogHeader>
              <div className="h-[60vh]">{maximizedChart.node}</div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChartCard({ title, subtle, onMaximize, children }: { title: string; subtle?: boolean; onMaximize: (m: { title: string; node: React.ReactNode }) => void; children: React.ReactNode }) {
  const Wrapper: React.ElementType = subtle ? "div" : Card;
  const wrapperProps = subtle ? {} : { className: "p-3" };
  return (
    <Wrapper {...wrapperProps}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={subtle ? "text-xs font-medium text-muted-foreground" : "font-semibold text-sm"}>{title}</h3>
        <button
          type="button"
          onClick={() => onMaximize({ title, node: children })}
          className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
          aria-label="Maximizar gráfico"
          title="Maximizar"
        >
          <Maximize2 className="size-3.5" />
        </button>
      </div>
      {children}
    </Wrapper>
  );
}

function Kpi({ icon, label, value, tip }: { icon: React.ReactNode; label: string; value: string; tip?: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
        {tip && <InfoTip text={tip} />}
      </div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </Card>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <UITooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center text-muted-foreground hover:text-foreground" aria-label="Mais informações">
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
    </UITooltip>
  );
}

function ChartBar({ data, dataKey, name, color = COLORS[0] }: { data: { name: string }[]; dataKey: string; name: string; color?: string }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
          <Tooltip />
          <Bar dataKey={dataKey} name={name} fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartPie({ data }: { data: { name: string; count: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="name" outerRadius={80} label={(e) => e.name}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PendDatum { name: string; agente: number; ons: number; tempoAgenteH: number; tempoOnsH: number }
function ChartStackedPend({ data, mode }: { data: PendDatum[]; mode: "count" | "time" }) {
  const keyA = mode === "count" ? "agente" : "tempoAgenteH";
  const keyO = mode === "count" ? "ons" : "tempoOnsH";
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey={keyA} name="Pend. Agente" stackId="p" fill={PEND_COLOR_AGENTE} />
          <Bar dataKey={keyO} name="Pend. ONS" stackId="p" fill={PEND_COLOR_ONS} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
