import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../services/supabase";
import { ACESSO_NEGADO, MENSAGEM_PACIENTE_NO_PORTAL, PerfilServidor, buscarPerfil, sairPortal } from "../services/portal";
import { AuthContext } from "./AuthContext";

// "carregando": ainda verificando · "sem_sessao": ninguém logado · "negado": logado, mas
// não é servidor ativo (ex.: paciente) · "erro": falha de conexão · "ok": servidor ativo.
type StatusPortal = "carregando" | "sem_sessao" | "negado" | "erro" | "ok";

type PortalContextType = {
  status: StatusPortal;
  perfil: PerfilServidor | null;
  mensagem: string | null;
  recarregar: () => Promise<void>;
  sair: () => Promise<void>;
};

export const PortalContext = createContext<PortalContextType>({
  status: "carregando",
  perfil: null,
  mensagem: null,
  recarregar: async () => {},
  sair: async () => {},
});

export function PortalProvider({ children }: { children: ReactNode }) {
  // O AuthProvider do paciente restaura a sessão dele ao abrir o app; espera ele terminar
  // para não checar o perfil com a sessão errada.
  const { loading: carregandoPaciente } = useContext(AuthContext);
  const [status, setStatus] = useState<StatusPortal>("carregando");
  const [perfil, setPerfil] = useState<PerfilServidor | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setStatus("carregando");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setPerfil(null);
      setStatus("sem_sessao");
      return;
    }

    const { data, error } = await buscarPerfil();
    if (error || !data) {
      setPerfil(null);
      setMensagem(error?.code === ACESSO_NEGADO || !error
        ? MENSAGEM_PACIENTE_NO_PORTAL
        : "Não foi possível verificar seu acesso. Tente novamente.");
      setStatus(error?.code === ACESSO_NEGADO || !error ? "negado" : "erro");
      return;
    }

    setPerfil(data);
    setMensagem(null);
    setStatus("ok");
  }, []);

  useEffect(() => {
    if (!carregandoPaciente) recarregar();
  }, [carregandoPaciente, recarregar]);

  const sair = useCallback(async () => {
    await sairPortal();
    setPerfil(null);
    setStatus("sem_sessao");
  }, []);

  return (
    <PortalContext.Provider value={{ status, perfil, mensagem, recarregar, sair }}>
      {children}
    </PortalContext.Provider>
  );
}

export const usePortal = () => useContext(PortalContext);
