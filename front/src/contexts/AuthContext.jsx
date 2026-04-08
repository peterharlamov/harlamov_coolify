import { createContext, useEffect, useMemo, useState } from 'react';
import { pb } from '../lib/pocketbase';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(pb.authStore.model);
  const [token, setToken] = useState(pb.authStore.token);
  const [isReady, setIsReady] = useState(false);
  const [oauthProviders, setOauthProviders] = useState([]);

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((nextToken, nextUser) => {
      setToken(nextToken);
      setUser(nextUser);
    });

    setUser(pb.authStore.model);
    setToken(pb.authStore.token);
    setIsReady(true);

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthMethods() {
      try {
        const methods = await pb.collection('users').listAuthMethods();
        if (cancelled) {
          return;
        }

        setOauthProviders(methods.oauth2?.providers ?? []);
      } catch {
        if (!cancelled) {
          setOauthProviders([]);
        }
      }
    }

    loadAuthMethods();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loginWithPassword(email, password) {
    const authData = await pb.collection('users').authWithPassword(email, password);
    return authData.record;
  }

  async function register({ name, email, password }) {
    await pb.collection('users').create({
      name,
      email,
      password,
      passwordConfirm: password,
      role: 'worker',
    });

    const authData = await pb.collection('users').authWithPassword(email, password);
    return authData.record;
  }

  async function loginWithOAuth(provider) {
    const authData = await pb.collection('users').authWithOAuth2({ provider });

    if (!authData.record.role) {
      try {
        await pb.collection('users').update(authData.record.id, { role: 'worker' });
      } catch {
        // Ignore update failures so OAuth login still succeeds.
      }
    }

    return authData.record;
  }

  function logout() {
    pb.authStore.clear();
    setUser(null);
    setToken('');
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isReady,
      oauthProviders,
      loginWithPassword,
      register,
      loginWithOAuth,
      logout,
    }),
    [user, token, isReady, oauthProviders]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
