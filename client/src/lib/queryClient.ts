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
  
  let headers: HeadersInit = {
    'Accept': 'application/json'
  };
  
  let body: any = undefined;
  
  // Verificar se é FormData para não adicionar Content-Type
  // O navegador definirá automaticamente o Content-Type correto com o boundary
  if (data instanceof FormData) {
    body = data;
  } else if (data) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  }
  
  const options: RequestInit = {
    method,
    headers,
    body,
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
    const endpoint = queryKey[0] as string;
    console.log(`Query: ${endpoint}`);
    console.log(`QueryKey completo:`, queryKey);
    
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'include',
      mode: 'cors',
      cache: 'no-cache'
    });
    
    console.log(`Query Response para ${endpoint}: ${res.status} ${res.statusText}`);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log(`Resposta 401 para ${endpoint}, retornando null conforme configuração`);
      return null;
    }

    try {
      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`Query Data para ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`Erro ao processar resposta para ${endpoint}:`, error);
      throw error;
    }
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
