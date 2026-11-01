# Passo 3 — Dashboard de Estatísticas (Dash)

Vou criar a tela de Estatísticas em Python, seguindo a lógica do Statistics.tsx. Os arquivos ficam em Arquivos (`python_dash/`), e eu também colo o código completo no chat. O app React/Electron não muda.

## Entregáveis

1. **python_dash/pages/estatisticas.py**
   - **Filtros (dbc.Card)**:
     - Período: Últimos 7 dias, Últimos 15 dias, Último mês (30), Últimos 6 meses (180), Último ano (365) e Personalizado. Ao escolher um período, as datas De/Até são preenchidas sozinhas.
     - Datas De/Até no formato DD/MM/YYYY e botão "Atualizar" (consulta o banco de novo).
     - COS ONS, Instituição e Tipo de Diagrama com a opção "Todos". As opções são montadas a partir dos dados carregados.
     - Unidade (Horas, Dias, Meses, Anos) no lado esquerdo; checkboxes "Ignorar Pendências" e "Apenas Meus Resultados"; botão "Análise Copilot" desabilitado à direita; botão "Excel".
   - **Processamento em pandas** (`processar_auditoria(df)`), fiel ao original:
     - Agrupa por `id_solicitacao`, ordena por `din_evento` e separa os eventos de status (`dsc_campoalterado` contendo "status").
     - Para cada par de eventos de status seguidos, soma o tempo em `pureAnalysisMs` (novo = Em Análise) ou em `pendenciaMs` (novo = Pendência).
     - Pendência do Agente (Em Análise → Pendência) e Pendência ONS (Pendência → Em Análise): conta as ocorrências e soma o tempo até a próxima mudança.
     - `totalMs` = do primeiro ao último evento. `finalizado`, `pendente` e `deAcordo` vêm do último status (Distribuído, Pendência e De Acordo).
     - Os dados da solicitação (COS, instituição, instalação, tipo e usuário) vêm do último evento.
     - "Apenas Meus Resultados" mantém só as solicitações em que `nom_usuario` é igual ao login do usuário.
     - "Ignorar Pendências" usa `max(0, totalMs - pendenciaMs)` nos tempos de finalização.
   - **12 KPIs** (dbc.Card + Bootstrap Icons, com tooltip), na mesma ordem: Solicitações no período, Em pendência, De Acordo (não distribuídas), Finalizadas, Tempo Médio Em Análise, Tempo Médio Finalização, Tempo Máximo, Tempo Total Acumulado, Pendências do Agente, Tempo Médio Pend. Agente, Pendências ONS e Tempo Médio Pend. ONS. Os tempos aparecem na unidade escolhida.
   - **Gráficos (plotly.express em dcc.Graph)**:
     - Série temporal em linha: solicitações por dia
     - Análises por COS e Tempo médio por COS: barras horizontais
     - Por Tipo de Diagrama: pizza
     - Top Instituições, Top Instalações e Top Usuários: barras horizontais
     - Pendências por COS e por Instituição (Top 12), em barras empilhadas Agente/ONS, nas mesmas cores do original (agente e ONS invertidos, como você pediu antes), além do tempo de pendência por COS e por Instituição
   - **Excel**: `dcc.Download` com `to_excel`, exportando só a aba "Auditoria" com os dados brutos do SQL do período (openpyxl).
   - Os dados brutos ficam num `dcc.Store`. Os filtros locais recalculam a tela sem consultar o banco de novo. Erros aparecem num alerta.

2. **Alterações no app.py** (diff no chat e cópia atualizada):
   - `from pages import estatisticas`
   - Rota `/estatisticas`: trocar `placeholder("Estatísticas")` por `estatisticas.layout(user)`.
   - Incluir o CSS do Bootstrap Icons em `external_stylesheets` (`dbc.icons.BOOTSTRAP`).

3. **requirements.txt**: adicionar `openpyxl`, que o `to_excel` precisa.

## Detalhes técnicos
- Os callbacks são registrados com `dash.callback`, no mesmo padrão do Passo 2.
- Os tempos são calculados em milissegundos e convertidos por unidade: hora = 3,6e6 ms, dia = 8,64e7 ms, mês = 30 dias e ano = 365 dias.
- Validação: compilar com `py_compile` e rodar `processar_auditoria` e os gráficos com dados de auditoria de exemplo (banco simulado). Não testo com o SQL Server real.
