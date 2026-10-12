import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { api, auth as store, homeFor, onUnauthorized } from "./api.js";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => store.user());
  const navigate = useNavigate();

  // The signed-in profile (name, must_change_password, and the organization's name/branding/
  // org_type) is cached at login and otherwise never changes on its own. Refresh it once per
  // load so a rename, a logo change, or a forced password reset shows up without a re-login.
  // A real 401 still bounces to the sign-in screen via the usual handler below; anything else
  // (offline, a slow server) just leaves the cached profile in place.
  useEffect(() => {
    const loadedToken = store.token();
    if (!loadedToken) return;
    api("GET", "/api/zyphor/auth/me", null, { noRedirect: window.location.pathname === "/lti/launch" }).then((me) => {
      if (store.token() !== loadedToken) return;
      store.save(loadedToken, me);
      setUser(me);
    }).catch(() => {});
  }, []);

  // A 401 anywhere drops the session and returns to the login screen.
  useEffect(() => {
    onUnauthorized.handler = () => {
      setUser(null);
      navigate("/login?expired=1", { replace: true });
    };
    return () => { onUnauthorized.handler = null; };
  }, [navigate]);

  const login = useCallback(async (body) => {
    const data = await api("POST", "/api/zyphor/auth/login", body, { retry: true });
    store.save(data.access_token, data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const loginWithFirebase = useCallback(async (idToken, turnstileToken) => {
    const data = await api("POST", "/api/zyphor/auth/firebase",
      { id_token: idToken, turnstile_token: turnstileToken }, { retry: true });
    store.save(data.access_token, data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    // Best-effort: frees this account's login slot right away instead of making the
    // next device wait for it to lapse on its own. Never blocks signing out locally.
    if (store.token()) api("POST", "/api/zyphor/auth/logout").catch(() => {});
    store.clear();
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  /** Refresh the cached user after a profile or password change. */
  const refresh = useCallback((token, nextUser) => {
    if (token) store.save(token, nextUser);
    setUser(nextUser);
  }, []);

  const value = useMemo(() => ({ user, login, loginWithFirebase, logout, refresh }),
    [user, login, loginWithFirebase, logout, refresh]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function RequireRole({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!store.token() || !user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}
