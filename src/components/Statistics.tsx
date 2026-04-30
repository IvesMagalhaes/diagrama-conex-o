import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInputBR } from "./DateInputBR";
import { api } from "@/lib/api";
import type { AuditoriaRow } from "@/types/electron";
import { Loader2, BarChart3, Download, RotateCw, Clock, CheckCircle2, AlertCircle, ListChecks, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import * as XLSX from "xlsx";

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
  finalizado: boolean;
  pendente: boolean;
  numEventos: number;
  inicio: string;
  fim: string;
}

export default function Statistics({ onClose }: { onClose: () => void }) {
  const [preset, setPreset] = useState<Preset>("30d");
  const [dataIni, setDataIni] = useState<string | undefined>(isoDaysAgo(30));
  const [dataFim, setDataFim] = useState<string | undefined>(isoEndOfToday());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AuditoriaRow[]>([]);

  // Filtros adicionais
  const [filtroCos, setFiltroCos] = useState<string>("all");
  const [filtroAgente, setFiltroAgente] = useState<string>("all");
  const [filtroTipo, setFiltroTipo] = useState<string>("all");

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
      let totalMs = 0;
      let finalizado = false;
      let pendente = false;
      let inicio = evts[0]?.din_evento || "";
      let fim = evts[evts.length - 1]?.din_evento || "";

      // Marca status atual (último id_tpstatussolicitacao registrado)
      const ultimoStatus = evts[evts.length - 1]?.dsc_statussolicitacao || "";
      finalizado = ultimoStatus === "Distribuído";
      pendente = ultimoStatus === "Pendência";

      // Calcular tempo total: do primeiro evento até último (Distribuído se for o caso)
      if (inicio && fim) totalMs = new Date(fim).getTime() - new Date(inicio).getTime();

      // Calcular tempo em cada status pelas transições
      for (let i = 0; i < statusEvts.length; i++) {
        const cur = statusEvts[i];
        const next = statusEvts[i + 1];
        if (!next) continue;
        const dt = new Date(next.din_evento).getTime() - new Date(cur.din_evento).getTime();
        const novoStatus = (cur.dsc_valornovo || "").trim();
        if (novoStatus === "Em Análise") pureAnalysisMs += dt;
        else if (novoStatus === "Pendência") pendenciaMs += dt;
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
        finalizado,
        pendente,
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

  const filtered = useMemo(() => stats.filter((s) =>
    (filtroCos === "all" || s.cos_nome === filtroCos) &&
    (filtroAgente === "all" || s.agente === filtroAgente) &&
    (filtroTipo === "all" || s.tipo === filtroTipo)
  ), [stats, filtroCos, filtroAgente, filtroTipo]);

  // KPIs
  const kpis = useMemo(() => {
    const finalizados = filtered.filter((s) => s.finalizado);
    const pendentes = filtered.filter((s) => s.pendente);
    const tempos = finalizados.map((s) => s.totalMs).filter((x) => x > 0);
    const tempoTotal = tempos.reduce((a, b) => a + b, 0);
    const tempoMedio = tempos.length ? tempoTotal / tempos.length : 0;
    const tempoMax = tempos.length ? Math.max(...tempos) : 0;
    const analiseTotal = filtered.reduce((a, s) => a + s.pureAnalysisMs, 0);
    const analiseMed = filtered.length ? analiseTotal / filtered.length : 0;
    return {
      totalSolicitacoes: filtered.length,
      finalizadas: finalizados.length,
      pendentes: pendentes.length,
      tempoTotal,
      tempoMedio,
      tempoMax,
      analiseTotal,
      analiseMed,
    };
  }, [filtered]);

  // Agrupamentos para gráficos
  function groupBy<K extends keyof AnalysisStat>(key: K) {
    const map = new Map<string, { count: number; tempoMedio: number; tempoTotal: number }>();
    for (const s of filtered) {
      const k = String(s[key] || "—");
      const cur = map.get(k) || { count: 0, tempoMedio: 0, tempoTotal: 0 };
      cur.count += 1;
      cur.tempoTotal += s.totalMs;
      map.set(k, cur);
    }
    return Array.from(map.entries()).map(([name, v]) => ({
      name,
      count: v.count,
      tempoMedioH: +(v.tempoTotal / v.count / 3600000).toFixed(2),
      tempoTotalH: +(v.tempoTotal / 3600000).toFixed(2),
    })).sort((a, b) => b.count - a.count);
  }

  const porCos = useMemo(() => groupBy("cos_nome"), [filtered]);
  const porAgente = useMemo(() => groupBy("agente").slice(0, 12), [filtered]);
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
  const porTipo = useMemo(() => groupBy("tipo"), [filtered]);
  const porUsuario = useMemo(() => groupBy("usuario").filter((x) => x.name !== "—").slice(0, 12), [filtered]);

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

    // Sheet 1: Resumo
    const resumo = [
      ["Período", `${fmtDateBR(dataIni!)} a ${fmtDateBR(dataFim!)}`],
      ["Filtro COS", filtroCos],
      ["Filtro Instituição", filtroAgente],
      ["Filtro Tipo", filtroTipo],
      [],
      ["Métrica", "Valor"],
      ["Solicitações no período", kpis.totalSolicitacoes],
      ["Finalizadas (Distribuído)", kpis.finalizadas],
      ["Em pendência", kpis.pendentes],
      ["Tempo total acumulado", fmtMs(kpis.tempoTotal)],
      ["Tempo médio por solicitação finalizada", fmtMs(kpis.tempoMedio)],
      ["Tempo máximo de uma solicitação", fmtMs(kpis.tempoMax)],
      ["Tempo médio em 'Em Análise'", fmtMs(kpis.analiseMed)],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), "Resumo");

    // Sheet 2: Solicitações
    const sol = filtered.map((s) => ({
      "ID Solicitação": s.id_solicitacao,
      "COS ONS": s.cos_nome,
      "Instituição": s.agente,
      "Instalação": s.instalacao,
      "Sigla": s.ins_id,
      "Tipo": s.tipo,
      "Último Usuário": s.usuario,
      "Eventos": s.numEventos,
      "Início": s.inicio ? new Date(s.inicio).toLocaleString("pt-BR") : "",
      "Fim": s.fim ? new Date(s.fim).toLocaleString("pt-BR") : "",
      "Status final": s.finalizado ? "Distribuído" : (s.pendente ? "Pendência" : "Em andamento"),
      "Tempo total (h)": +(s.totalMs / 3600000).toFixed(2),
      "Tempo em Análise (h)": +(s.pureAnalysisMs / 3600000).toFixed(2),
      "Tempo em Pendência (h)": +(s.pendenciaMs / 3600000).toFixed(2),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sol), "Solicitações");

    // Sheet 3: Eventos brutos
    const evts = rows.map((r) => ({
      "ID Auditoria": r.id_auditoria,
      "ID Solicitação": r.id_solicitacao,
      "Data Evento": r.din_evento ? new Date(r.din_evento).toLocaleString("pt-BR") : "",
      "Instituição": r.nom_agenteoperacao,
      "Instalação": r.nom_instalacao,
      "Usuário": r.nom_usuario,
      "Status": r.dsc_statussolicitacao,
      "Tipo Diagrama": r.dsc_tpdocumento,
      "COS ONS": r.cos_nome,
      "Campo Alterado": r.dsc_campoalterado,
      "Valor Antigo": r.dsc_valorantigo,
      "Valor Novo": r.dsc_valornovo,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(evts), "Eventos");

    // Sheet 4: Por COS
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porCos.map((p) => ({
      "COS ONS": p.name,
      "Análises": p.count,
      "Tempo médio (h)": p.tempoMedioH,
      "Tempo total (h)": p.tempoTotalH,
    }))), "Por COS");

    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    XLSX.writeFile(wb, `estatisticas-diagramas-${ts}.xlsx`);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
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
        </Card>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi icon={<ListChecks className="size-4" />} label="Solicitações no período" value={String(kpis.totalSolicitacoes)} />
              <Kpi icon={<CheckCircle2 className="size-4 text-emerald-600" />} label="Finalizadas" value={String(kpis.finalizadas)} />
              <Kpi icon={<AlertCircle className="size-4 text-amber-600" />} label="Em pendência" value={String(kpis.pendentes)} />
              <Kpi icon={<Clock className="size-4" />} label="Tempo médio (finalização)" value={fmtMs(kpis.tempoMedio)} />
              <Kpi icon={<TrendingUp className="size-4" />} label="Tempo máximo" value={fmtMs(kpis.tempoMax)} />
              <Kpi icon={<Clock className="size-4" />} label="Tempo médio em Análise" value={fmtMs(kpis.analiseMed)} />
              <Kpi icon={<Clock className="size-4" />} label="Tempo total acumulado" value={fmtMs(kpis.tempoTotal)} />
              <Kpi icon={<BarChart3 className="size-4" />} label="Eventos de auditoria" value={String(rows.length)} />
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
              <Card className="p-3">
                <h3 className="font-semibold text-sm mb-2">Análises por COS ONS</h3>
                <ChartBar data={porCos} dataKey="count" name="Análises" />
              </Card>
              <Card className="p-3">
                <h3 className="font-semibold text-sm mb-2">Tempo médio por COS (horas)</h3>
                <ChartBar data={porCos} dataKey="tempoMedioH" name="Horas" color={COLORS[1]} />
              </Card>
              <Card className="p-3">
                <h3 className="font-semibold text-sm mb-2">Por Tipo de Diagrama</h3>
                <ChartPie data={porTipo} />
              </Card>
              <Card className="p-3">
                <h3 className="font-semibold text-sm mb-2">Top Instituições</h3>
                <ChartBar data={porAgente} dataKey="count" name="Análises" color={COLORS[2]} />
              </Card>
              <Card className="p-3">
                <h3 className="font-semibold text-sm mb-2">Top Instalações</h3>
                <ChartBar data={porInstalacao} dataKey="count" name="Análises" color={COLORS[3]} />
              </Card>
              <Card className="p-3">
                <h3 className="font-semibold text-sm mb-2">Top Usuários (analistas)</h3>
                <ChartBar data={porUsuario} dataKey="count" name="Análises" color={COLORS[4]} />
              </Card>
            </div>

            {/* Métricas por COS */}
            <Card className="p-3">
              <h3 className="font-semibold text-sm mb-2">Métricas por COS ONS</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-2 py-1.5">COS ONS</th>
                      <th className="text-right font-medium px-2 py-1.5">Análises</th>
                      <th className="text-right font-medium px-2 py-1.5">Tempo total (h)</th>
                      <th className="text-right font-medium px-2 py-1.5">Tempo médio (h)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porCos.map((p) => (
                      <tr key={p.name} className="border-t">
                        <td className="px-2 py-1.5">{p.name}</td>
                        <td className="px-2 py-1.5 text-right">{p.count}</td>
                        <td className="px-2 py-1.5 text-right">{p.tempoTotalH}</td>
                        <td className="px-2 py-1.5 text-right">{p.tempoMedioH}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </Card>
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
