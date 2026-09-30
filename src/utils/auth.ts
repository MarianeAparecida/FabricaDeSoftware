import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

const SESSION_KEY = 'supabase_session';
const USERNAME_KEY = 'username';

export async function saveSession(session: any, username?: string) {
  try {
    if (!session) return;

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));

    if (username) {
      await AsyncStorage.setItem(USERNAME_KEY, username);
    }

  } catch (err) {
    console.error('[Auth] Failed to save session:', err);
  }
}

export async function restoreSession() {
  try {
    const storedSession = await AsyncStorage.getItem(SESSION_KEY);
    if (!storedSession) return null;

    const session = JSON.parse(storedSession);

    const { data, error } = await supabase.auth.setSession(session);
    if (error) {
      console.error('[Auth] Failed to restore session:', error.message);
      await clearSession();
      return null;
    }

    return {
      session: data.session,
      user: data.user
    };
  } catch (err) {
    console.error('[Auth] Failed to restore session:', err);
    return null;
  }
}


export async function isLoggedIn() {
  const storedSession = await AsyncStorage.getItem(SESSION_KEY);
  return !!storedSession;
}

export async function clearSession() {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
    await AsyncStorage.removeItem(USERNAME_KEY);
    await supabase.auth.signOut();
  } catch (err) {
    console.error('[Auth] Failed to clear session:', err);
  }
}

// Esquece a sessão de paciente guardada neste aparelho, sem derrubá-la nos outros
// (signOut local). Usado quando um servidor entra no portal no mesmo aparelho.
export async function forgetLocalSession() {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
    await AsyncStorage.removeItem(USERNAME_KEY);
    await supabase.auth.signOut({ scope: 'local' });
  } catch (err) {
    console.error('[Auth] Failed to forget local session:', err);
  }
}
