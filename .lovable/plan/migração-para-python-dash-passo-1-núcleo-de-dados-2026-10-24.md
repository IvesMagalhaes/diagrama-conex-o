# Migração para Python (Dash) — Passo 1: núcleo de dados

Vou criar 3 arquivos Python, prontos para você rodar no VS Code. Eles ficam disponíveis para download em Arquivos (pasta `python_dash/`), e eu também colo o código completo no chat. O app atual (React/Electron) não muda.

## Entregáveis

1. **requirements.txt**
   - dash, dash-bootstrap-components, pandas, plotly, pyodbc (com versões mínimas fixadas)
   - python-dotenv, para ler as credenciais de um arquivo `.env` em vez de deixá-las no código

2. **database.py** — conversão fiel das consultas do `electron/main.cjs`
   - Configuração da conexão lida do `.env` (host, porta 2058, database, usuário, senha, encrypt), usando o "ODBC Driver 17/18 for SQL Server"
   - `get_connection()` com reconexão simples e `query_df(sql, params)` que devolve um DataFrame do pandas
   - Funções equivalentes a cada consulta atual, com parâmetros `?` (sem concatenar texto):
     - `auth_login(login)`: busca em `sintegre.tb_usuario` (login, `ons\login` ou e-mail; a senha não é validada)
     - `list_solicitacoes(filters)`: filtros de status, tipo de documento, agente, instalação, sigla, CRC, datas e "minhas análises"
     - `get_solicitacao(id)`: dados da solicitação, anexos (com o prefixo de URL do SINtegre) e comentários
     - `lookups()`: listas de agentes, instalações e COS
     - `list_mpo(ins_id)`: tira os 2 primeiros caracteres (UF), aplica trim, pula a instalação temporária 999999 e filtra Vigente/Pré-Operacional + `tipodeconteudo` com Diagrama + sigla
     - `search_mpo(codigo, assunto)`: busca manual (até 200 resultados)
     - `auditoria(data_ini, data_fim)`: eventos com seus detalhes, base para as estatísticas
   - O carimbo salvo (imagem) passa a ficar numa pasta local (`load_stamp`, `save_stamp`, `clear_stamp`)

3. **app.py** — servidor Dash e a estrutura principal
   - Dash com tema Bootstrap e `suppress_callback_exceptions`
   - `dcc.Store` para guardar o usuário logado e os filtros
   - Troca de tela pelo endereço: `/login`, `/` (Solicitações) e `/estatisticas`, com telas provisórias por enquanto
   - Proteção: quem não fez login volta para `/login`
   - Barra superior com o título "Diagramas Unifilares - ONS", menu (Solicitações / Estatísticas) e botão Sair
   - Rodar com `python app.py` em http://127.0.0.1:8050

## Detalhes técnicos
- Os filtros de lista (`IN (...)`) usam placeholders gerados conforme a quantidade de itens.
- As datas são convertidas com `pd.to_datetime`.
- Não testo a conexão com o SQL Server real (ele não é acessível daqui). Só confiro se os arquivos Python compilam.
- As próximas etapas (telas de login, lista, detalhe, MPO, carimbo e estatísticas) ficam para depois.
