import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Stamp, Upload, RefreshCw, Loader2, FileDown, AlertTriangle, Trash2, Image as ImageIcon, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Rnd } from "react-rnd";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

(pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = pdfWorker;

interface PageStamp {
  pageIndex: number;
  // posição em coordenadas da imagem renderizada (px)
  x: number;
  y: number;
  width: number;
  height: number;
  // dimensões da página renderizada (px) para conversão correta
  renderedWidth: number;
  renderedHeight: number;
}

interface RenderedPage {
  pageIndex: number;
  dataUrl: string;
  width: number;
  height: number;
}

const DEFAULT_W = 180;
const DEFAULT_H = 90;

export default function CarimboModal({ onClose, onStamped }: { onClose: () => void; onStamped?: () => void }) {
  const [stampDataUrl, setStampDataUrl] = useState<string | null>(null);
  const [stampLoading, setStampLoading] = useState(true);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [stamps, setStamps] = useState<Record<number, PageStamp>>({});
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // carrega carimbo persistido
  useEffect(() => {
    api.stampLoad().then((r) => {
      if (r.ok && r.exists && r.dataUrl) setStampDataUrl(r.dataUrl);
      setStampLoading(false);
    });
  }, []);

  function handleStampFile(file: File) {
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      toast.error("Use uma imagem PNG ou JPEG.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const r = await api.stampSave({ dataUrl, name: file.name });
      if (r.ok) {
        setStampDataUrl(dataUrl);
        toast.success("Carimbo salvo.");
      } else {
        toast.error("Erro ao salvar carimbo", { description: r.error });
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleClearStamp() {
    await api.stampClear();
    setStampDataUrl(null);
    toast.success("Carimbo removido. Selecione uma nova imagem.");
  }

  async function loadPdf(file: File) {
    setPdfLoading(true);
    setPages([]);
    setStamps({});
    setPdfFile(file);
    try {
      const buf = await file.arrayBuffer();
      setPdfBytes(buf);
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) });
      const pdf = await loadingTask.promise;
      const out: RenderedPage[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        out.push({
          pageIndex: i - 1,
          dataUrl: canvas.toDataURL("image/png"),
          width: viewport.width,
          height: viewport.height,
        });
      }
      setPages(out);
    } catch (err) {
      toast.error("Erro ao abrir o PDF", { description: (err as Error).message });
      setPdfFile(null);
    } finally {
      setPdfLoading(false);
    }
  }

  function handlePdfDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast.error("Envie um arquivo PDF.");
      return;
    }
    loadPdf(f);
  }

  // Coloca/move o carimbo na página clicada
  function handlePageClick(e: React.MouseEvent<HTMLDivElement>, page: RenderedPage) {
    if (!stampDataUrl) return;
    const target = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - target.left - DEFAULT_W / 2;
    const y = e.clientY - target.top - DEFAULT_H / 2;
    setStamps((prev) => ({
      ...prev,
      [page.pageIndex]: {
        pageIndex: page.pageIndex,
        x: Math.max(0, Math.min(target.width - DEFAULT_W, x)),
        y: Math.max(0, Math.min(target.height - DEFAULT_H, y)),
        width: prev[page.pageIndex]?.width ?? DEFAULT_W,
        height: prev[page.pageIndex]?.height ?? DEFAULT_H,
        renderedWidth: target.width,
        renderedHeight: target.height,
      },
    }));
  }

  function removeStamp(pageIndex: number) {
    setStamps((prev) => {
      const n = { ...prev };
      delete n[pageIndex];
      return n;
    });
  }

  const stampedCount = Object.keys(stamps).length;
  const allStamped = pages.length > 0 && stampedCount === pages.length;

  function tryConfirm() {
    if (!pdfBytes || !stampDataUrl) return;
    if (stampedCount === 0) {
      toast.error("Posicione o carimbo em pelo menos uma página clicando na página.");
      return;
    }
    setConfirming(true);
  }

  async function generateStampedPdf() {
    if (!pdfBytes || !stampDataUrl || !pdfFile) return;
    setSaving(true);
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes.slice(0));
      const stampBytes = await fetch(stampDataUrl).then((r) => r.arrayBuffer());
      const isPng = stampDataUrl.startsWith("data:image/png");
      const embedded = isPng ? await pdfDoc.embedPng(stampBytes) : await pdfDoc.embedJpg(stampBytes);

      const docPages = pdfDoc.getPages();
      for (const s of Object.values(stamps)) {
        const page = docPages[s.pageIndex];
        const pw = page.getWidth();
        const ph = page.getHeight();
        // converter px -> pontos PDF
        const sx = pw / s.renderedWidth;
        const sy = ph / s.renderedHeight;
        const w = s.width * sx;
        const h = s.height * sy;
        const x = s.x * sx;
        // PDF tem origem no canto inferior esquerdo
        const y = ph - (s.y * sy) - h;
        page.drawImage(embedded, { x, y, width: w, height: h });
      }
      const out = await pdfDoc.save();
      const blob = new Blob([out as BlobPart], { type: "application/pdf" });
      const baseName = pdfFile.name.replace(/\.pdf$/i, "");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseName}_carimbado.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF carimbado gerado.", { description: `${baseName}_carimbado.pdf` });
      setConfirming(false);
      onStamped?.();
      onClose();
    } catch (err) {
      toast.error("Erro ao gerar PDF", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const headerInfo = useMemo(() => {
    if (!pages.length) return "";
    return `${stampedCount} de ${pages.length} página${pages.length > 1 ? "s" : ""} carimbada${stampedCount === 1 ? "" : "s"}`;
  }, [pages.length, stampedCount]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stamp className="size-5" /> Carimbo ONS
          </DialogTitle>
        </DialogHeader>

        {/* Bloco 1: carimbo persistido */}
        <div className="border rounded-md p-3 bg-muted/30 space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <ImageIcon className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sua assinatura/carimbo</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={stampInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleStampFile(f);
                  e.currentTarget.value = "";
                }}
              />
              <Button size="sm" variant="outline" onClick={() => stampInputRef.current?.click()}>
                <RefreshCw className="size-3.5" /> {stampDataUrl ? "Trocar imagem" : "Selecionar imagem"}
              </Button>
              {stampDataUrl && (
                <Button size="sm" variant="ghost" onClick={handleClearStamp}>
                  <Trash2 className="size-3.5" /> Remover
                </Button>
              )}
            </div>
          </div>
          {stampLoading ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" /> Carregando…</p>
          ) : stampDataUrl ? (
            <div className="flex items-center gap-3">
              <img src={stampDataUrl} alt="Carimbo" className="max-h-20 border rounded bg-white p-1" />
              <p className="text-xs text-muted-foreground">Esta imagem será usada como carimbo. Pode ser trocada a qualquer momento.</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum carimbo cadastrado. Selecione uma imagem PNG ou JPEG (ex.: assinatura digitalizada).</p>
          )}
        </div>

        {/* Bloco 2: PDF */}
        {!pdfFile ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handlePdfDrop}
            className={`mt-3 border-2 border-dashed rounded-md p-8 text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border"}`}
          >
            <Upload className="size-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Arraste o diagrama em PDF aqui</p>
            <p className="text-xs text-muted-foreground mb-3">ou</p>
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) loadPdf(f);
                e.currentTarget.value = "";
              }}
            />
            <Button size="sm" onClick={() => pdfInputRef.current?.click()} disabled={!stampDataUrl}>
              Selecionar PDF
            </Button>
            {!stampDataUrl && <p className="text-xs text-muted-foreground mt-2">Cadastre o carimbo antes de carregar o PDF.</p>}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm">
                <span className="font-medium">{pdfFile.name}</span>
                {headerInfo && <span className="text-muted-foreground ml-2">· {headerInfo}</span>}
              </div>
              <Button size="sm" variant="outline" onClick={() => { setPdfFile(null); setPages([]); setPdfBytes(null); setStamps({}); }}>
                Trocar PDF
              </Button>
            </div>

            {pdfLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Clique na página para colocar o carimbo (1 por página). Arraste para mover, use os cantos para redimensionar.
                </p>
                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                  {pages.map((p) => {
                    const s = stamps[p.pageIndex];
                    return (
                      <div key={p.pageIndex} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">Página {p.pageIndex + 1}</span>
                          {s ? (
                            <button onClick={() => removeStamp(p.pageIndex)} className="text-rose-600 hover:underline inline-flex items-center gap-1">
                              <Trash2 className="size-3" /> Remover carimbo
                            </button>
                          ) : (
                            <span className="text-muted-foreground">Sem carimbo</span>
                          )}
                        </div>
                        <div
                          className="relative border rounded-md overflow-hidden cursor-crosshair bg-white"
                          style={{ width: "100%", maxWidth: 800 }}
                          onClick={(e) => {
                            // ignora clique se veio do Rnd (carimbo)
                            if ((e.target as HTMLElement).closest(".pdf-stamp-rnd")) return;
                            handlePageClick(e, p);
                          }}
                        >
                          <img src={p.dataUrl} alt={`Página ${p.pageIndex + 1}`} className="block w-full h-auto select-none" draggable={false} />
                          {s && stampDataUrl && (
                            <Rnd
                              className="pdf-stamp-rnd"
                              size={{ width: s.width, height: s.height }}
                              position={{ x: s.x, y: s.y }}
                              bounds="parent"
                              lockAspectRatio
                              onDragStop={(_e, d) => {
                                setStamps((prev) => ({ ...prev, [p.pageIndex]: { ...prev[p.pageIndex], x: d.x, y: d.y } }));
                              }}
                              onResizeStop={(_e, _dir, ref, _delta, position) => {
                                setStamps((prev) => ({
                                  ...prev,
                                  [p.pageIndex]: {
                                    ...prev[p.pageIndex],
                                    width: parseFloat(ref.style.width),
                                    height: parseFloat(ref.style.height),
                                    x: position.x,
                                    y: position.y,
                                  },
                                }));
                              }}
                            >
                              <img src={stampDataUrl} alt="Carimbo" className="w-full h-full pointer-events-none border border-primary/40" draggable={false} />
                            </Rnd>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Aviso páginas faltantes */}
        {pages.length > 0 && !allStamped && stampedCount > 0 && (
          <div className="flex items-start gap-2 p-2 mt-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Você ainda não carimbou {pages.length - stampedCount} página(s). Carimbe todas antes de prosseguir.</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={tryConfirm} disabled={!pdfFile || !stampDataUrl || pdfLoading || stampedCount === 0}>
            <FileDown className="size-4" /> Gerar PDF carimbado
          </Button>
        </DialogFooter>

        {/* Diálogo de confirmação */}
        <Dialog open={confirming} onOpenChange={(o) => !o && setConfirming(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar carimbos</DialogTitle>
            </DialogHeader>
            <div className="text-sm space-y-2">
              {!allStamped ? (
                <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
                  <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Atenção: <strong>{pages.length - stampedCount}</strong> página(s) ficarão sem carimbo. Deseja prosseguir mesmo assim?</span>
                </div>
              ) : (
                <p>Todas as {pages.length} página(s) estão carimbadas. Gerar o PDF carimbado?</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirming(false)}>Voltar</Button>
              <Button onClick={generateStampedPdf} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
                Confirmar e baixar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
