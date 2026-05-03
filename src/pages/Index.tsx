import { useState } from "react";
import Login from "@/components/Login";
import SolicitacoesList from "@/components/SolicitacoesList";
import type { AppUser } from "@/types/electron";

const Index = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [welcoming, setWelcoming] = useState(false);

  function firstName(full: string) {
    return (full || "").trim().split(/\s+/)[0] || "Usuário";
  }

  function handleLogged(u: AppUser) {
    setUser(u);
    setWelcoming(true);
    setTimeout(() => setWelcoming(false), 1400);
  }

  if (!user) return <Login onLogged={handleLogged} />;

  return (
    <>
      {welcoming && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="text-center animate-in zoom-in-95 duration-500">
            <div className="text-3xl md:text-4xl font-semibold text-primary">
              Bem-vindo(a), {firstName(user.nom_usuario)}!
            </div>
          </div>
        </div>
      )}
      <SolicitacoesList user={user} onLogout={() => setUser(null)} />
    </>
  );
};

export default Index;
