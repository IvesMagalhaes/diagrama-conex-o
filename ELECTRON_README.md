# Diagramas Unifilares — App Desktop (Electron + SQL Server)

App React empacotado em **Electron** (`.exe`) com conexão direta ao **Microsoft SQL Server** via driver `mssql` (TDS). Credenciais salvas localmente e criptografadas via `safeStorage` do Electron.

## Estrutura

```
electron/
  main.cjs       # Processo principal (mssql, IPC, safeStorage)
  preload.cjs    # Bridge segura (contextBridge)
src/
  components/    # Login, lista, detalhe
  lib/
    api.ts       # Detecta Electron vs preview web (mock)
    mockData.ts  # Dados de exemplo no preview Lovable
    constants.ts # Mapas STATUS / TPDOC
  types/electron.d.ts
```

## Tabelas SQL utilizadas

- `DiagramasUnifilares.tb_solicitacao` — solicitação principal
- `DiagramasUnifilares.tb_solicitacaoins` — N-N solicitação ↔ instalação
- `DiagramasUnifilares.tb_anexodiagramaunifilar` — arquivos
- `DiagramasUnifilares.tb_comentariodiagramaunifilar` — observações
- `DiagramasUnifilares.tb_tpdocumento` — descrição do tipo
- `DiagramasUnifilares.tb_tpstatussolicitacao` — descrição do status
- `DiagramasUnifilares.tb_aux_ins` — instalação (nome, CRC, instituição via `cos_id`)

Joins centrais:
```
tb_solicitacao s
  JOIN tb_solicitacaoins si ON si.id_solicitacao = s.id_solicitacao
  JOIN tb_aux_ins ai         ON ai.ins_id = si.ins_id
  JOIN tb_tpdocumento td     ON td.id_tpdocumento = s.id_tpdocumento
  JOIN tb_tpstatussolicitacao ts ON ts.id_tpstatussolicitacao = s.id_tpstatussolicitacao
```

## Rodando em desenvolvimento (no seu PC)

```bash
# 1. Instalar deps Electron + driver SQL (uma vez)
npm install --save-dev electron @electron/packager
npm install mssql

# 2. Adicionar ao package.json:
#   "main": "electron/main.cjs",
#   "scripts": {
#     "electron:dev": "VITE_DEV_SERVER_URL=http://localhost:8080 electron .",
#     "electron:build": "vite build && electron .",
#     "package:win": "vite build && electron-packager . DiagramasUnifilares --platform=win32 --arch=x64 --out=release --overwrite --ignore=^/src --ignore=^/public --ignore=^/release"
#   }

# 3. Rodar
npm run dev          # terminal 1 (Vite)
npm run electron:dev # terminal 2 (Electron aponta para o Vite)
```

## Empacotando como .exe (Windows)

```bash
npm run package:win
# Saída: release/DiagramasUnifilares-win32-x64/DiagramasUnifilares.exe
```

> O preview web no Lovable roda em **modo demo** com dados mockados (o navegador não abre TCP para SQL Server). O `.exe` Electron faz a conexão real.
