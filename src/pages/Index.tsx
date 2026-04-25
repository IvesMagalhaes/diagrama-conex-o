import { useState } from "react";
import Login from "@/components/Login";
import SolicitacoesList from "@/components/SolicitacoesList";
import { api, useConnected } from "@/lib/api";

const Index = () => {
  const [connected, setConnected] = useConnected();
  const [_, force] = useState(0);

  if (!connected) return <Login onConnected={() => setConnected(true)} />;
  return (
    <SolicitacoesList
      onLogout={async () => {
        await api.clearCreds();
        setConnected(false);
        force((n) => n + 1);
      }}
    />
  );
};

export default Index;
