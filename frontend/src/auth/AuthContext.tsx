import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(
    () => sessionStorage.getItem("access_token") !== null,
  );

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;
    api
      .get<User>("/usuarios/me")
      .then(({ data }) => {
        setUser(data);
        sessionStorage.setItem("auth_user", JSON.stringify(data));
      })
      .catch(() => {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("auth_user");
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback((token: string, authenticatedUser: User) => {
    sessionStorage.setItem("access_token", token);
    sessionStorage.setItem("auth_user", JSON.stringify(authenticatedUser));
    setUser(authenticatedUser);
    setLoading(false);
  }, []);

  const signOut = useCallback(() => {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("auth_user");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut }),
    [user, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth precisa ser usado dentro de AuthProvider.");
  return value;
}
