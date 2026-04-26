import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function handle() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copiado para a área de transferência");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handle}
      className="h-6 w-6 p-0"
      title={label}
      aria-label={label}
    >
      {copied ? <Check className="size-3.5 text-status-deacordo" /> : <Copy className="size-3.5" />}
    </Button>
  );
}
