const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  loadCreds: () => ipcRenderer.invoke("creds:load"),
  clearCreds: () => ipcRenderer.invoke("creds:clear"),
  connect: (config) => ipcRenderer.invoke("sql:connect", config),
  authLogin: (payload) => ipcRenderer.invoke("auth:login", payload),
  listSolicitacoes: (filters) => ipcRenderer.invoke("sql:listSolicitacoes", filters),
  getSolicitacao: (id) => ipcRenderer.invoke("sql:getSolicitacao", id),
  listMpo: (insId) => ipcRenderer.invoke("sql:listMpo", insId),
  searchMpo: (params) => ipcRenderer.invoke("sql:searchMpo", params),
  auditoria: (params) => ipcRenderer.invoke("sql:auditoria", params),
  lookups: () => ipcRenderer.invoke("sql:lookups"),
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
  stampLoad: () => ipcRenderer.invoke("stamp:load"),
  stampSave: (payload) => ipcRenderer.invoke("stamp:save", payload),
  stampClear: () => ipcRenderer.invoke("stamp:clear"),
});
