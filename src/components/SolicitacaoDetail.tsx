import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Anexo, Comentario, SolicitacaoDetail as Detail, MpoDocumento } from "@/types/electron";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "./StatusBadge";
import { fmtDate } from "@/lib/format";
import { DateTimeCell } from "./DateTimeCell";
import { CopyButton } from "./CopyButton";
import { Mail, FileText, MessageSquare, Loader2, Building2, MapPin, Radio, AlertTriangle, ExternalLink, ClipboardList, Pencil, Search, Hash, Stamp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TPDOC_MAP } from "@/lib/constants";
import CarimboModal from "./CarimboModal";

const SINTEGRE_BASE = "https://sintegre.ons.org.br/sites/diagramasunifilares/Paginas/diagramasunifilares_form.aspx?idDiagramaUnifilar=";

function shortName(full: string | null | undefined): string {
  if (!full) return "";
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export default function SolicitacaoDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ solicitacao?: Detail; anexos?: Anexo[]; comentarios?: Comentario[] }>({});
  const [mpo, setMpo] = useState<MpoDocumento[]>([]);
  const [mpoLoading, setMpoLoading] = useState(false);
  const [mpoError, setMpoError] = useState<string | null>(null);

  // Campos da busca manual MPO (quando nada é encontrado pela sigla)
  const [mpoCodigo, setMpoCodigo] = useState("");
  const [mpoAssunto, setMpoAssunto] = useState("");
  const [mpoSearchRows, setMpoSearchRows] = useState<MpoDocumento[] | null>(null);
  const [mpoSearchLoading, setMpoSearchLoading] = useState(false);
  const [mpoSearchError, setMpoSearchError] = useState<string | null>(null);
  const [carimboOpen, setCarimboOpen] = useState(false);
  const [mpoGlow, setMpoGlow] = useState(false);

  useEffect(() => {
    setLoading(true);
    setMpo([]);
    setMpoError(null);
    setMpoCodigo("");
    setMpoAssunto("");
    setMpoSearchRows(null);
    setMpoSearchError(null);
    api.getSolicitacao(id).then((r) => {
      if (r.ok) {
        setData({ solicitacao: r.solicitacao, anexos: r.anexos, comentarios: r.comentarios });
        const insId = r.solicitacao?.ins_id?.trim();
        // Pula MPO para Instalação Temporária (ins_id = 999999)
        if (insId && insId !== "999999") {
          setMpoLoading(true);
          api.listMpo(insId).then((m) => {
            if (m.ok) setMpo(m.rows || []);
            else setMpoError(m.error || "Erro desconhecido ao consultar MPO.");
            setMpoLoading(false);
          });
        }
      }
      setLoading(false);
    });
  }, [id]);

  const s = data.solicitacao;
  const tpDeprecated = s ? TPDOC_MAP[s.id_tpdocumento]?.deprecated : false;
  const isTemporaria = s?.ins_id?.trim() === "999999";

  function buildMailto(s: Detail) {
    const subject = `Solicitação #${s.id_solicitacao} Diagrama Unifilar ${s.dsc_tpdocumento || ""} de ${s.instalacao_nome || ""}`.replace(/\s+/g, " ").trim();
    const nome = shortName(s.nom_criacao);
    const body = `Prezado(a) ${nome},\n\n`;
    return `mailto:${s.mail_solicitante}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function handleSearchMpo() {
    if (!mpoCodigo.trim() && !mpoAssunto.trim()) return;
    setMpoSearchLoading(true);
    setMpoSearchError(null);
    const r = await api.searchMpo({ codigo: mpoCodigo.trim(), assunto: mpoAssunto.trim() });
    if (r.ok) setMpoSearchRows(r.rows || []);
    else setMpoSearchError(r.error || "Erro ao buscar MPO.");
    setMpoSearchLoading(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span>Solicitação #{id}</span>
            <button
              className="text-xs font-medium inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              onClick={() => api.openExternal(`${SINTEGRE_BASE}${id}`)}
            >
              <ExternalLink className="size-3.5" /> Ver no SINtegre
            </button>
          </DialogTitle>
        </DialogHeader>

        {loading || !s ? (
          <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-6">
            {tpDeprecated && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-status-pendencia/10 border border-status-pendencia/30 text-sm">
                <AlertTriangle className="size-4 text-status-pendencia mt-0.5" />
                <span>O tipo de diagrama <strong>{s.dsc_tpdocumento}</strong> não é mais utilizado.</span>
              </div>
            )}

            {/* Bloco solicitante */}
            <section className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm field-card p-4">
              <Field label="Data de Criação"><DateTimeCell iso={s.din_criacao} /></Field>
              <Field label="Solicitante" value={s.nom_criacao} />
              <Field label="E-mail">
                <button
                  className="text-primary hover:underline inline-flex items-center gap-1 text-left"
                  onClick={() => api.openExternal(buildMailto(s))}
                >
                  <Mail className="size-3.5" /> {s.mail_solicitante}
                </button>
              </Field>
              <Field label="Status"><StatusBadge id={s.id_tpstatussolicitacao} /></Field>
              <Field label="Última Modificação"><DateTimeCell iso={s.din_modificacao} /></Field>
            </section>

            {/* Bloco instalação */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 field-card text-sm">
              <Field label="Instituição" icon={<Building2 className="size-3.5" />} value={s.nom_agenteoperacao || "—"} />
              <Field label="Sigla" icon={<Hash className="size-3.5" />} value={isTemporaria ? "—" : (s.ins_id?.trim() || "—")} />
              <Field label="Instalação" icon={<MapPin className="size-3.5" />} value={s.instalacao_nome || "—"} />
              <Field label="COS ONS" icon={<Radio className="size-3.5" />} value={s.cos_nome || s.cos_id?.trim() || "—"} />
              <Field label="Número da Revisão" value={s.num_revisao || "—"} />
              <Field label="Data de Revisão"><DateTimeCell iso={s.din_revisao} /></Field>
              <Field label="Tipo de Diagrama" value={s.dsc_tpdocumento || "—"} />
            </section>

            {/* MPO */}
            <section className={mpoGlow ? "mpo-glow p-2 -m-2" : ""}>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><ClipboardList className="size-4" /> MPO</h3>
              {isTemporaria ? (
                <p className="text-sm text-muted-foreground">Instalação temporária — consulta MPO não aplicável.</p>
              ) : mpoLoading ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" /> Carregando MPO…</p>
              ) : mpoError ? (
                <p className="text-sm text-status-pendencia">{mpoError}</p>
              ) : mpo.length ? (
                <MpoTable rows={mpo} />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Nenhum diagrama no MPO encontrado para esta instalação.</p>
                  <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground">Buscar manualmente por Código e/ou Assunto:</p>
                    <div className="flex flex-col md:flex-row gap-2">
                      <Input
                        placeholder="Código (id_identificador)"
                        value={mpoCodigo}
                        onChange={(e) => setMpoCodigo(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSearchMpo(); }}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Assunto"
                        value={mpoAssunto}
                        onChange={(e) => setMpoAssunto(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSearchMpo(); }}
                        className="h-8 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={handleSearchMpo}
                        disabled={mpoSearchLoading || (!mpoCodigo.trim() && !mpoAssunto.trim())}
                        className="h-8"
                      >
                        {mpoSearchLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                        <span className="ml-1">Buscar</span>
                      </Button>
                    </div>
                    {mpoSearchError && <p className="text-xs text-status-pendencia">{mpoSearchError}</p>}
                    {mpoSearchRows !== null && !mpoSearchError && (
                      mpoSearchRows.length ? (
                        <div className="pt-2"><MpoTable rows={mpoSearchRows} /></div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Nenhum resultado para a busca.</p>
                      )
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Arquivos */}
            <section>
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <h3 className="font-semibold text-sm flex items-center gap-2"><FileText className="size-4" /> Arquivos</h3>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setCarimboOpen(true)}>
                    <Stamp className="size-3.5" /> Carimbo ONS
                  </Button>
                  <Button size="sm" variant="outline" disabled className="opacity-50 cursor-not-allowed" title="Funcionalidade em breve">
                    <Sparkles className="size-3.5" /> Análise Copilot
                  </Button>
                </div>
              </div>
              {data.anexos?.length ? (
                <ul className="divide-y border rounded-md">
                  {data.anexos.map((a) => (
                    <li key={a.id_anexodiagramaunifilar} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="font-medium">{a.nom_arquivo || "Arquivo"}</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => a.url_arquivo && api.openExternal(a.url_arquivo)}
                      >
                        Abrir diagrama
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum arquivo anexado.</p>
              )}
            </section>

            {/* Motivo + Observações */}
            <section className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-md p-3">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Motivo de Revisão</h4>
                  {s.dsc_motivorevisao && <CopyButton text={s.dsc_motivorevisao} label="Copiar motivo de revisão" />}
                </div>
                <p className="text-sm whitespace-pre-wrap">{s.dsc_motivorevisao || "—"}</p>
              </div>
              <div className="border rounded-md p-3 space-y-2">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Observação ONS</h4>
                  <p className="text-sm whitespace-pre-wrap">{s.obs_ons || "—"}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Observação Agente</h4>
                  <p className="text-sm whitespace-pre-wrap">{s.obs_agente || "—"}</p>
                </div>
              </div>
            </section>

            {/* Comentários */}
            <section>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><MessageSquare className="size-4" /> Comentários</h3>
              {data.comentarios?.length ? (
                <ul className="space-y-2">
                  {data.comentarios.map((c) => (
                    <li key={c.id_comentariodiagramaunifilar} className="border rounded-md p-3 text-sm">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span className="font-medium text-foreground">{c.nom_autor || "Anônimo"}</span>
                        <span>{fmtDate(c.din_criacao, true)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{c.dsc_texto}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Sem comentários.</p>
              )}
            </section>
          </div>
        )}
      </DialogContent>
      {carimboOpen && <CarimboModal onClose={() => setCarimboOpen(false)} onStamped={() => { setMpoGlow(true); setTimeout(() => setMpoGlow(false), 1800); }} />}
    </Dialog>
  );
}

function MpoTable({ rows }: { rows: MpoDocumento[] }) {
  return (
    <div className="overflow-x-auto border rounded-md">
      <table className="w-full text-xs">
        <thead className="bg-muted/60 text-muted-foreground">
          <tr>
            <th className="text-left font-medium px-2 py-1.5">Situação</th>
            <th className="text-left font-medium px-2 py-1.5">Data</th>
            <th className="text-left font-medium px-2 py-1.5">Código</th>
            <th className="text-left font-medium px-2 py-1.5">Revisão</th>
            <th className="text-left font-medium px-2 py-1.5">Assunto</th>
            <th className="text-left font-medium px-2 py-1.5">Autor</th>
            <th className="text-left font-medium px-2 py-1.5">Editar MPO</th>
            <th className="text-left font-medium px-2 py-1.5">Diagrama</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id_documentompo} className="border-t">
              <td className="px-2 py-1.5">{m.dsc_situacaodocumento || "—"}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{fmtDate(m.din_modificado)}</td>
              <td className="px-2 py-1.5 font-mono">{m.id_identificador || "—"}</td>
              <td className="px-2 py-1.5 font-mono">{m.revisao || "—"}</td>
              <td className="px-2 py-1.5">{m.assunto || "—"}</td>
              <td className="px-2 py-1.5">{m.dsc_usuariomodificacao || "—"}</td>
              <td className="px-2 py-1.5">
                {m.url_diagrama ? (
                  <button className="text-primary hover:underline inline-flex items-center gap-1" onClick={() => api.openExternal(m.url_diagrama!)}>
                    <Pencil className="size-3" /> Editar
                  </button>
                ) : "—"}
              </td>
              <td className="px-2 py-1.5">
                {m.url_editar ? (
                  <button className="text-primary hover:underline inline-flex items-center gap-1" onClick={() => api.openExternal(m.url_editar!)}>
                    <ExternalLink className="size-3" /> Abrir
                  </button>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, value, icon, children }: { label: string; value?: string | null; icon?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-0.5">
        {icon}{label}
      </div>
      <div className="text-sm">{children ?? value ?? "—"}</div>
    </div>
  );
}
