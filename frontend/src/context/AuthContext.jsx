import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContext";
import api from "../services/api";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    localStorage.removeItem("token");
    return sessionStorage.getItem("token");
  });
  const [roleState, setRoleState] = useState({ token: null, role: null });
  const role = roleState.token === token ? roleState.role : null;

  useEffect(() => {
    const syncToken = () => setToken(sessionStorage.getItem("token"));
    window.addEventListener("storage", syncToken);
    window.addEventListener("auth:expired", syncToken);

    return () => {
      window.removeEventListener("storage", syncToken);
      window.removeEventListener("auth:expired", syncToken);
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (token) {
      api.get("/me")
        .then(({ data }) => {
          if (active) setRoleState({ token, role: data.user.role });
        })
        .catch(() => {
          if (active) setRoleState({ token, role: null });
        });
    }

    return () => {
      active = false;
    };
  }, [token]);

  const login = (newToken) => {
    sessionStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    sessionStorage.removeItem("token");
    setToken(null);
  };

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      role,
      isAdmin: role === "admin",
      login,
      logout
    }),
    [token, role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
