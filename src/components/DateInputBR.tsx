import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

// dd/mm/yyyy <-> yyyy-mm-dd
function isoToBr(iso?: string) {
  if (!iso) return "";
  const m = iso.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}
function brToIso(br: string) {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return undefined;
  const [, d, mo, y] = m;
  const dt = new Date(`${y}-${mo}-${d}T00:00:00`);
  if (isNaN(dt.getTime())) return undefined;
  return `${y}-${mo}-${d}`;
}

export function DateInputBR({ value, onChange }: { value?: string; onChange: (iso: string | undefined) => void }) {
  const [text, setText] = useState(isoToBr(value));

  useEffect(() => { setText(isoToBr(value)); }, [value]);

  function handleChange(raw: string) {
    // Auto-format digits to dd/mm/yyyy
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setText(formatted);
    if (formatted === "") { onChange(undefined); return; }
    const iso = brToIso(formatted);
    if (iso) onChange(iso);
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="dd/mm/aaaa"
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      maxLength={10}
    />
  );
}
