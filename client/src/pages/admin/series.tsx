import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Series, Author, InsertSeries } from "@shared/schema";
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
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Schema de validação para o formulário de série
const seriesFormSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  authorId: z.coerce.number().min(1, { message: "Autor é obrigatório" }),
  description: z.string().optional(),
  coverUrl: z.string().optional(),
});

type SeriesFormData = z.infer<typeof seriesFormSchema>;

interface SeriesWithAuthor extends Series {
  author?: Author;
  totalBooks?: number;
}

export default function AdminSeries() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<SeriesWithAuthor | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar séries
  const { data: series, isLoading } = useQuery<SeriesWithAuthor[]>({
    queryKey: ["/api/series"],
  });

  // Buscar autores para o select
  const { data: authors } = useQuery<Author[]>({
    queryKey: ["/api/authors"],
  });

  // Form para criar/editar série
  const form = useForm<SeriesFormData>({
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
    mutationFn: (data: SeriesFormData) => {
      return apiRequest<InsertSeries>("POST", "/api/series", data);
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
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar série",
        description: error.message || "Ocorreu um erro ao criar a série.",
        variant: "destructive",
      });
    },
  });

  // Mutation para editar série
  const editMutation = useMutation({
    mutationFn: (data: SeriesFormData) => {
      if (!selectedSeries?.id) throw new Error("ID da série não encontrado");
      return apiRequest<InsertSeries>("PUT", `/api/series/${selectedSeries.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series"] });
      setIsEditDialogOpen(false);
      form.reset();
      setSelectedSeries(null);
      toast({
        title: "Série atualizada",
        description: "A série foi atualizada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar série",
        description: error.message || "Ocorreu um erro ao atualizar a série.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar série
  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest("DELETE", `/api/series/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series"] });
      setIsDeleteDialogOpen(false);
      setSelectedSeries(null);
      toast({
        title: "Série excluída",
        description: "A série foi excluída com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir série",
        description: error.message || "Ocorreu um erro ao excluir a série.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SeriesFormData) => {
    if (selectedSeries) {
      editMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (series: SeriesWithAuthor) => {
    setSelectedSeries(series);
    form.reset({
      name: series.name,
      authorId: series.authorId,
      description: series.description || "",
      coverUrl: series.coverUrl || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (series: SeriesWithAuthor) => {
    setSelectedSeries(series);
    setIsDeleteDialogOpen(true);
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
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6">
                  Carregando séries...
                </TableCell>
              </TableRow>
            ) : series && series.length > 0 ? (
              series.map((series) => (
                <TableRow key={series.id}>
                  <TableCell className="font-medium">{series.name}</TableCell>
                  <TableCell>{series.author?.name || "Sem autor"}</TableCell>
                  <TableCell>{series.totalBooks || 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(series)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(series)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6">
                  Nenhuma série encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Criar/Editar */}
      <Dialog 
        open={isCreateDialogOpen || isEditDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedSeries(null);
            form.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSeries ? "Editar Série" : "Criar Nova Série"}
            </DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para {selectedSeries ? "editar a" : "criar uma nova"} série.
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
                        {authors?.map((author) => (
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
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                    setSelectedSeries(null);
                    form.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || editMutation.isPending}
                >
                  {createMutation.isPending || editMutation.isPending
                    ? "Salvando..."
                    : selectedSeries
                    ? "Salvar Alterações"
                    : "Criar Série"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a série "{selectedSeries?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setSelectedSeries(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedSeries && deleteMutation.mutate(selectedSeries.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}