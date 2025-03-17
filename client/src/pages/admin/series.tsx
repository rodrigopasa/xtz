import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PlusCircle } from "lucide-react";

// Schema de validação para o formulário de série
const seriesFormSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  authorId: z.coerce.number().min(1, { message: "Autor é obrigatório" }),
  description: z.string().optional(),
  coverUrl: z.string().optional(),
});

export default function AdminSeries() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar séries
  const { data: series, isLoading } = useQuery({
    queryKey: ["/api/series"],
    onSuccess: (data) => {
      console.log("Series data loaded:", data);
    },
  });

  // Buscar autores para o select
  const { data: authors } = useQuery({
    queryKey: ["/api/authors"],
    onSuccess: (data) => {
      console.log("Authors data loaded:", data);
    },
  });

  // Form para criar série
  const form = useForm<z.infer<typeof seriesFormSchema>>({
    resolver: zodResolver(seriesFormSchema),
    defaultValues: {
      name: "",
      authorId: undefined,
      description: "",
      coverUrl: "",
    },
  });

  // Mutation para criar série
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof seriesFormSchema>) => {
      return apiRequest("POST", "/api/series", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Série criada",
        description: "A série foi criada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar série",
        description: error.message || "Ocorreu um erro ao criar a série.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof seriesFormSchema>) => {
    createMutation.mutate(data);
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Gerenciar Séries</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Série
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Livros</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6">
                  Carregando séries...
                </TableCell>
              </TableRow>
            ) : series && series.length > 0 ? (
              series.map((series: any) => (
                <TableRow key={series.id}>
                  <TableCell className="font-medium">{series.name}</TableCell>
                  <TableCell>{series.author?.name || "Sem autor"}</TableCell>
                  <TableCell>{series.totalBooks || 0}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6">
                  Nenhuma série encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Série</DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para criar uma nova série.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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
                control={form.control}
                name="authorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Autor</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="">Selecione um autor</option>
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
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição da série (opcional)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="coverUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Capa</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="URL da imagem de capa (opcional)"
                        {...field}
                      />
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
                <Button type="submit" disabled={createMutation.isPending}>
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