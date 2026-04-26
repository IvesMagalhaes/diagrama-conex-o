export interface SqlCreds {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  encrypt?: boolean;
  remember?: boolean;
}

export interface SolicitacaoRow {
  id_solicitacao: number;
  din_criacao: string;
  din_modificacao: string;
  din_revisao: string | null;
  num_revisao: string | null;
  dsc_tpdocumento: string | null;
  id_tpdocumento: number;
  dsc_statussolicitacao: string | null;
  id_tpstatussolicitacao: number;
  nom_agenteoperacao: string | null;
  cos_id: string;
  cos_nome: string | null;
  instalacao_nome: string | null;
  ins_id: string | null;
  qtd_anexos: number;
}

export interface SolicitacaoDetail {
  id_solicitacao: number;
  din_criacao: string;
  din_modificacao: string;
  din_revisao: string | null;
  num_revisao: string | null;
  nom_agenteoperacao: string | null;
  nom_criacao: string;
  nom_modificacao: string;
  mail_solicitante: string;
  obs_ons: string | null;
  obs_agente: string | null;
  dsc_motivorevisao: string | null;
  cos_id: string;
  cos_nome: string | null;
  ins_id: string | null;
  instalacao_nome: string | null;
  dsc_tpdocumento: string | null;
  id_tpdocumento: number;
  dsc_statussolicitacao: string | null;
  id_tpstatussolicitacao: number;
}

export interface Anexo {
  id_anexodiagramaunifilar: number;
  url_arquivo: string | null;
  nom_arquivo: string | null;
  din_inclusao: string | null;
}

export interface Comentario {
  id_comentariodiagramaunifilar: number;
  dsc_texto: string | null;
  nom_autor: string | null;
  din_criacao: string | null;
}

export interface MpoDocumento {
  id_documentompo: number;
  dsc_situacaodocumento: string | null;
  din_modificado: string | null;
  id_identificador: string | null;
  revisao: string | null;
  assunto: string | null;
  dsc_usuariomodificacao: string | null;
  url_editar: string | null;
  url_diagrama: string | null;
}

export interface ListFilters {
  status?: number[];
  tpdocumento?: number[];
  cosId?: string;
  insId?: string;
  sigla?: string;
  crc?: string;
  dataIni?: string;
  dataFim?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      loadCreds: () => Promise<SqlCreds | null>;
      clearCreds: () => Promise<boolean>;
      connect: (c: SqlCreds) => Promise<{ ok: boolean; error?: string }>;
      listSolicitacoes: (f: ListFilters) => Promise<{ ok: boolean; rows?: SolicitacaoRow[]; error?: string }>;
      getSolicitacao: (id: number) => Promise<{ ok: boolean; solicitacao?: SolicitacaoDetail; anexos?: Anexo[]; comentarios?: Comentario[]; error?: string }>;
      listMpo: (insId: string) => Promise<{ ok: boolean; rows?: MpoDocumento[]; error?: string }>;
      lookups: () => Promise<{ ok: boolean; instituicoes?: { nom_agenteoperacao: string }[]; instalacoes?: { ins_id: string; nomecurto: string; cos_id: string }[]; crcs?: { cos_id: string; nomecurto: string }[]; error?: string }>;
      openExternal: (url: string) => Promise<boolean>;
    };
  }
}
