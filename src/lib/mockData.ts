import type { SqlCreds, ListFilters, SolicitacaoRow, SolicitacaoDetail, Anexo, Comentario, MpoDocumento } from "@/types/electron";

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

interface Sample extends SolicitacaoRow {
  _detail: SolicitacaoDetail;
  _anexos: Anexo[];
  _coments: Comentario[];
}

const SAMPLE: Sample[] = [
  { id_solicitacao: 1001, din_criacao: daysAgo(30), din_modificacao: daysAgo(2), din_revisao: daysAgo(5), num_revisao: "R03", dsc_tpdocumento: "Operacional", id_tpdocumento: 1, dsc_statussolicitacao: "Em Análise", id_tpstatussolicitacao: 1, nom_agenteoperacao: "ELETROBRAS FURNAS", cos_id: "FUR ", cos_nome: "COS-SE", instalacao_nome: "ADRIANÓPOLIS", ins_id: "ADRI ", qtd_anexos: 2, _detail: {} as SolicitacaoDetail, _anexos: [], _coments: [] },
  { id_solicitacao: 1002, din_criacao: daysAgo(60), din_modificacao: daysAgo(8), din_revisao: daysAgo(8), num_revisao: "R01", dsc_tpdocumento: "Pre-Operacional", id_tpdocumento: 2, dsc_statussolicitacao: "De Acordo", id_tpstatussolicitacao: 2, nom_agenteoperacao: "CTEEP", cos_id: "CTE ", cos_nome: "COS-SP", instalacao_nome: "BAURU", ins_id: "BAUR ", qtd_anexos: 3, _detail: {} as SolicitacaoDetail, _anexos: [], _coments: [] },
  { id_solicitacao: 1003, din_criacao: daysAgo(15), din_modificacao: daysAgo(1), din_revisao: null, num_revisao: null, dsc_tpdocumento: "Operacional", id_tpdocumento: 1, dsc_statussolicitacao: "Pendência", id_tpstatussolicitacao: 3, nom_agenteoperacao: "CHESF", cos_id: "CHE ", cos_nome: "COS-NE", instalacao_nome: "SOBRADINHO", ins_id: "SOBR ", qtd_anexos: 1, _detail: {} as SolicitacaoDetail, _anexos: [], _coments: [] },
  { id_solicitacao: 1004, din_criacao: daysAgo(120), din_modificacao: daysAgo(45), din_revisao: daysAgo(45), num_revisao: "R05", dsc_tpdocumento: "Operacional", id_tpdocumento: 1, dsc_statussolicitacao: "Distribuído", id_tpstatussolicitacao: 8, nom_agenteoperacao: "ELETRONORTE", cos_id: "ELN ", cos_nome: "COS-N", instalacao_nome: "TUCURUI", ins_id: "TUCU ", qtd_anexos: 4, _detail: {} as SolicitacaoDetail, _anexos: [], _coments: [] },
  { id_solicitacao: 1005, din_criacao: daysAgo(7), din_modificacao: daysAgo(7), din_revisao: null, num_revisao: null, dsc_tpdocumento: "Pre-Operacional", id_tpdocumento: 2, dsc_statussolicitacao: "Solicitado", id_tpstatussolicitacao: 5, nom_agenteoperacao: "ENGIE", cos_id: "ENG ", cos_nome: "COS-S", instalacao_nome: "TEMPORÁRIA", ins_id: "999999", qtd_anexos: 0, _detail: {} as SolicitacaoDetail, _anexos: [], _coments: [] },
  { id_solicitacao: 1006, din_criacao: daysAgo(200), din_modificacao: daysAgo(180), din_revisao: daysAgo(180), num_revisao: "R07", dsc_tpdocumento: "Operacional", id_tpdocumento: 1, dsc_statussolicitacao: "Arquivado", id_tpstatussolicitacao: 9, nom_agenteoperacao: "COPEL", cos_id: "COP ", cos_nome: "COS-S", instalacao_nome: "AREIA", ins_id: "AREI ", qtd_anexos: 2, _detail: {} as SolicitacaoDetail, _anexos: [], _coments: [] },
];

SAMPLE.forEach((s) => {
  s._detail = {
    id_solicitacao: s.id_solicitacao,
    din_criacao: s.din_criacao, din_modificacao: s.din_modificacao, din_revisao: s.din_revisao,
    num_revisao: s.num_revisao, nom_agenteoperacao: s.nom_agenteoperacao,
    nom_criacao: "João Silva", nom_modificacao: "Maria Santos",
    mail_solicitante: "joao.silva@" + (s.nom_agenteoperacao || "agente").toLowerCase().replace(/[^a-z]/g, "") + ".com.br",
    obs_ons: "Diagrama revisado conforme procedimentos de rede do ONS.",
    obs_agente: "Atualização de proteção da LT 500kV.",
    dsc_motivorevisao: "Inclusão de novo bay de transformação e atualização de TC/TP.",
    cos_id: s.cos_id, cos_nome: s.cos_nome, ins_id: s.ins_id, instalacao_nome: s.instalacao_nome,
    dsc_tpdocumento: s.dsc_tpdocumento, id_tpdocumento: s.id_tpdocumento,
    dsc_statussolicitacao: s.dsc_statussolicitacao, id_tpstatussolicitacao: s.id_tpstatussolicitacao,
  };
  s._anexos = Array.from({ length: s.qtd_anexos }).map((_, i) => ({
    id_anexodiagramaunifilar: s.id_solicitacao * 10 + i,
    url_arquivo: `https://sintegre.ons.org.br/sites/diagramasunifilares/DiagramasUnifilaresDocumentos/${s.id_solicitacao}/Diagrama_${s.instalacao_nome}_R${i + 1}.pdf`,
    nom_arquivo: `Diagrama_${s.instalacao_nome}_R${i + 1}.pdf`,
    din_inclusao: s.din_modificacao,
  }));
  s._coments = [
    { id_comentariodiagramaunifilar: s.id_solicitacao * 100 + 1, dsc_texto: "Solicito revisão do bay 04 conforme NT-001/2024.", nom_autor: "Carlos ONS", din_criacao: daysAgo(20) },
    { id_comentariodiagramaunifilar: s.id_solicitacao * 100 + 2, dsc_texto: "Revisão atendida e diagrama anexado.", nom_autor: s._detail.nom_criacao, din_criacao: daysAgo(2) },
  ];
});

