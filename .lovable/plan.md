# Passo 4: Janela de Detalhes e Carimbo PDF (Dash)

Vou criar `pages/detalhes.py` e ajustar um pouco `solicitacoes.py` e `requirements.txt`. O app React/Electron continua igual.

## Entregáveis

1. **pages/detalhes.py**
   - `layout()` devolve um `dbc.Modal` (tamanho xl, com rolagem) e os `dcc.Store` dele (id aberto, PDF enviado, posições por página, rotação por página)
   - Detalhes, seguindo o `SolicitacaoDetail.tsx`:
     - Título "Solicitação #id" com o botão "Ver no SINtegre"
     - Aviso quando o tipo for Área do Agente ou Fora da Supervisão
     - Bloco do solicitante: Data de Criação, Solicitante, E-mail (link mailto com o assunto "Solicitação #id Diagrama Unifilar Tipo de Instalação" e o corpo "Prezado(a) Primeiro Último,"), Status (com a cor), Última Modificação
     - Bloco da instalação: Instituição, Sigla ("—" quando for 999999), Instalação, COS ONS, Nº Revisão, Data de Revisão, Tipo
     - MPO: usa `list_mpo(ins_id)`. Não busca quando a instalação é 999999. Se não achar nada, mostra a busca manual por Código e/ou Assunto (`search_mpo`)
     - Arquivos com o link de cada anexo, mais os botões "Carimbo ONS" e "Análise Copilot" (desabilitado)
     - Motivo de Revisão com o botão de copiar (`dcc.Clipboard`), Observação ONS e Observação Agente
     - Comentários em ordem crescente de data
   - Carimbo, em uma segunda janela:
     - Mostra o carimbo salvo (`load_stamp`) e permite trocá-lo ou remover (`save_stamp` / `clear_stamp`)
     - `dcc.Upload` para enviar o PDF. O PyMuPDF converte cada página em PNG
     - Cada página aparece num `dcc.Graph`, com a imagem como fundo e os eixos em pontos do PDF
     - Clicar na página posiciona o carimbo (`clickData`). Clicar de novo substitui a posição. Um controle deslizante muda o tamanho e mantém a proporção da imagem
     - Botões para girar a página 90°
     - Avisa quando alguma página ficou sem carimbo e pede confirmação
     - Gera o arquivo com `page.insert_image` e a rotação. O download sai como `nome_carimbado.pdf` via `dcc.Download`. Depois fecha a janela, destaca a seção MPO e mostra o aviso "Editar MPO" por 10 segundos
   - `register_callbacks(app)`, ou callbacks com `@callback`, conforme o padrão já usado em `solicitacoes.py`

2. **requirements.txt**: acrescentar `pymupdf>=1.24`. A biblioteca Pillow é opcional, só para ler o tamanho da imagem do carimbo. O PyMuPDF já faz isso, então ela não deve ser necessária.

3. **Alteração em pages/solicitacoes.py**: incluir `detalhes.layout()` no layout da página e um callback que lê o `active_cell` da tabela, pega o `id_solicitacao` da linha e abre o modal.

## Detalhes técnicos
- O PDF é guardado em base64 num `dcc.Store` (memória). As prévias das páginas são geradas em 1,5x. O clique é convertido de pixels para pontos do PDF, invertendo o eixo Y do gráfico.
- A rotação é aplicada com `page.set_rotation`. O carimbo é inserido em coordenadas já rotacionadas, usando `page.derotation_matrix`.
- Testo com um PDF de exemplo e com dados falsos no lugar do banco: confiro se o arquivo carimbado é gerado. Não testo o SQL Server real.
- Entrego o código completo no chat e os arquivos para baixar.
