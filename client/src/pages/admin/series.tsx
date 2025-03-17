import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PlusCircle } from "lucide-react";

// Schema de validação para o formulário de série
const seriesFormSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  authorId: z.coerce.number({ required_error: "Autor é obrigatório" }),
  description: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
});

export default function AdminSeries() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar séries - simplificado inicialmente
  const { data: series, isLoading } = useQuery({
    queryKey: ["/api/series"],
    onSuccess: (data) => {
      console.log("Series data loaded:", data);
    },
    onError: (error) => {
      console.error("Error loading series:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as séries.",
        variant: "destructive",
      });
    },
  });

  // Buscar autores
  const { data: authors } = useQuery({
    queryKey: ["/api/authors"],
    onSuccess: (data) => {
      console.log("Authors data loaded:", data);
    },
  });

  // Formulário para criar uma nova série
  const createForm = useForm<z.infer<typeof seriesFormSchema>>({
    resolver: zodResolver(seriesFormSchema),
    defaultValues: {
      name: "",
      authorId: 0,
      description: "",
      coverUrl: "",
    },
  });

  // Mutation para criar uma nova série
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof seriesFormSchema>) => {
      console.log("Creating series with data:", data);
      return apiRequest("POST", "/api/series", {
        ...data,
        slug: data.name.toLowerCase().replace(/\s+/g, "-"),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Série criada",
        description: "A série foi criada com sucesso!",
      });
    },
    onError: (error: any) => {
      console.error("Error creating series:", error);
      toast({
        title: "Erro ao criar série",
        description: error.message || "Ocorreu um erro ao criar a série.",
        variant: "destructive",
      });
    },
  });

  const onCreateSubmit = (data: z.infer<typeof seriesFormSchema>) => {
    createMutation.mutate(data);
  };

  console.log("Rendering AdminSeries with series:", series);

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Gerenciar Séries</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Série
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-foreground">Carregando séries...</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Livros</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {series && series.length > 0 ? (
                series.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.author?.name || 'Sem autor'}</TableCell>
                    <TableCell>{item.totalBooks || 0}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                    Nenhuma série encontrada. Crie sua primeira série clicando no botão acima.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Série</DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para criar uma nova série.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Série</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da série" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="authorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Autor</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value={0}>Selecione um autor</option>
                        {authors?.map((author: any) => (
                          <option key={author.id} value={author.id}>
                            {author.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Criando..." : "Criar Série"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}