import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  function extractUser(payload) {
    if (!payload) return null;
    if (payload.user) return payload.user;
    if (payload.data?.user) return payload.data.user;
    return payload;
  }

  async function fetchMe() {
    try {
      const { data } = await api.get("/auth/me");
      setUser(extractUser(data));
    } catch (error) {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }

  async function login(formData) {
    const { data } = await api.post("/auth/login", formData);
    const actualUser = extractUser(data);
    setUser(actualUser);
    return actualUser;
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
    }
  }

  useEffect(() => {
    fetchMe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        authLoading,
        login,
        logout,
        fetchMe,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}