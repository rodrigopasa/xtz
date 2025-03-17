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
import { PlusCircle, Edit, Trash2, Book } from "lucide-react";
import AdminHeader from "@/components/layout/admin-header";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { slugify } from "@/lib/utils";

// Esquema de validação para o formulário de série
const seriesFormSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  authorId: z.coerce.number({ required_error: "Autor é obrigatório" }),
  description: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
});

// Tipo de dados da série
interface Series {
  id: number;
  name: string;
  slug: string;
  authorId: number;
  bookCount: number;
  description: string | null;
  coverUrl: string | null;
  author?: {
    id: number;
    name: string;
    slug: string;
  };
  totalBooks?: number;
  previewBooks?: any[];
}

// Tipo de dados de autor
interface Author {
  id: number;
  name: string;
  slug: string;
}

export default function AdminSeries() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar séries
  const { data: series, isLoading } = useQuery({
    queryKey: ["/api/series"],
    select: (data: any) => data as Series[],
  });

  // Buscar autores para a lista suspensa
  const { data: authors } = useQuery({
    queryKey: ["/api/authors"],
    select: (data: any) => data as Author[],
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

  // Formulário para editar uma série existente
  const editForm = useForm<z.infer<typeof seriesFormSchema>>({
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
      return apiRequest("POST", "/api/series", {
        ...data,
        slug: slugify(data.name),
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
      toast({
        title: "Erro ao criar série",
        description: error.message || "Ocorreu um erro ao criar a série. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar uma série existente
  const updateMutation = useMutation({
    mutationFn: (data: z.infer<typeof seriesFormSchema> & { id: number }) => {
      return apiRequest("PUT", `/api/series/${data.id}`, {
        ...data,
        slug: slugify(data.name),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series"] });
      setIsEditDialogOpen(false);
      setSelectedSeries(null);
      editForm.reset();
      toast({
        title: "Série atualizada",
        description: "A série foi atualizada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar série",
        description: error.message || "Ocorreu um erro ao atualizar a série. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir uma série
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
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir série",
        description: error.message || "Ocorreu um erro ao excluir a série. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Função para abrir o diálogo de edição e preencher o formulário
  const handleEditSeries = (series: Series) => {
    setSelectedSeries(series);
    editForm.setValue("name", series.name);
    editForm.setValue("authorId", series.authorId);
    editForm.setValue("description", series.description || "");
    editForm.setValue("coverUrl", series.coverUrl || "");
    setIsEditDialogOpen(true);
  };

  // Função para abrir o diálogo de exclusão
  const handleDeleteSeries = (series: Series) => {
    setSelectedSeries(series);
    setIsDeleteDialogOpen(true);
  };

  const onCreateSubmit = (data: z.infer<typeof seriesFormSchema>) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: z.infer<typeof seriesFormSchema>) => {
    if (selectedSeries) {
      updateMutation.mutate({ ...data, id: selectedSeries.id });
    }
  };

  const confirmDelete = () => {
    if (selectedSeries) {
      deleteMutation.mutate(selectedSeries.id);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar />
      <div className="flex-1">
        <AdminHeader />
        <main className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Gerenciar Séries</h1>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Série
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p>Carregando séries...</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead>Livros</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {series && series.length > 0 ? (
                    series.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.author?.name || 'Sem autor'}</TableCell>
                        <TableCell>{item.totalBooks || 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditSeries(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSeries(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <Link href={`/admin/series/${item.id}/books`}>
                                <Book className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6">
                        Nenhuma série encontrada. Crie sua primeira série clicando no botão acima.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Diálogo para criar uma nova série */}
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
                    control={createForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descrição da série (opcional)"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="coverUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL da Capa</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="URL da imagem de capa (opcional)"
                            {...field}
                            value={field.value || ""}
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

          {/* Diálogo para editar uma série existente */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Série</DialogTitle>
                <DialogDescription>
                  Atualize as informações da série.
                </DialogDescription>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <FormField
                    control={editForm.control}
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
                    control={editForm.control}
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
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descrição da série (opcional)"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="coverUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL da Capa</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="URL da imagem de capa (opcional)"
                            {...field}
                            value={field.value || ""}
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
                      onClick={() => setIsEditDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Diálogo para confirmar exclusão */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogDescription>
                  Você tem certeza que deseja excluir a série "{selectedSeries?.name}"?
                  {selectedSeries && selectedSeries.totalBooks && selectedSeries.totalBooks > 0 && (
                    <p className="text-red-500 mt-2">
                      Atenção: Esta série contém {selectedSeries.totalBooks} livro(s). Excluir a série removerá a associação desses livros à série, mas não excluirá os livros.
                    </p>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Excluindo..." : "Excluir Série"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}