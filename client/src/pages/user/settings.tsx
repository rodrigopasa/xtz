import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Eye, EyeOff, Save } from "lucide-react";

// Esquema de validação para profile
const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Nome deve ter pelo menos 2 caracteres.",
  }),
  email: z.string().email({
    message: "Email inválido.",
  }),
  avatarUrl: z.string().url({
    message: "URL inválida.",
  }).optional().or(z.literal('')),
});

// Esquema de validação para change password
const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, {
    message: "A senha atual deve ter pelo menos 6 caracteres.",
  }),
  newPassword: z.string().min(6, {
    message: "A nova senha deve ter pelo menos 6 caracteres.",
  }),
  confirmPassword: z.string().min(6, {
    message: "Confirme a nova senha.",
  }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

export default function UserSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      avatarUrl: user?.avatarUrl || "",
    },
  });
  
  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    setIsUpdating(true);
    
    try {
      // Simulação de atualização - em uma implementação real seria uma chamada de API
      // await apiRequest("PUT", `/api/users/${user?.id}`, values);
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações de perfil foram atualizadas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const onPasswordSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
    setIsChangingPassword(true);
    
    try {
      // Simulação de atualização de senha - em uma implementação real seria uma chamada de API
      // await apiRequest("PUT", `/api/users/${user?.id}/password`, values);
      
      toast({
        title: "Senha atualizada",
        description: "Sua senha foi atualizada com sucesso.",
      });
      
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a senha. Verifique se sua senha atual está correta.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <main className="flex-grow p-6 bg-neutral-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-serif text-3xl font-bold mb-4 text-primary">Configurações</h1>
        <p className="text-neutral-600 mb-8">Personalize sua experiência na plataforma</p>
        
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="password">Senha</TabsTrigger>
            <TabsTrigger value="preferences">Preferências</TabsTrigger>
          </TabsList>
          
          {/* Perfil */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais. Essas informações serão exibidas publicamente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <div className="flex items-center space-x-4 mb-6">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                        <AvatarFallback className="text-lg">
                          {user?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-base font-medium">Foto de Perfil</h3>
                        <p className="text-sm text-neutral-500">
                          Sua foto será exibida nos comentários e no seu perfil
                        </p>
                      </div>
                    </div>
                    
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu nome" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="seuemail@exemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="avatarUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL da foto de perfil</FormLabel>
                          <FormControl>
                            <Input placeholder="https://exemplo.com/suafoto.jpg" {...field} />
                          </FormControl>
                          <FormDescription>
                            Insira a URL de uma imagem para usar como foto de perfil
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" disabled={isUpdating} className="flex items-center">
                      <Save className="mr-2 h-4 w-4" />
                      {isUpdating ? "Salvando..." : "Salvar alterações"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Senha */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>
                  Atualize sua senha para manter sua conta segura.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha atual</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showCurrentPassword ? "text" : "password"}
                                placeholder="Sua senha atual" 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 py-2"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nova senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showNewPassword ? "text" : "password"}
                                placeholder="Nova senha" 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 py-2"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar nova senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirme a nova senha" 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 py-2"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" disabled={isChangingPassword}>
                      {isChangingPassword ? "Alterando senha..." : "Alterar senha"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Preferências */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Preferências</CardTitle>
                <CardDescription>
                  Configure suas preferências de exibição e notificações.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-base font-medium mb-2">Tema</h3>
                      <div className="flex space-x-2">
                        <Button variant="default" className="bg-primary text-white">
                          Claro
                        </Button>
                        <Button variant="outline">
                          Escuro
                        </Button>
                        <Button variant="outline">
                          Sistema
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-medium mb-2">Formato preferido</h3>
                      <div className="flex space-x-2">
                        <Button variant="default" className="bg-primary text-white">
                          EPUB
                        </Button>
                        <Button variant="outline">
                          PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 mt-6">
                    <h3 className="text-base font-medium mb-2">Notificações</h3>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Novos lançamentos</p>
                          <p className="text-sm text-neutral-500">
                            Receber notificações sobre novos livros lançados
                          </p>
                        </div>
                        <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-neutral-200">
                          <input type="checkbox" defaultChecked className="peer sr-only" />
                          <span className="absolute inset-y-0 start-0 m-1 h-4 w-4 rounded-full bg-white transition-all peer-checked:start-5 peer-checked:bg-white peer-checked:[&+div]:bg-primary"></span>
                          <div className="absolute inset-0 rounded-full transition"></div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Comentários</p>
                          <p className="text-sm text-neutral-500">
                            Receber notificações sobre respostas aos seus comentários
                          </p>
                        </div>
                        <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-neutral-200">
                          <input type="checkbox" defaultChecked className="peer sr-only" />
                          <span className="absolute inset-y-0 start-0 m-1 h-4 w-4 rounded-full bg-white transition-all peer-checked:start-5 peer-checked:bg-white peer-checked:[&+div]:bg-primary"></span>
                          <div className="absolute inset-0 rounded-full transition"></div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Newsletter</p>
                          <p className="text-sm text-neutral-500">
                            Receber novidades e promoções por email
                          </p>
                        </div>
                        <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-neutral-200">
                          <input type="checkbox" defaultChecked className="peer sr-only" />
                          <span className="absolute inset-y-0 start-0 m-1 h-4 w-4 rounded-full bg-white transition-all peer-checked:start-5 peer-checked:bg-white peer-checked:[&+div]:bg-primary"></span>
                          <div className="absolute inset-0 rounded-full transition"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button>Salvar preferências</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
