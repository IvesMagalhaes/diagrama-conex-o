import type { SqlCreds, ListFilters, SolicitacaoRow, SolicitacaoDetail, Anexo, Comentario } from "@/types/electron";

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

interface Sample extends SolicitacaoRow {
  _detail: SolicitacaoDetail;
  _anexos: Anexo[];
  _coments: Comentario[];
}

const SAMPLE: Sample[] = [
  { id_solicitacao: 1001, din_criacao: daysAgo(30), din_modificacao: daysAgo(2), din_revisao: daysAgo(5), num_revisao: "R03", dsc_tpdocumento: "Operacional", id_tpdocumento: 1, dsc_statussolicitacao: "Em Análise", id_tpstatussolicitacao: 1, nom_agenteoperacao: "ELETROBRAS FURNAS", cos_id: "FUR ", instalacao_nome: "SE Adrianópolis 500kV", cod_crc: "CRC-SE", ins_id: "ADR1", qtd_anexos: 2, _detail: {} as SolicitacaoDetail, _anexos: [], _coments: [] },
  { id_solicitacao: 1002, din_criacao: daysAgo(60), din_modificacao: daysAgo(8), din_revisao: daysAgo(8), num_revisao: "R01", dsc_tpdocumento: "Pre-Operacional", id_tpdocumento: 2, dsc_statussolicitacao: "De Acordo", id_tpstatussolicitacao: 2, nom_agenteoperacao: "CTEEP", cos_id: "CTE ", instalacao_nome: "SE Bauru 440kV", cod_crc: "CRC-SP", ins_id: "BAU1", qtd_anexos: 3, _detail: {} as SolicitacaoDetail, _anexos: [], _coments: [] },
  { id_solicitacao: 1003, din_criacao: daysAgo(15), din_modificacao: daysAgo(1), din_revisao: null, num_revisao: null, dsc_tpdocumento: "Operacional", id_tpdocumento: 1, dsc_statussolicitacao: "Pendência", id_tpstatussolicitacao: 3, nom_agenteoperacao: "CHESF", cos_id: "CHE ", instalacao_nome: "SE Sobradinho 500kV", cod_crc: "CRC-NE", ins_id: "SOB1", qtd_anexos: 1, _detail: {} as SolicitacaoDetail, _anexos: [], _coments: [] },
  { id_solicitacao: 1004, din_criacao: daysAgo(120), din_modificacao: daysAgo(45), din_revisao: daysAgo(45), num_revisao: "R05", dsc_tpdocumento: "Operacional", id_tpdocumento: 1, dsc_statussolicitacao: "Distribuído", id_tpstatussolicitacao: 8, nom_agenteoperacao: "ELETRONORTE", cos_id: "ELN ", instalacao_nome: "SE Tucuruí 500kV", cod_crc: "CRC-N", ins_id: "TUC1", qtd_anexos: 4, _detail: {} as SolicitacaoDetail, _anexos: [], _coments: [] },
  { id_solicitacao: 1005, din_criacao: daysAgo(7), din_modificacao: daysAgo(7), din_revisao: null, num_revisao: null, dsc_tpdocumento: "Pre-Operacional", id_tpdocumento: 2, dsc_statussolicitacao: "Solicitado", id_tpstatussolicitacao: 5, nom_agenteoperacao: "ENGIE", cos_id: "ENG ", instalacao_nome: "SE Estreito 500kV (TEMPORÁRIA)", cod_crc: "CRC-S", ins_id: "EST1", qtd_anexos: 0, _detail: {} as SolicitacaoDetail, _anexos: [], _coments: [] },
  { id_solicitacao: 1006, din_criacao: daysAgo(200), din_modificacao: daysAgo(180), din_revisao: daysAgo(180), num_revisao: "R07", dsc_tpdocumento: "Operacional", id_tpdocumento: 1, dsc_statussolicitacao: "Arquivado", id_tpstatussolicitacao: 9, nom_agenteoperacao: "COPEL", cos_id: "COP ", instalacao_nome: "SE Areia 500kV", cod_crc: "CRC-S", ins_id: "ARE1", qtd_anexos: 2, _detail: {} as SolicitacaoDetail, _anexos: [], _coments: [] },
];

