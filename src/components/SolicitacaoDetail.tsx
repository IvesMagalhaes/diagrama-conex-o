import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Anexo, Comentario, SolicitacaoDetail as Detail } from "@/types/electron";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "./StatusBadge";
import { fmtDate } from "@/lib/format";
import { Mail, FileText, MessageSquare, Loader2, Building2, MapPin, Radio, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TPDOC_MAP } from "@/lib/constants";

export default function SolicitacaoDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ solicitacao?: Detail; anexos?: Anexo[]; comentarios?: Comentario[] }>({});

  useEffect(() => {
    setLoading(true);
    api.getSolicitacao(id).then((r) => {
      if (r.ok) setData({ solicitacao: r.solicitacao, anexos: r.anexos, comentarios: r.comentarios });
      setLoading(false);
    });
  }, [id]);

  const s = data.solicitacao;
  const tpDeprecated = s ? TPDOC_MAP[s.id_tpdocumento]?.deprecated : false;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Solicitação #{id}
            {s && <StatusBadge id={s.id_tpstatussolicitacao} />}
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
              <Field label="Data de Solicitação" value={fmtDate(s.din_criacao, true)} />
              <Field label="Solicitante" value={s.nom_criacao} />
              <Field label="E-mail">
                <button
                  className="text-primary hover:underline inline-flex items-center gap-1 text-left"
                  onClick={() => api.openExternal(`mailto:${s.mail_solicitante}?subject=Solicitação Diagrama Unifilar #${s.id_solicitacao}`)}
                >
                  <Mail className="size-3.5" /> {s.mail_solicitante}
                </button>
              </Field>
              <Field label="Status"><StatusBadge id={s.id_tpstatussolicitacao} /></Field>
              <Field label="Última Modificação" value={fmtDate(s.din_modificacao, true)} />
            </section>

            {/* Bloco instalação */}
            <section className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/40 rounded-md text-sm">
              <Field label="Instituição" icon={<Building2 className="size-3.5" />} value={s.cos_id?.trim()} />
              <Field label="Instalação (TEMPORÁRIA quando aplicável)" icon={<MapPin className="size-3.5" />} value={s.instalacao_nome || "—"} />
              <Field label="Centro de Relacionamento ONS" icon={<Radio className="size-3.5" />} value={s.cod_crc || "—"} />
              <Field label="Número da Revisão" value={s.num_revisao || "—"} />
              <Field label="Data de Revisão" value={fmtDate(s.din_revisao)} />
              <Field label="Tipo de Diagrama" value={s.dsc_tpdocumento || "—"} />
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
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Motivo de Revisão</h4>
                <p className="text-sm whitespace-pre-wrap">{s.dsc_motivorevisao || "—"}</p>
              </div>
              <div className="border rounded-md p-3 space-y-2">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Obs. ONS</h4>
                  <p className="text-sm whitespace-pre-wrap">{s.obs_ons || "—"}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Obs. Agente</h4>
                  <p className="text-sm whitespace-pre-wrap">{s.obs_agente || "—"}</p>
                </div>
              </div>
            </section>

            {/* Comentários */}
            <section>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><MessageSquare className="size-4" /> Observações (autores e mensagens)</h3>
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
