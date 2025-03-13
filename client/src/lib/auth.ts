// Define tipos para a autenticação - versão temporária sem JSX
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

// Versão simplificada do useAuth como função dummy
export function useAuth() {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: async () => ({ id: 1, username: "usuario", email: "usuario@example.com", name: "Usuário", role: "user" }),
    register: async () => ({ id: 1, username: "usuario", email: "usuario@example.com", name: "Usuário", role: "user" }),
    logout: async () => {},
    checkAuth: async () => false
  };
}
