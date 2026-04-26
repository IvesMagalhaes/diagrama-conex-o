import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Anexo, Comentario, SolicitacaoDetail as Detail, MpoDocumento } from "@/types/electron";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "./StatusBadge";
import { fmtDate } from "@/lib/format";
import { DateTimeCell } from "./DateTimeCell";
import { CopyButton } from "./CopyButton";
import { Mail, FileText, MessageSquare, Loader2, Building2, MapPin, Radio, AlertTriangle, ExternalLink, ClipboardList, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TPDOC_MAP } from "@/lib/constants";

const SINTEGRE_BASE = "https://sintegre.ons.org.br/sites/diagramasunifilares/Paginas/diagramasunifilares_form.aspx?idDiagramaUnifilar=";

export default function SolicitacaoDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ solicitacao?: Detail; anexos?: Anexo[]; comentarios?: Comentario[] }>({});
  const [mpo, setMpo] = useState<MpoDocumento[]>([]);
  const [mpoLoading, setMpoLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setMpo([]);
    api.getSolicitacao(id).then((r) => {
      if (r.ok) {
        setData({ solicitacao: r.solicitacao, anexos: r.anexos, comentarios: r.comentarios });
        const insId = r.solicitacao?.ins_id;
        if (insId) {
          setMpoLoading(true);
          api.listMpo(insId).then((m) => {
            if (m.ok && m.rows) setMpo(m.rows);
            setMpoLoading(false);
          });
        }
      }
      setLoading(false);
    });
  }, [id]);

  const s = data.solicitacao;
  const tpDeprecated = s ? TPDOC_MAP[s.id_tpdocumento]?.deprecated : false;

  function buildMailto(s: Detail) {
    const subject = `Solicitação #${s.id_solicitacao} Diagrama Unifilar ${s.dsc_tpdocumento || ""} de ${s.instalacao_nome || ""}`.replace(/\s+/g, " ").trim();
    const body = `Prezado ${s.nom_criacao || ""},\n\n`;
    return `mailto:${s.mail_solicitante}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span>Solicitação #{id}</span>
            <button
              className="text-sm font-normal text-primary hover:underline inline-flex items-center gap-1"
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
            <section className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
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
            <section className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/40 rounded-md text-sm">
              <Field label="Instituição" icon={<Building2 className="size-3.5" />} value={s.nom_agenteoperacao || "—"} />
              <Field label="Instalação" icon={<MapPin className="size-3.5" />} value={s.instalacao_nome || "—"} />
              <Field label="COS ONS" icon={<Radio className="size-3.5" />} value={s.cos_nome || s.cos_id?.trim() || "—"} />
              <Field label="Número da Revisão" value={s.num_revisao || "—"} />
              <Field label="Data de Revisão"><DateTimeCell iso={s.din_revisao} /></Field>
              <Field label="Tipo de Diagrama" value={s.dsc_tpdocumento || "—"} />
            </section>

            {/* MPO */}
            <section>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><ClipboardList className="size-4" /> MPO</h3>
              {mpoLoading ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" /> Carregando MPO…</p>
              ) : mpo.length ? (
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
                      {mpo.map((m) => (
                        <tr key={m.id_documentompo} className="border-t">
                          <td className="px-2 py-1.5">{m.dsc_situacaodocumento || "—"}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{fmtDate(m.din_modificado)}</td>
                          <td className="px-2 py-1.5 font-mono">{m.id_identificador || "—"}</td>
                          <td className="px-2 py-1.5 font-mono">{m.revisao || "—"}</td>
                          <td className="px-2 py-1.5">{m.assunto || "—"}</td>
                          <td className="px-2 py-1.5">{m.dsc_usuariomodificacao || "—"}</td>
                          <td className="px-2 py-1.5">
                            {m.url_editar ? (
                              <button className="text-primary hover:underline inline-flex items-center gap-1" onClick={() => api.openExternal(m.url_editar!)}>
                                <Pencil className="size-3" /> Editar
                              </button>
                            ) : "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            {m.url_diagrama ? (
                              <button className="text-primary hover:underline inline-flex items-center gap-1" onClick={() => api.openExternal(m.url_diagrama!)}>
                                <ExternalLink className="size-3" /> Abrir
                              </button>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum MPO encontrado para esta instalação.</p>
              )}
            </section>

            {/* Arquivos */}
            <section>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileText className="size-4" /> Arquivos</h3>
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
    </Dialog>
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
