import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  console.log(`API Request: ${method} ${url}`, data ? 'Com dados' : 'Sem dados');
  
  const options: RequestInit = {
    method,
    headers: {
      'Accept': 'application/json',
      ...(data ? { 'Content-Type': 'application/json' } : {})
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include', // Inclui cookies nas requisições cross-origin
    mode: 'cors', // Habilita CORS
    cache: 'no-cache', // Evita cache
  };
  
  console.log('Opções da requisição:', options);
  
  const res = await fetch(url, options);
  
  console.log(`API Response: ${res.status} ${res.statusText}`, 
    res.headers.has('set-cookie') ? 'Cookie definido' : 'Sem cookie');
  
  await throwIfResNotOk(res);
  const responseData = await res.json();
  console.log('Dados da resposta:', responseData);
  return responseData;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log(`Query: ${queryKey[0]}`);
    
    const res = await fetch(queryKey[0] as string, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'include',
      mode: 'cors',
      cache: 'no-cache'
    });
    
    console.log(`Query Response: ${res.status} ${res.statusText}`);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log('Resposta 401, retornando null conforme configuração');
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    console.log('Query Data:', data);
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Permitir atualização ao focar a janela
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
