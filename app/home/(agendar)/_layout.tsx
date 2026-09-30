import { Stack } from "expo-router";

export default function AgendarLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="unidade" />
            <Stack.Screen name="proficional" />
            <Stack.Screen name="agendar" />
        </Stack>
    );
}
