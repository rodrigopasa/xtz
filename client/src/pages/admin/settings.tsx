import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const { toast } = useToast();

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
              <Input id="site-name" placeholder="BiblioTech" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-description">Descrição</Label>
              <Input id="site-description" placeholder="Sua biblioteca digital" />
            </div>
            <Button 
              onClick={() => {
                toast({
                  title: "Em desenvolvimento",
                  description: "Esta funcionalidade estará disponível em breve.",
                });
              }}
            >
              Salvar Configurações
            </Button>
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
              <Input id="primary-color" type="color" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo</Label>
              <Input id="logo" type="file" />
            </div>
            <Button
              onClick={() => {
                toast({
                  title: "Em desenvolvimento",
                  description: "Esta funcionalidade estará disponível em breve.",
                });
              }}
            >
              Salvar Personalização
            </Button>
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
                  title: "Em desenvolvimento",
                  description: "Esta funcionalidade estará disponível em breve.",
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
                  title: "Em desenvolvimento",
                  description: "Esta funcionalidade estará disponível em breve.",
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
