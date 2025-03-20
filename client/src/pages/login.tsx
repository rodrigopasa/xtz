import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

// Esquema de validação do formulário
const loginSchema = z.object({
  username: z.string().min(3, {
    message: "Nome de usuário deve ter pelo menos 3 caracteres",
  }),
  password: z.string().min(6, {
    message: "Senha deve ter pelo menos 6 caracteres",
  }),
});

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    
    try {
      const user = await login({
        username: values.username,
        password: values.password
      });
      
      // O toast já está sendo mostrado no hook useAuth
      
      console.log("Login bem-sucedido:", user);
      
      // Verificar se é admin e redirecionar para o painel admin
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        // Redirecionar para a página inicial ou última página visitada
        navigate("/");
      }
    } catch (error: any) {
      // O toast de erro já está sendo exibido no hook useAuth
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md bg-neutral-900/90 border border-purple-500/30 text-white">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-white">Entrar na Elexandria</CardTitle>
          <CardDescription className="text-center text-purple-300">
            Entre com seu nome de usuário e senha para acessar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Nome de usuário</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Digite seu nome de usuário" 
                        {...field} 
                        disabled={isLoading}
                        className="bg-neutral-800 border-purple-500/30 text-white placeholder:text-neutral-400"
                      />
                    </FormControl>
                    <FormMessage className="text-rose-300" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"}
                          placeholder="Digite sua senha" 
                          {...field} 
                          disabled={isLoading}
                          className="bg-neutral-800 border-purple-500/30 text-white placeholder:text-neutral-400"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent hover:text-purple-400 text-neutral-400"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-rose-300" />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-purple-300">
            <Link href="/recuperar-senha" className="text-purple-400 hover:text-purple-300 hover:underline">
              Esqueceu sua senha?
            </Link>
          </div>
          <div className="text-sm text-center text-purple-300">
            Não tem uma conta?{" "}
            <Link href="/cadastro" className="text-purple-400 hover:text-purple-300 hover:underline">
              Cadastre-se
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
