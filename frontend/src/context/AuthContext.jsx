import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  useEffect(() => {
    const syncToken = () => setToken(localStorage.getItem("token"));
    window.addEventListener("storage", syncToken);

    return () => window.removeEventListener("storage", syncToken);
  }, []);

  const login = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login,
      logout
    }),
    [token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
