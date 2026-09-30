import { Stack } from "expo-router";
import React from "react";
import { PortalProvider } from "../../src/contexts/PortalContext";

// Portal da unidade (US-06): área dos servidores das UBS, separada do app do paciente.
export default function PortalLayout() {
  return (
    <PortalProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: "Portal da unidade" }} />
        <Stack.Screen name="login" options={{ title: "Portal da unidade - Entrar" }} />
      </Stack>
    </PortalProvider>
  );
}
