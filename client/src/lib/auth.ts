import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "./queryClient";
import { useToast } from "@/hooks/use-toast";

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface RegisterData {
  username: string;
  password: string;
  email: string;
  name: string;
}

export interface LoginData {
  username: string;
  password: string;
}

// Implementação real do hook de autenticação
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  // Verifica se o usuário está autenticado ao iniciar a aplicação
  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest<User | null>("GET", "/api/auth/me");
      if (response) {
        setUser(response);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      return !!response;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Função de login
  const login = async (data: LoginData) => {
    try {
      setIsLoading(true);
      const response = await apiRequest<User>("POST", "/api/auth/login", data);
      setUser(response);
      setIsAuthenticated(true);
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo de volta, ${response.name}!`,
      });
      return response;
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error?.message || "Verifique suas credenciais e tente novamente",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Função de registro
  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await apiRequest<User>("POST", "/api/auth/register", data);
      setUser(response);
      setIsAuthenticated(true);
      toast({
        title: "Registro realizado com sucesso",
        description: `Bem-vindo, ${response.name}!`,
      });
      return response;
    } catch (error: any) {
      toast({
        title: "Erro ao registrar",
        description: error?.message || "Não foi possível criar sua conta",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Função de logout
  const logout = async () => {
    try {
      setIsLoading(true);
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
      setIsAuthenticated(false);
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer logout",
        description: error?.message || "Não foi possível realizar o logout",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    checkAuth
  };
}
