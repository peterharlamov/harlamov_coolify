import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { pb } from '../lib/pocketbase';
import { ensureWorkspaceForCurrentUser, getWorkspaceById } from '../lib/workspaces';

export const AuthContext = createContext(null);

const noWorkspaceMessage = 'Your account is not attached to a workspace. Contact administrator.';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(pb.authStore.model);
  const [token, setToken] = useState(pb.authStore.token);
  const [isReady, setIsReady] = useState(false);
  const [workspace, setWorkspace] = useState(null);
  const [workspaceError, setWorkspaceError] = useState('');
  const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);
  const [oauthProviders, setOauthProviders] = useState([]);

  const resolveWorkspace = useCallback(async () => {
    const currentUser = pb.authStore.model;

    if (!currentUser || !pb.authStore.isValid) {
      setWorkspace(null);
      setWorkspaceError('');
      setIsWorkspaceReady(true);
      return;
    }

    setIsWorkspaceReady(false);
    setWorkspaceError('');

    try {
      const resolved = await ensureWorkspaceForCurrentUser(currentUser);

      if (!resolved && (currentUser.role || 'worker') !== 'admin') {
        setWorkspace(null);
        setWorkspaceError(noWorkspaceMessage);
      } else if (resolved) {
        const workspaceRecord = await getWorkspaceById(resolved.id);
        setWorkspace(workspaceRecord);
        setWorkspaceError('');
      } else {
        setWorkspace(null);
      }

      setUser(pb.authStore.model);
      setToken(pb.authStore.token);
    } catch (error) {
      setWorkspace(null);
      setWorkspaceError(error?.message || 'Failed to resolve workspace.');
    } finally {
      setIsWorkspaceReady(true);
    }
  }, []);

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
    if (!isReady) {
      return;
    }

    resolveWorkspace();
  }, [isReady, user?.id, user?.workspace, user?.role, resolveWorkspace]);

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
    setWorkspace(null);
    setWorkspaceError('');
    setIsWorkspaceReady(true);
  }

  const value = useMemo(
    () => ({
      user,
      token,
      workspace,
      workspaceError,
      isWorkspaceReady,
      isAuthenticated: Boolean(user && token),
      isReady,
      oauthProviders,
      loginWithPassword,
      register,
      loginWithOAuth,
      refreshWorkspace: resolveWorkspace,
      logout,
    }),
    [user, token, workspace, workspaceError, isWorkspaceReady, isReady, oauthProviders, resolveWorkspace]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
