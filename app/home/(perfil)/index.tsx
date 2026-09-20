import React, { useContext, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { Top_Bar } from "../../../src/components/topBar";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { Perfil_Styles } from "../../../src/styles/perfilStyles";
import { AuthContext } from "../../../src/contexts/AuthContext";
import { useRouter } from "expo-router";
import { useTheme } from "../../../src/contexts/ThemeContext";
import { COLORS } from "@/src/theme/colors";


export default function Perfil() {
    const { theme } = useTheme();
    const styles = Perfil_Styles(theme);
    const router = useRouter();
    const { signOut, user } = useContext(AuthContext);
    const { darkMode, toggleTheme } = useTheme();
    const [notificacoes, setNotificacoes] = useState(true);
    async function handleLogout() {
        await signOut();
    }

    return (
        <View style={styles.container}>
            <Top_Bar />
            <ScrollView contentContainerStyle={styles.content}>
                {/* Cabeçalho */}
                <View style={styles.header}>
                    <Text style={styles.title}>{user?.nome || "Usuário"}</Text>
                    {user?.nascimento && (
                        <Text style={styles.subText}>
                            Nascimento: {new Date(user.nascimento).toLocaleDateString('pt-BR')}
                        </Text>
                    )}
                    {user?.unidade && (
                        <Text style={styles.subText}>Unidade: {user.unidade}</Text>
                    )}
                </View>

                {/* Informações Pessoais */}
                <Card titulo="Informações Pessoais">
                    <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => router.push('/home/(perfil)/dadosPessoais')}>
                        <View style={styles.menuLeft}>
                            <FontAwesome5 name="user" size={20} color={theme.primary} />
                            <Text style={styles.menuText}>Dados Pessoais</Text>
                        </View>
                        <FontAwesome5 name="chevron-right" size={16} color={theme.placeholder} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} activeOpacity={0.7} onPress={() => router.push('/home/(perfil)/endereco')}>
                        <View style={styles.menuLeft}>
                            <FontAwesome5 name="map-marker-alt" size={20} color={theme.primary} />
                            <Text style={styles.menuText}>Endereço</Text>
                        </View>
                        <FontAwesome5 name="chevron-right" size={16} color={theme.placeholder} />
                    </TouchableOpacity>

                    {/* <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} activeOpacity={0.7}>
                        <View style={styles.menuLeft}>
                            <FontAwesome5 name="phone" size={19} color={theme.primary} />
                            <Text style={styles.menuText}>Contato</Text>
                        </View>
                        <FontAwesome5 name="chevron-right" size={16} color={theme.placeholder} />
                    </TouchableOpacity> */}
                </Card>

                {/* Preferências */}
                <Card titulo="Preferências">
                    <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
                        <View style={styles.menuLeft}>
                            <FontAwesome5 name="language" size={19} color={theme.primary} />
                            <Text style={styles.menuText}>Idioma</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Text style={{ color: theme.placeholder, marginRight: 6 }}>Português</Text>
                            <FontAwesome5 name="chevron-right" size={16} color={theme.placeholder} />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.menuItem}>
                        <View style={styles.menuLeft}>
                            <FontAwesome5 name="bell" size={20} color={theme.primary} />
                            <Text style={styles.menuText}>Notificações</Text>
                        </View>
                        <Switch
                            value={notificacoes}
                            onValueChange={setNotificacoes}
                            trackColor={{ true: theme.primary }}
                        />
                    </View>

                    <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                        <View style={styles.menuLeft}>
                            <FontAwesome5 name="moon" size={20} color={theme.primary} />
                            <Text style={styles.menuText}>Tema Escuro</Text>
                        </View>
                        <Switch
                            value={darkMode}
                            onValueChange={toggleTheme}
                            trackColor={{ true: theme.primary }}
                        />
                    </View>
                </Card>

                {/* Segurança */}
                <Card titulo="Segurança">
                    <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} activeOpacity={0.7} onPress={() => router.push('/recuperarSenha/recuperar')}>
                        <View style={styles.menuLeft}>
                            <FontAwesome5 name="lock" size={20} color={theme.primary} />
                            <Text style={styles.menuText}>Alterar Senha</Text>
                        </View>
                        <FontAwesome5 name="chevron-right" size={16} color={theme.placeholder} />
                    </TouchableOpacity>

                    {/* <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} activeOpacity={0.7}>
                        <View style={styles.menuLeft}>
                            <FontAwesome5 name="shield-alt" size={20} color={theme.primary} />
                            <Text style={styles.menuText}>Privacidade</Text>
                        </View>
                        <FontAwesome5 name="chevron-right" size={16} color={theme.placeholder} />
                    </TouchableOpacity> */}
                </Card>

                {/* Ajuda e Suporte */}
                <Card titulo="Ajuda e Suporte">
                    <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => router.push('/home/(perfil)/centralAjuda')}>
                        <View style={styles.menuLeft}>
                            <FontAwesome5 name="question-circle" size={20} color={theme.primary} />
                            <Text style={styles.menuText}>Central de Ajuda</Text>
                        </View>
                        <FontAwesome5 name="chevron-right" size={16} color={theme.placeholder} />
                    </TouchableOpacity>

                    {/*   <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
                        <View style={styles.menuLeft}>
                            <FontAwesome5 name="comments" size={20} color={theme.primary} />
                            <Text style={styles.menuText}>Fale Conosco</Text>
                        </View>
                        <FontAwesome5 name="chevron-right" size={16} color={theme.placeholder} />
                    </TouchableOpacity> */}

                    <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} activeOpacity={0.7} onPress={() => router.push('/home/(perfil)/sobreApp')}>
                        <View style={styles.menuLeft}>
                            <FontAwesome5 name="info-circle" size={20} color={theme.primary} />
                            <Text style={styles.menuText}>Sobre o Aplicativo</Text>
                        </View>
                        <FontAwesome5 name="chevron-right" size={16} color={theme.placeholder} />
                    </TouchableOpacity>
                </Card>

                {/* Botão Sair */}
                <TouchableOpacity style={styles.sair} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={22} color={COLORS.branco} style={{ marginRight: 8 }} />
                    <Text style={styles.sairText}>Sair da conta</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    const { theme } = useTheme();
    const styles = Perfil_Styles(theme);
    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>{titulo}</Text>
            {children}
        </View>
    );
}