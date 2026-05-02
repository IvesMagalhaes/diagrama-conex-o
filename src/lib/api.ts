import { useEffect, useState } from "react";
import type { SqlCreds, ListFilters } from "@/types/electron";
import { mockListSolicitacoes, mockGetSolicitacao, mockLookups, mockConnect, mockListMpo } from "./mockData";

const isElectron = () => typeof window !== "undefined" && !!window.electronAPI?.isElectron;

export const api = {
  isElectron,
  async loadCreds(): Promise<SqlCreds | null> {
    if (isElectron()) return window.electronAPI!.loadCreds();
    const raw = localStorage.getItem("sql-creds-demo");
    return raw ? JSON.parse(raw) : null;
  },
  async clearCreds() {
    if (isElectron()) return window.electronAPI!.clearCreds();
    localStorage.removeItem("sql-creds-demo");
    localStorage.removeItem("sql-connected");
    return true;
  },
  async connect(c: SqlCreds) {
    if (isElectron()) return window.electronAPI!.connect(c);
    if (c.remember) localStorage.setItem("sql-creds-demo", JSON.stringify(c));
    localStorage.setItem("sql-connected", "1");
    return mockConnect(c);
  },
  async listSolicitacoes(f: ListFilters) {
    if (isElectron()) return window.electronAPI!.listSolicitacoes(f);
    return mockListSolicitacoes(f);
  },
  async getSolicitacao(id: number) {
    if (isElectron()) return window.electronAPI!.getSolicitacao(id);
    return mockGetSolicitacao(id);
  },
  async listMpo(insId: string) {
    if (isElectron()) return window.electronAPI!.listMpo(insId);
    return mockListMpo(insId);
  },
  async searchMpo(params: { codigo?: string; assunto?: string }) {
    if (isElectron() && window.electronAPI!.searchMpo) return window.electronAPI!.searchMpo(params);
    // Fallback no navegador: reaproveita o mock para devolver algo
    return { ok: true as const, rows: [] };
  },
  async auditoria(params: { dataIni?: string; dataFim?: string }) {
    if (isElectron() && window.electronAPI!.auditoria) return window.electronAPI!.auditoria(params);
    return { ok: true as const, rows: [] };
  },
  async lookups() {
    if (isElectron()) return window.electronAPI!.lookups();
    return mockLookups();
  },
  async openExternal(url: string) {
    if (isElectron()) return window.electronAPI!.openExternal(url);
    window.open(url, "_blank", "noopener");
    return true;
  },
  async stampLoad() {
    if (isElectron()) return window.electronAPI!.stampLoad();
    const dataUrl = localStorage.getItem("carimbo-ons-dataurl");
    const name = localStorage.getItem("carimbo-ons-name") || "carimbo";
    if (!dataUrl) return { ok: true as const, exists: false };
    const mime = (dataUrl.match(/^data:(image\/[a-z]+);/) || [])[1] || "image/png";
    return { ok: true as const, exists: true, dataUrl, mime, name };
  },
  async stampSave(payload: { dataUrl: string; name?: string }) {
    if (isElectron()) return window.electronAPI!.stampSave(payload);
    localStorage.setItem("carimbo-ons-dataurl", payload.dataUrl);
    if (payload.name) localStorage.setItem("carimbo-ons-name", payload.name);
    return { ok: true as const };
  },
  async stampClear() {
    if (isElectron()) return window.electronAPI!.stampClear();
    localStorage.removeItem("carimbo-ons-dataurl");
    localStorage.removeItem("carimbo-ons-name");
    return { ok: true as const };
  },
};

export function useConnected() {
  const [connected, setConnected] = useState<boolean>(() =>
    isElectron() ? false : localStorage.getItem("sql-connected") === "1"
  );
  useEffect(() => {
    if (isElectron()) {
      api.loadCreds().then((c) => {
        if (c) api.connect(c).then((r) => setConnected(!!r.ok));
      });
    }
  }, []);
  return [connected, setConnected] as const;
}
