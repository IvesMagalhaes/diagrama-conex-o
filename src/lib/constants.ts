export const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: "Em Análise", color: "bg-status-analise text-status-analise-foreground" },
  2: { label: "De Acordo", color: "bg-status-acordo text-status-acordo-foreground" },
  3: { label: "Pendência", color: "bg-status-pendencia text-status-pendencia-foreground" },
  4: { label: "Excluído", color: "bg-status-excluido text-status-excluido-foreground" },
  5: { label: "Solicitado", color: "bg-status-solicitado text-status-solicitado-foreground" },
  8: { label: "Distribuído", color: "bg-status-distribuido text-status-distribuido-foreground" },
  9: { label: "Arquivado", color: "bg-status-arquivado text-status-arquivado-foreground" },
};

export const TPDOC_MAP: Record<number, { label: string; deprecated?: boolean }> = {
  1: { label: "Operacional" },
  2: { label: "Pre-Operacional" },
  3: { label: "Área do Agente", deprecated: true },
  4: { label: "Fora da Supervisão", deprecated: true },
};

export const STATUS_OPTIONS = Object.entries(STATUS_MAP).map(([id, v]) => ({ id: Number(id), label: v.label }));
export const TPDOC_OPTIONS = Object.entries(TPDOC_MAP).map(([id, v]) => ({ id: Number(id), label: v.label, deprecated: v.deprecated }));
