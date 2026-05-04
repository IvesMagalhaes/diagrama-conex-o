import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import type { AppUser, SqlCreds } from "@/types/electron";
import { toast } from "sonner";
import { Database, Loader2, ShieldCheck, LogIn } from "lucide-react";

type Mode = "user" | "manual";

export default function Login({ onLogged }: { onLogged: (user: AppUser) => void }) {
  const [mode, setMode] = useState<Mode>("user");

  // Modo "user" (login/senha)
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [loadingUser, setLoadingUser] = useState(false);

  // Modo manual (fallback de conexão SQL)
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [database, setDatabase] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [encrypt, setEncrypt] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loadingManual, setLoadingManual] = useState(false);

  async function handleUserLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoadingUser(true);
    const r = await api.authLogin(login.trim());
    setLoadingUser(false);
    if (r.ok && r.user) {
      onLogged(r.user);
    } else if (r.mode === "needs-manual") {
      toast.error("Falha na conexão com o servidor", { description: "Preencha os dados de conexão manualmente." });
      setMode("manual");
    } else {
      toast.error(r.error || "Login ou senha incorretos.");
    }
  }

  async function handleManualConnect(e: React.FormEvent) {
    e.preventDefault();
    setLoadingManual(true);
    const c: SqlCreds = { host, port: Number(port), database, username, password, encrypt, remember };
    const r = await api.connect(c);
    setLoadingManual(false);
    if (!r.ok) {
      toast.error("Falha ao conectar", { description: r.error });
      return;
    }
    toast.success("Conectado ao SQL Server. Faça login.");
    setMode("user");
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
              <CardDescription>{mode === "user" ? "Acesse com seu login ONS" : "Conexão Microsoft SQL Server"}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {mode === "user" ? (
            <form onSubmit={handleUserLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="lgn">Login ou e-mail</Label>
                <Input id="lgn" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="nome.usuario  ou  nome@ons.org.br" required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pwd">Senha</Label>
                <Input id="pwd" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full" disabled={loadingUser}>
                {loadingUser ? <Loader2 className="animate-spin" /> : <LogIn />}
                Entrar
              </Button>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5" /> Conexão SQL automática
                </span>
                <button type="button" className="text-primary hover:underline" onClick={() => setMode("manual")}>
                  Conexão manual
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleManualConnect} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={loadingManual}>
                {loadingManual ? <Loader2 className="animate-spin" /> : <Database />}
                Conectar
              </Button>
              <button type="button" className="text-xs text-primary hover:underline w-full text-center" onClick={() => setMode("user")}>
                ← Voltar para login do usuário
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
