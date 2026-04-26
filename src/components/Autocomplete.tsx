import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
  hint?: string;
}

interface Props {
  value?: string;
  options: Option[];
  placeholder?: string;
  onChange: (value: string | undefined) => void;
  minChars?: number;
  maxResults?: number;
}

export function Autocomplete({ value, options, placeholder, onChange, minChars = 3, maxResults = 50 }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Sync query with selected value label
  useEffect(() => {
    if (!value) { setQuery(""); return; }
    const selected = options.find((o) => o.value === value);
    if (selected) setQuery(selected.label);
  }, [value, options]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const showSuggestions = open && query.trim().length >= minChars;
  const q = query.trim().toLowerCase();
  const matches = showSuggestions
    ? options.filter((o) => o.label.toLowerCase().includes(q) || (o.hint?.toLowerCase().includes(q)))
        .slice(0, maxResults)
    : [];

  function clear() {
    setQuery("");
    onChange(undefined);
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Input
          value={query}
          placeholder={placeholder || `Digite ${minChars}+ caracteres…`}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onChange(undefined);
          }}
          onFocus={() => setOpen(true)}
          className={cn(value && "pr-8")}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="size-3" />
          </Button>
        )}
      </div>
      {showSuggestions && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover shadow-md">
          {matches.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma correspondência</div>
          ) : (
            matches.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  onChange(m.value);
                  setQuery(m.label);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex justify-between gap-2"
              >
                <span className="truncate">{m.label}</span>
                {m.hint && <span className="text-xs text-muted-foreground shrink-0">{m.hint}</span>}
              </button>
            ))
          )}
          {matches.length === maxResults && (
            <div className="px-3 py-1.5 text-xs text-muted-foreground border-t">Refine a busca para ver mais…</div>
          )}
        </div>
      )}
    </div>
  );
}
