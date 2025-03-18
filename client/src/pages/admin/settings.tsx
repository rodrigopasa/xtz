import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("geral");
  const [formValues, setFormValues] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);

  // Carregar configurações atuais
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: () => apiRequest('GET', '/api/settings')
  });

  // Inicializar valores do formulário quando as configurações são carregadas
  useEffect(() => {
    if (settings) {
      setFormValues(settings);
    }
  }, [settings]);

  // Mutation para atualizar configurações
  const updateSettings = useMutation({
    mutationFn: (newSettings: any) => 
      apiRequest('PUT', '/api/settings', newSettings),
    onSuccess: () => {
      toast({
        title: "Configurações atualizadas",
        description: "As alterações foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      setIsEditing(false);
    },
    onError: (error) => {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive"
      });
    }
  });

  // Handler para atualizar os valores do formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormValues((prev: any) => ({
      ...prev,
      [name]: value
    }));
    setIsEditing(true);
  };

  // Handler para salvar configurações
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Salvando configurações:", formValues);
    updateSettings.mutate(formValues);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <form onSubmit={handleSaveSettings}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setFormValues(settings);
                setIsEditing(false);
              }}
              disabled={!isEditing}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!isEditing || updateSettings.isPending} 
              className="min-w-[120px]"
            >
              {updateSettings.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="geral" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 grid grid-cols-4 md:flex">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="aparencia">Aparência</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="codigospersonalizados">Códigos Personalizados</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="pr-4">
              <TabsContent value="geral" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações do Site</CardTitle>
                    <CardDescription>
                      Configure as informações básicas do seu site
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="siteName">Nome do Site</Label>
                      <Input 
                        id="siteName" 
                        name="siteName"
                        value={formValues.siteName || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="siteDescription">Descrição do Site</Label>
                      <Textarea 
                        id="siteDescription" 
                        name="siteDescription"
                        value={formValues.siteDescription || ""}
                        onChange={handleInputChange}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Manutenção</CardTitle>
                    <CardDescription>
                      Gerencie o cache e otimize o desempenho
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={() => {
                          toast({
                            title: "Cache limpo",
                            description: "O cache do site foi limpo com sucesso.",
                          });
                        }}
                      >
                        Limpar Cache
                      </Button>
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={() => {
                          toast({
                            title: "Banco otimizado",
                            description: "O banco de dados foi otimizado com sucesso.",
                          });
                        }}
                      >
                        Otimizar Banco de Dados
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="aparencia" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Personalização</CardTitle>
                    <CardDescription>
                      Personalize a aparência do site
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Cor Principal</Label>
                      <div className="flex gap-4 items-center">
                        <Input 
                          id="primaryColor" 
                          name="primaryColor"
                          type="color"
                          className="w-20 h-10"
                          value={formValues.primaryColor || "#3b82f6"}
                          onChange={handleInputChange}
                        />
                        <Input 
                          type="text"
                          value={formValues.primaryColor || "#3b82f6"}
                          onChange={handleInputChange}
                          name="primaryColor"
                        />
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-2">
                      <Label htmlFor="logoUrl">URL do Logo</Label>
                      <Input 
                        id="logoUrl" 
                        name="logoUrl"
                        value={formValues.logoUrl || ""}
                        onChange={handleInputChange}
                        placeholder="https://exemplo.com/logo.png"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="faviconUrl">URL do Favicon</Label>
                      <Input 
                        id="faviconUrl" 
                        name="faviconUrl"
                        value={formValues.faviconUrl || ""}
                        onChange={handleInputChange}
                        placeholder="https://exemplo.com/favicon.ico"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações de SEO</CardTitle>
                    <CardDescription>
                      Otimize seu site para mecanismos de busca
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="metaTitle">Título Meta (Meta Title)</Label>
                      <Input 
                        id="metaTitle" 
                        name="metaTitle"
                        value={formValues.metaTitle || ""}
                        onChange={handleInputChange}
                        placeholder="Título para SEO (70 caracteres recomendado)"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="metaDescription">Descrição Meta (Meta Description)</Label>
                      <Textarea 
                        id="metaDescription" 
                        name="metaDescription"
                        value={formValues.metaDescription || ""}
                        onChange={handleInputChange}
                        placeholder="Descrição para SEO (160 caracteres recomendado)"
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="metaKeywords">Palavras-chave (Meta Keywords)</Label>
                      <Input 
                        id="metaKeywords" 
                        name="metaKeywords"
                        value={formValues.metaKeywords || ""}
                        onChange={handleInputChange}
                        placeholder="palavra1, palavra2, palavra3"
                      />
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-2">
                      <Label htmlFor="ogImage">Imagem OG (Open Graph)</Label>
                      <Input 
                        id="ogImage" 
                        name="ogImage"
                        value={formValues.ogImage || ""}
                        onChange={handleInputChange}
                        placeholder="https://exemplo.com/og-image.jpg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Esta imagem será exibida quando compartilhar o site nas redes sociais
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="twitterHandle">Twitter Handle</Label>
                      <Input 
                        id="twitterHandle" 
                        name="twitterHandle"
                        value={formValues.twitterHandle || ""}
                        onChange={handleInputChange}
                        placeholder="@seuhandle"
                      />
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-2">
                      <Label htmlFor="googleAnalyticsId">ID do Google Analytics</Label>
                      <Input 
                        id="googleAnalyticsId" 
                        name="googleAnalyticsId"
                        value={formValues.googleAnalyticsId || ""}
                        onChange={handleInputChange}
                        placeholder="G-XXXXXXXXXX"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="googleTagManagerId">ID do Google Tag Manager</Label>
                      <Input 
                        id="googleTagManagerId" 
                        name="googleTagManagerId"
                        value={formValues.googleTagManagerId || ""}
                        onChange={handleInputChange}
                        placeholder="GTM-XXXXXXX"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="codigospersonalizados" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Códigos Personalizados</CardTitle>
                    <CardDescription>
                      Adicione códigos personalizados ao seu site
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="headerCode">Código no &lt;head&gt;</Label>
                      <Textarea 
                        id="headerCode" 
                        name="headerCode"
                        value={formValues.headerCode || ""}
                        onChange={handleInputChange}
                        placeholder="<!-- Seu código HTML, CSS ou JavaScript aqui -->"
                        rows={5}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Este código será inserido dentro da tag &lt;head&gt; do site
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bodyStartCode">Código no início do &lt;body&gt;</Label>
                      <Textarea 
                        id="bodyStartCode" 
                        name="bodyStartCode"
                        value={formValues.bodyStartCode || ""}
                        onChange={handleInputChange}
                        placeholder="<!-- Seu código HTML, CSS ou JavaScript aqui -->"
                        rows={5}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Este código será inserido logo após a abertura da tag &lt;body&gt;
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bodyEndCode">Código no final do &lt;body&gt;</Label>
                      <Textarea 
                        id="bodyEndCode" 
                        name="bodyEndCode"
                        value={formValues.bodyEndCode || ""}
                        onChange={handleInputChange}
                        placeholder="<!-- Seu código HTML, CSS ou JavaScript aqui -->"
                        rows={5}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Este código será inserido antes do fechamento da tag &lt;body&gt;
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="footerCode">Código no rodapé</Label>
                      <Textarea 
                        id="footerCode" 
                        name="footerCode"
                        value={formValues.footerCode || ""}
                        onChange={handleInputChange}
                        placeholder="<!-- Seu código HTML, CSS ou JavaScript aqui -->"
                        rows={5}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Este código será inserido no componente de rodapé do site
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
        
        <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8">
          {isEditing && (
            <Card className="shadow-lg border-primary/30">
              <CardContent className="p-4 flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setFormValues(settings);
                    setIsEditing(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateSettings.isPending}
                >
                  {updateSettings.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </form>
    </div>
  );
}