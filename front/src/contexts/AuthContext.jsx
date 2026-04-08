import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { pb } from '../lib/pocketbase';
import { ensureWorkspaceForCurrentUser, getWorkspaceById } from '../lib/workspaces';
import { devLog } from '../utils/devLogger';
import { PB_COLLECTIONS } from '../lib/pbCollections';

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
    let currentUser = pb.authStore.model;

    if (pb.authStore.isValid) {
      try {
        const authData = await pb.collection(PB_COLLECTIONS.USERS_COLLECTION).authRefresh();
        currentUser = authData?.record || pb.authStore.model;
      } catch (refreshError) {
        devLog('auth.refresh.error', {
          message: refreshError?.message,
          status: refreshError?.status,
          data: refreshError?.data,
        });
      }
    }

    devLog('auth.currentUser', currentUser);

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
        devLog('auth.workspace.missingForWorker', { userId: currentUser.id, role: currentUser.role });
      } else if (resolved) {
        const workspaceRecord = await getWorkspaceById(resolved.id);
        setWorkspace(workspaceRecord);
        setWorkspaceError('');
        devLog('auth.workspace.resolved', workspaceRecord);
      } else {
        setWorkspace(null);
      }

      setUser(pb.authStore.model);
      setToken(pb.authStore.token);
    } catch (error) {
      setWorkspace(null);
      setWorkspaceError(error?.message || 'Failed to resolve workspace.');
      devLog('auth.workspace.error', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
      });
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
        const methods = await pb.collection(PB_COLLECTIONS.USERS_COLLECTION).listAuthMethods();
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
    const authData = await pb.collection(PB_COLLECTIONS.USERS_COLLECTION).authWithPassword(email, password);
    return authData.record;
  }

  async function register({ name, email, password }) {
    await pb.collection(PB_COLLECTIONS.USERS_COLLECTION).create({
      name,
      email,
      password,
      passwordConfirm: password,
      role: 'worker',
    });

    const authData = await pb.collection(PB_COLLECTIONS.USERS_COLLECTION).authWithPassword(email, password);
    return authData.record;
  }

  async function loginWithOAuth(provider) {
    const authData = await pb.collection(PB_COLLECTIONS.USERS_COLLECTION).authWithOAuth2({ provider });

    if (!authData.record.role) {
      try {
        await pb.collection(PB_COLLECTIONS.USERS_COLLECTION).update(authData.record.id, { role: 'worker' });
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
