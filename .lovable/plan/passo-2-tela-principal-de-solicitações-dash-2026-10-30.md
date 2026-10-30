# Passo 2 — Tela principal de Solicitações (Dash)

Vou criar a tela principal em Python, igual à atual. Os arquivos ficam em Arquivos (`python_dash/`) e eu também colo o código completo no chat. O app React/Electron não muda.

## Entregáveis

1. **python_dash/pages/__init__.py** (vazio), para que `pages` funcione como pacote.
2. **python_dash/pages/solicitacoes.py**, com:
   - **Card de filtros** (dbc.Card), na mesma ordem de hoje:
     - Instituição, Sigla e Instalação: `dcc.Dropdown` com busca. As sugestões só aparecem a partir de 3 letras digitadas e mostram tudo que contém o texto (por exemplo, "FUR" encontra "ELETROBRAS FURNAS"). Elas vêm de um callback de `search_value`.
     - COS ONS: lista simples com "Todos". Ao escolher um COS, Sigla e Instalação passam a mostrar só as instalações daquele COS.
     - Tipo de Diagrama e Status: seleção múltipla. Os tipos descontinuados (Área do Agente e Fora da Supervisão) aparecem marcados como "(descontinuado)".
     - "Modificado de" e "Modificado até": `dcc.DatePickerSingle` no formato DD/MM/YYYY, em português. A data final inclui o dia inteiro, até 23:59:59.
     - Checkbox "Ver apenas as minhas análises", que já recarrega a lista. Botões "Limpar" e "Filtrar".
   - **Tabela** com `dash_table.DataTable` e paginação nativa, sem pacote extra:
     - Colunas: Criação, Modificação, Revisão, Tipo, Nº Rev., Instituição, Instalação, COS ONS, Status e Arquivos (quantidade).
     - Datas exibidas como "dd/mm/aaaa" com "HH:MM:SS" na linha de baixo.
     - Status com as mesmas cores atuais, aplicadas por `style_data_conditional`.
     - 20 linhas por página, com seletor de 20 a 120. A paginação mostra "Exibindo X–Y de N" e permite ir para a primeira e a última página e digitar a página desejada.
     - Ordenação por data de modificação, da mais recente para a mais antiga (já vem assim do SQL).
   - **Callbacks**:
     - Carregamento inicial: chama `lookups()` e guarda o resultado num `dcc.Store` local. Depois chama `list_solicitacoes({})`.
     - Filtrar, Atualizar e "Minhas análises": montam o mesmo dicionário de filtros do original (`cosId`, `crc`, `sigla`, `insId`, `tpdocumento`, `status`, `dataIni`, `dataFim` e `meuUsuario`, este último com o login do usuário salvo em `store-user`). Em seguida chamam `list_solicitacoes(filters)`, atualizam a tabela e salvam os filtros em `store-filters`.
     - Limpar: zera os filtros e recarrega a lista.
     - Erros do banco aparecem num alerta, sem derrubar a tela.
     - Clicar numa linha guarda o `id_solicitacao` num `dcc.Store` ("solicitacao-selecionada"), já preparado para o Passo 3 (detalhe). Para tipos descontinuados, aparece um aviso dbc.Toast.
   - `layout(user)` devolve a tela. Os callbacks são registrados com `dash.callback`, então não é preciso passar `app` para o módulo.

3. **Alterações exatas no app.py**, mostradas em formato diff no chat (e também aplicadas numa cópia `app.py` atualizada):
   - `from pages import solicitacoes`
   - Na função `route`, trocar `placeholder("Solicitações")` por `solicitacoes.layout(user)` nos dois retornos da rota principal.

## Detalhes técnicos
- Nenhuma função nova no `database.py`. Uso `list_solicitacoes` e `lookups` como estão, convertendo os DataFrames com `to_dict("records")`.
- Validação: compilar com `python -m py_compile` e importar o módulo com o banco substituído por uma simulação, para conferir que o layout e os callbacks são montados. Não testo com o SQL Server real.
