const { app, BrowserWindow, ipcMain, safeStorage, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const sql = require("mssql");

let mainWindow;
let pool = null;
let currentConfig = null;

const credsPath = () => path.join(app.getPath("userData"), "sql-credentials.bin");

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: "Diagramas Unifilares - ONS",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (pool) pool.close().catch(() => {});
  if (process.platform !== "darwin") app.quit();
});

// ----- Credentials persistence (encrypted at rest) -----
function saveCreds(config) {
  const json = JSON.stringify(config);
  if (safeStorage.isEncryptionAvailable()) {
    const enc = safeStorage.encryptString(json);
    fs.writeFileSync(credsPath(), enc);
  } else {
    fs.writeFileSync(credsPath(), json, "utf-8");
  }
}
function loadCreds() {
  try {
    if (!fs.existsSync(credsPath())) return null;
    const buf = fs.readFileSync(credsPath());
    if (safeStorage.isEncryptionAvailable()) {
      return JSON.parse(safeStorage.decryptString(buf));
    }
    return JSON.parse(buf.toString("utf-8"));
  } catch {
    return null;
  }
}

ipcMain.handle("creds:load", () => loadCreds());
ipcMain.handle("creds:clear", () => {
  try { fs.unlinkSync(credsPath()); } catch {}
  if (pool) { pool.close().catch(() => {}); pool = null; }
  return true;
});