export async function mockConnect(_c: SqlCreds): Promise<{ ok: boolean; error?: string }> {
  await new Promise((r) => setTimeout(r, 400));
  return { ok: true };
}

export async function mockListSolicitacoes(f: ListFilters): Promise<{ ok: boolean; rows?: SolicitacaoRow[]; error?: string }> {
  await new Promise((r) => setTimeout(r, 200));
  let rows: SolicitacaoRow[] = SAMPLE.map(({ _detail, _anexos, _coments, ...r }) => r);
  if (f.status?.length) rows = rows.filter((r) => f.status!.includes(r.id_tpstatussolicitacao));
  else rows = rows.filter((r) => r.id_tpstatussolicitacao !== 4);
  if (f.tpdocumento?.length) rows = rows.filter((r) => f.tpdocumento!.includes(r.id_tpdocumento));
  if (f.cosId) rows = rows.filter((r) => r.nom_agenteoperacao === f.cosId);
  if (f.insId) rows = rows.filter((r) => r.ins_id === f.insId);
  if (f.sigla) rows = rows.filter((r) => r.ins_id === f.sigla);
  if (f.crc) rows = rows.filter((r) => r.cos_id === f.crc);
  if (f.dataIni) rows = rows.filter((r) => new Date(r.din_modificacao) >= new Date(f.dataIni!));
  if (f.dataFim) rows = rows.filter((r) => new Date(r.din_modificacao) <= new Date(f.dataFim!));
  rows.sort((a, b) => new Date(b.din_modificacao).getTime() - new Date(a.din_modificacao).getTime());
  return { ok: true as const, rows };
}

export async function mockGetSolicitacao(id: number) {
  await new Promise((r) => setTimeout(r, 150));
  const s = SAMPLE.find((x) => x.id_solicitacao === id);
  if (!s) return { ok: false as const, error: "Não encontrada" };
  // ascending order (oldest first)
  const coments = [...s._coments].sort((a, b) => new Date(a.din_criacao || 0).getTime() - new Date(b.din_criacao || 0).getTime());
  return { ok: true as const, solicitacao: s._detail, anexos: s._anexos, comentarios: coments };
}

export async function mockListMpo(insId: string): Promise<{ ok: boolean; rows?: MpoDocumento[]; error?: string; debug?: Record<string, unknown> }> {
  await new Promise((r) => setTimeout(r, 150));
  const sigla = (insId || "").trim().substring(2).trim();
  if (!sigla) return { ok: true, rows: [] };
  const rows: MpoDocumento[] = [
    {
      id_documentompo: 1,
      dsc_situacaodocumento: "Vigente",
      din_modificado: daysAgo(10),
      id_identificador: `MPO.${sigla}.001`,
      revisao: "R02",
      assunto: `Manobras na instalação ${sigla}`,
      dsc_usuariomodificacao: "Operador ONS",
      url_editar: `https://mpo.ons.org.br/sites/MPO/Documentos/MPO_${sigla}_001.docx`,
      url_diagrama: `https://prd-app-nlb25.ons.org.br/OnsMpoDocumentoProviderAppWeb/?MpoApp=true#/DiagramaOperacionalForm/ConjuntoDO/${sigla}001`,
    },
    {
      id_documentompo: 2,
      dsc_situacaodocumento: "Pré-Operacional",
      din_modificado: daysAgo(40),
      id_identificador: `MPO.${sigla}.002`,
      revisao: "R01",
      assunto: `Pré-operação de novo bay ${sigla}`,
      dsc_usuariomodificacao: "Engenheiro PDR",
      url_editar: `https://mpo.ons.org.br/sites/MPO/Documentos/MPO_${sigla}_002.docx`,
      url_diagrama: `https://prd-app-nlb25.ons.org.br/OnsMpoDocumentoProviderAppWeb/?MpoApp=true#/DiagramaOperacionalForm/ConjuntoDO/${sigla}002`,
    },
  ];
  return { ok: true, rows };
}

export async function mockLookups() {
  const instituicoes = Array.from(new Set(SAMPLE.map((s) => s.nom_agenteoperacao!).filter(Boolean))).map((nom_agenteoperacao) => ({ nom_agenteoperacao }));
  const instalacoes = SAMPLE.map((s) => ({ ins_id: s.ins_id!, nomecurto: s.instalacao_nome!, cos_id: s.cos_id }));
  const crcs = Array.from(new Map(SAMPLE.map((s) => [s.cos_id, s.cos_nome!])).entries()).map(([cos_id, nomecurto]) => ({ cos_id, nomecurto }));
  return { ok: true as const, instituicoes, instalacoes, crcs };
}
