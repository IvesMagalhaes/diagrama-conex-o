import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Database, Loader2, ShieldCheck } from "lucide-react";

export default function Login({ onConnected }: { onConnected: () => void }) {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("1433");
  const [database, setDatabase] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [encrypt, setEncrypt] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const r = await api.connect({
      host, port: Number(port), database, username, password,
      encrypt, remember,
    });
    setLoading(false);
    if (r.ok) {
      toast.success("Conectado ao SQL Server");
      onConnected();
    } else {
      toast.error("Falha ao conectar", { description: r.error });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-header)" }}>
              <Database className="text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">Diagramas Unifilares</CardTitle>
              <CardDescription>Conexão Microsoft SQL Server</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="host">Host</Label>
                <Input id="host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="prd-inst..." required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="port">Porta</Label>
                <Input id="port" value={port} onChange={(e) => setPort(e.target.value)} placeholder="2058" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="database">Database / Schema</Label>
              <Input id="database" value={database} onChange={(e) => setDatabase(e.target.value)} placeholder="INBOUND..." required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Usuário</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={encrypt} onCheckedChange={(v) => setEncrypt(!!v)} /> Encrypt (TLS)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} /> Lembrar credenciais
              </label>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Database />}
              Conectar
            </Button>
            {api.isElectron() && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center">
                <ShieldCheck className="size-3.5" /> Credenciais criptografadas localmente (safeStorage)
              </p>
            )}
            {!api.isElectron() && (
              <p className="text-xs text-muted-foreground text-center">
                Modo demo (preview web) — dados de exemplo. No executável .exe a conexão SQL é real.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