// ----- SQL connection -----
async function connect(config) {
  if (pool) { await pool.close().catch(() => {}); pool = null; }
  const cfg = {
    server: config.host,
    port: Number(config.port) || 1433,
    database: config.database,
    user: config.username,
    password: config.password,
    options: {
      encrypt: !!config.encrypt,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    connectionTimeout: 15000,
    requestTimeout: 30000,
  };
  pool = await sql.connect(cfg);
  currentConfig = config;
  return true;
}

ipcMain.handle("sql:connect", async (_e, config) => {
  try {
    await connect(config);
    if (config.remember) saveCreds(config);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

async function ensurePool() {
  if (pool) return pool;
  const saved = loadCreds();
  if (saved) {
    await connect(saved);
    return pool;
  }
  throw new Error("Não conectado ao SQL Server");
}

// ----- Queries -----
ipcMain.handle("sql:listSolicitacoes", async (_e, filters = {}) => {
  try {
    const p = await ensurePool();
    const req = p.request();
    let where = "s.id_tpstatussolicitacao <> 4"; // not Excluído by default unless filtered
    if (filters.status && filters.status.length) {
      where = `s.id_tpstatussolicitacao IN (${filters.status.map(Number).join(",")})`;
    }
    if (filters.tpdocumento && filters.tpdocumento.length) {
      where += ` AND s.id_tpdocumento IN (${filters.tpdocumento.map(Number).join(",")})`;
    }
    if (filters.cosId) {
      req.input("instituicao", sql.NVarChar, filters.cosId);
      where += ` AND s.nom_agenteoperacao = @instituicao`;
    }
    if (filters.insId) {
      req.input("insId", sql.Char, filters.insId);
      where += ` AND si.ins_id = @insId`;
    }
    if (filters.sigla) {
      req.input("sigla", sql.Char, filters.sigla);
      where += ` AND si.ins_id = @sigla`;
    }
    if (filters.crc) {
      req.input("crc", sql.Char, filters.crc);
      where += ` AND s.cos_id = @crc`;
    }
    if (filters.dataIni) {
      req.input("dataIni", sql.DateTime, new Date(filters.dataIni));
      where += ` AND s.din_modificacao >= @dataIni`;
    }
    if (filters.dataFim) {
      req.input("dataFim", sql.DateTime, new Date(filters.dataFim));
      where += ` AND s.din_modificacao <= @dataFim`;
    }

    const query = `
      SELECT
        s.id_solicitacao,
        s.din_criacao, s.din_modificacao, s.din_revisao,
        s.num_revisao,
        td.dsc_tpdocumento, s.id_tpdocumento,
        ts.dsc_statussolicitacao, s.id_tpstatussolicitacao,
        s.nom_agenteoperacao,
        s.cos_id,
        ac.nomecurto AS cos_nome,
        ai.nomecurto AS instalacao_nome,
        si.ins_id,
        (SELECT COUNT(*) FROM DiagramasUnifilares.tb_anexodiagramaunifilar a WHERE a.id_solicitacao = s.id_solicitacao) AS qtd_anexos
      FROM DiagramasUnifilares.tb_solicitacao s
      LEFT JOIN DiagramasUnifilares.tb_tpdocumento td ON td.id_tpdocumento = s.id_tpdocumento
      LEFT JOIN DiagramasUnifilares.tb_tpstatussolicitacao ts ON ts.id_tpstatussolicitacao = s.id_tpstatussolicitacao
      LEFT JOIN DiagramasUnifilares.tb_solicitacaoins si ON si.id_solicitacao = s.id_solicitacao
      LEFT JOIN DiagramasUnifilares.tb_aux_ins ai ON ai.ins_id = si.ins_id
      LEFT JOIN DiagramasUnifilares.tb_aux_cos ac ON ac.cos_id = s.cos_id
      WHERE ${where}
      ORDER BY s.din_modificacao DESC
    `;
    const r = await req.query(query);
    return { ok: true, rows: r.recordset };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("sql:getSolicitacao", async (_e, id) => {
  try {
    const p = await ensurePool();
    const req = p.request().input("id", sql.Int, id);
    const main = await req.query(`
      SELECT s.*, td.dsc_tpdocumento, ts.dsc_statussolicitacao,
        ai.nomecurto AS instalacao_nome, si.ins_id,
        ac.nomecurto AS cos_nome
      FROM DiagramasUnifilares.tb_solicitacao s
      LEFT JOIN DiagramasUnifilares.tb_tpdocumento td ON td.id_tpdocumento = s.id_tpdocumento
      LEFT JOIN DiagramasUnifilares.tb_tpstatussolicitacao ts ON ts.id_tpstatussolicitacao = s.id_tpstatussolicitacao
      LEFT JOIN DiagramasUnifilares.tb_solicitacaoins si ON si.id_solicitacao = s.id_solicitacao
      LEFT JOIN DiagramasUnifilares.tb_aux_ins ai ON ai.ins_id = si.ins_id
      LEFT JOIN DiagramasUnifilares.tb_aux_cos ac ON ac.cos_id = s.cos_id
      WHERE s.id_solicitacao = @id
    `);
    const anexos = await p.request().input("id", sql.Int, id).query(`
      SELECT id_anexodiagramaunifilar,
        CASE
          WHEN url_arquivo IS NULL THEN NULL
          WHEN url_arquivo LIKE 'http%' THEN url_arquivo
          ELSE 'https://sintegre.ons.org.br' + url_arquivo
        END AS url_arquivo,
        nom_arquivo, din_inclusao
      FROM DiagramasUnifilares.tb_anexodiagramaunifilar
      WHERE id_solicitacao = @id
      ORDER BY din_inclusao DESC
    `);
    const coments = await p.request().input("id", sql.Int, id).query(`
      SELECT id_comentariodiagramaunifilar, dsc_texto, nom_autor, din_criacao
      FROM DiagramasUnifilares.tb_comentariodiagramaunifilar
      WHERE id_solicitacao = @id
      ORDER BY din_criacao ASC
    `);
    return { ok: true, solicitacao: main.recordset[0], anexos: anexos.recordset, comentarios: coments.recordset };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("sql:lookups", async () => {
  try {
    const p = await ensurePool();
    const inst = await p.request().query(`SELECT DISTINCT nom_agenteoperacao FROM DiagramasUnifilares.tb_solicitacao WHERE nom_agenteoperacao IS NOT NULL ORDER BY nom_agenteoperacao`);
    const instal = await p.request().query(`SELECT ins_id, nomecurto, cos_id FROM DiagramasUnifilares.tb_aux_ins ORDER BY nomecurto`);
    const cos = await p.request().query(`SELECT cos_id, nomecurto FROM DiagramasUnifilares.tb_aux_cos ORDER BY nomecurto`);
    return { ok: true, instituicoes: inst.recordset, instalacoes: instal.recordset, crcs: cos.recordset };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("sql:listMpo", async (_e, insId) => {
  try {
    const p = await ensurePool();
    if (!insId || typeof insId !== "string") return { ok: true, rows: [] };
    const trimmed = insId.trim();
    // Skip MPO lookup for "Instalação Temporária" (ins_id = 999999)
    if (trimmed === "999999") return { ok: true, rows: [], debug: { insId, skipped: "temporaria" } };
    // Strip first 2 chars (UF) from ins_id; sigla is the pure code (no UF, no trailing spaces)
    const sigla = trimmed.substring(2).trim();
    if (!sigla) return { ok: true, rows: [], debug: { insId, sigla } };
    // Match only entries whose dsc_nome ENDS with ".SIGLA" (the last token after the last dot).
    // Use LIKE '%.SIGLA' to anchor at the end and require the preceding dot.
    const like = `%.${sigla}`;
    const query = `
        SELECT
          COALESCE(CONVERT(NVARCHAR(128), mpo.id_lista), CONVERT(NVARCHAR(128), mpo.id_identificador), CONVERT(NVARCHAR(128), mpo.dsc_nome)) AS id_documentompo,
          mpo.dsc_situacaodocumento,
          mpo.din_modificado,
          mpo.id_identificador,
          mpo.revisao,
          mpo.assunto,
          mpo.dsc_usuariomodificacao,
          CONCAT('https://mpo.ons.org.br', mpo.caminho, '/', mpo.dsc_nome) AS url_editar,
          CONCAT('https://prd-app-nlb25.ons.org.br/OnsMpoDocumentoProviderAppWeb/?SPHostUrl=https:%2F%2Fmpo.ons.org.br&SPLanguage=pt-BR&SPClientTag=0&SPProductNumber=16.0.5483.1000&SPAppWebUrl=https:%2F%2Fapps-20e8b0d27a0094.appsecm-ons.org.br%2FOnsMpoDocumentoProviderApp&MpoApp=true#/DiagramaOperacionalForm/ConjuntoDO/', mpo.id_lista) AS url_diagrama
        FROM mpo.tb_documentosmpo AS mpo
        WHERE LTRIM(RTRIM(COALESCE(mpo.dsc_situacaodocumento, ''))) IN (N'Vigente', N'Pré-Operacional')
          AND LTRIM(RTRIM(COALESCE(mpo.tipodeconteudo, ''))) LIKE N'%Diagrama%'
          AND LTRIM(RTRIM(COALESCE(mpo.dsc_nome, ''))) LIKE @like
        ORDER BY mpo.din_modificado DESC
      `;
    const r = await p.request()
      .input("like", sql.NVarChar(100), like)
      .query(query);
    return { ok: true, rows: r.recordset, debug: { insId, sigla, like, total: r.recordset.length } };
  } catch (err) {
    console.error("[MPO] Falha ao consultar mpo.tb_documentosmpo", { insId, error: err.message });
    return { ok: false, error: `Erro ao consultar MPO: ${err.message}` };
  }
});

ipcMain.handle("sql:searchMpo", async (_e, params = {}) => {
  try {
    const p = await ensurePool();
    const codigo = (params.codigo || "").trim();
    const assunto = (params.assunto || "").trim();
    if (!codigo && !assunto) return { ok: true, rows: [] };
    const req = p.request();
    const conds = [];
    if (codigo) {
      req.input("codigo", sql.NVarChar(200), `%${codigo}%`);
      conds.push("LTRIM(RTRIM(COALESCE(mpo.id_identificador, ''))) LIKE @codigo");
    }
    if (assunto) {
      req.input("assunto", sql.NVarChar(400), `%${assunto}%`);
      conds.push("LTRIM(RTRIM(COALESCE(mpo.assunto, ''))) LIKE @assunto");
    }
    const query = `
      SELECT TOP 200
        COALESCE(CONVERT(NVARCHAR(128), mpo.id_lista), CONVERT(NVARCHAR(128), mpo.id_identificador), CONVERT(NVARCHAR(128), mpo.dsc_nome)) AS id_documentompo,
        mpo.dsc_situacaodocumento,
        mpo.din_modificado,
        mpo.id_identificador,
        mpo.revisao,
        mpo.assunto,
        mpo.dsc_usuariomodificacao,
        CONCAT('https://mpo.ons.org.br', mpo.caminho, '/', mpo.dsc_nome) AS url_editar,
        CONCAT('https://prd-app-nlb25.ons.org.br/OnsMpoDocumentoProviderAppWeb/?SPHostUrl=https:%2F%2Fmpo.ons.org.br&SPLanguage=pt-BR&SPClientTag=0&SPProductNumber=16.0.5483.1000&SPAppWebUrl=https:%2F%2Fapps-20e8b0d27a0094.appsecm-ons.org.br%2FOnsMpoDocumentoProviderApp&MpoApp=true#/DiagramaOperacionalForm/ConjuntoDO/', mpo.id_lista) AS url_diagrama
      FROM mpo.tb_documentosmpo AS mpo
      WHERE LTRIM(RTRIM(COALESCE(mpo.dsc_situacaodocumento, ''))) IN (N'Vigente', N'Pré-Operacional')
        AND LTRIM(RTRIM(COALESCE(mpo.tipodeconteudo, ''))) LIKE N'%Diagrama%'
        AND (${conds.join(" AND ")})
      ORDER BY mpo.din_modificado DESC
    `;
    const r = await req.query(query);
    return { ok: true, rows: r.recordset };
  } catch (err) {
    return { ok: false, error: `Erro ao buscar MPO: ${err.message}` };
  }
});

ipcMain.handle("shell:openExternal", async (_e, url) => {
  await shell.openExternal(url);
  return true;
});