SAMPLE.forEach((s) => {
  s._detail = {
    id_solicitacao: s.id_solicitacao,
    din_criacao: s.din_criacao, din_modificacao: s.din_modificacao, din_revisao: s.din_revisao,
    num_revisao: s.num_revisao, nom_agenteoperacao: s.nom_agenteoperacao,
    nom_criacao: "joao.silva", nom_modificacao: "maria.santos",
    mail_solicitante: "joao.silva@" + (s.nom_agenteoperacao || "agente").toLowerCase().replace(/[^a-z]/g, "") + ".com.br",
    obs_ons: "Diagrama revisado conforme procedimentos de rede do ONS.",
    obs_agente: "Atualização de proteção da LT 500kV.",
    dsc_motivorevisao: "Inclusão de novo bay de transformação e atualização de TC/TP.",
    cos_id: s.cos_id, ins_id: s.ins_id, instalacao_nome: s.instalacao_nome, cod_crc: s.cod_crc,
    dsc_tpdocumento: s.dsc_tpdocumento, id_tpdocumento: s.id_tpdocumento,
    dsc_statussolicitacao: s.dsc_statussolicitacao, id_tpstatussolicitacao: s.id_tpstatussolicitacao,
  };
  s._anexos = Array.from({ length: s.qtd_anexos }).map((_, i) => ({
    id_anexodiagramaunifilar: s.id_solicitacao * 10 + i,
    url_arquivo: `https://example.ons.org.br/diagramas/${s.id_solicitacao}/diagrama_${i + 1}.pdf`,
    nom_arquivo: `Diagrama_${(s.instalacao_nome || "SE").split(" ")[1] || "SE"}_R${i + 1}.pdf`,
    din_inclusao: s.din_modificacao,
  }));
  s._coments = [
    { id_comentariodiagramaunifilar: s.id_solicitacao * 100 + 1, dsc_texto: "Solicito revisão do bay 04 conforme NT-001/2024.", nom_autor: "Carlos ONS", din_criacao: s.din_modificacao },
    { id_comentariodiagramaunifilar: s.id_solicitacao * 100 + 2, dsc_texto: "Revisão atendida e diagrama anexado.", nom_autor: s._detail.nom_criacao, din_criacao: s.din_modificacao },
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
  if (f.cosId) rows = rows.filter((r) => r.cos_id === f.cosId);
  if (f.insId) rows = rows.filter((r) => r.ins_id === f.insId);
  if (f.crc) rows = rows.filter((r) => r.cod_crc === f.crc);
  if (f.dataIni) rows = rows.filter((r) => new Date(r.din_modificacao) >= new Date(f.dataIni!));
  if (f.dataFim) rows = rows.filter((r) => new Date(r.din_modificacao) <= new Date(f.dataFim!));
  return { ok: true as const, rows };
}

export async function mockGetSolicitacao(id: number) {
  await new Promise((r) => setTimeout(r, 150));
  const s = SAMPLE.find((x) => x.id_solicitacao === id);
  if (!s) return { ok: false as const, error: "Não encontrada" };
  return { ok: true as const, solicitacao: s._detail, anexos: s._anexos, comentarios: s._coments };
}

export async function mockLookups() {
  const instituicoes = Array.from(new Set(SAMPLE.map((s) => s.cos_id))).map((cos_id) => ({ cos_id }));
  const instalacoes = SAMPLE.map((s) => ({ ins_id: s.ins_id!, nomecurto: s.instalacao_nome!, cos_id: s.cos_id, cod_crc: s.cod_crc! }));
  const crcs = Array.from(new Set(SAMPLE.map((s) => s.cod_crc!))).map((cod_crc) => ({ cod_crc }));
  return { ok: true as const, instituicoes, instalacoes, crcs };
}
