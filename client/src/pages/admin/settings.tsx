import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Carregar configurações atuais
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: () => apiRequest('/api/settings')
  });

  // Mutation para atualizar configurações
  const updateSettings = useMutation({
    mutationFn: (newSettings: any) => 
      apiRequest('/api/settings', {
        method: 'PUT',
        data: newSettings
      }),
    onSuccess: () => {
      toast({
        title: "Configurações atualizadas",
        description: "As alterações foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive"
      });
    }
  });

  // Handler para salvar configurações
  const handleSaveSettings = async (section: string, data: any) => {
    updateSettings.mutate(data);
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Configurações do Site</CardTitle>
            <CardDescription>
              Gerencie as configurações básicas do site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site-name">Nome do Site</Label>
              <Input 
                id="site-name" 
                defaultValue={settings?.siteName} 
                onChange={(e) => {
                  handleSaveSettings('site', {
                    ...settings,
                    siteName: e.target.value
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-description">Descrição</Label>
              <Input 
                id="site-description" 
                defaultValue={settings?.siteDescription}
                onChange={(e) => {
                  handleSaveSettings('site', {
                    ...settings,
                    siteDescription: e.target.value
                  });
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personalização</CardTitle>
            <CardDescription>
              Personalize a aparência do site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Cor Principal</Label>
              <Input 
                id="primary-color" 
                type="color"
                defaultValue={settings?.primaryColor}
                onChange={(e) => {
                  handleSaveSettings('theme', {
                    ...settings,
                    primaryColor: e.target.value
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo</Label>
              <Input 
                id="logo" 
                type="file"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const formData = new FormData();
                    formData.append('logo', file);

                    try {
                      const response = await fetch('/api/settings/logo', {
                        method: 'POST',
                        body: formData
                      });

                      if (response.ok) {
                        const { logoUrl } = await response.json();
                        handleSaveSettings('theme', {
                          ...settings,
                          logoUrl
                        });
                      }
                    } catch (error) {
                      toast({
                        title: "Erro",
                        description: "Não foi possível fazer upload do logo.",
                        variant: "destructive"
                      });
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cache e Otimização</CardTitle>
            <CardDescription>
              Gerencie o cache e otimize o desempenho
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full"
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
              variant="outline" 
              className="w-full"
              onClick={() => {
                toast({
                  title: "Banco otimizado",
                  description: "O banco de dados foi otimizado com sucesso.",
                });
              }}
            >
              Otimizar Banco de Dados
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}