import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Pencil,
  Plus,
  Search,
  Trash2,
  AlertCircle,
  FileText,
  UserCheck
} from "lucide-react";

// Schema de validação para autor
const authorSchema = z.object({
  name: z.string().min(3, {
    message: "O nome deve ter pelo menos 3 caracteres",
  }),
  slug: z.string().min(3, {
    message: "O slug deve ter pelo menos 3 caracteres",
  }),
  bio: z.string().optional(),
  imageUrl: z.union([
    z.string().url({ message: "Insira uma URL válida para a imagem" }),
    z.string().max(0) // String vazia
  ]).optional(),
});

export default function AdminAuthors() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Carregar autores
  const { data: authors, isLoading } = useQuery({
    queryKey: ["/api/authors"],
  });

  // Formulário de criação
  const createForm = useForm<z.infer<typeof authorSchema>>({
    resolver: zodResolver(authorSchema),
    defaultValues: {
      name: "",
      slug: "",
      bio: "",
      imageUrl: "",
    },
  });

  // Formulário de edição
  const editForm = useForm<z.infer<typeof authorSchema>>({
    resolver: zodResolver(authorSchema),
    defaultValues: {
      name: "",
      slug: "",
      bio: "",
      imageUrl: "",
    },
  });

  // Atualizar slug automaticamente a partir do nome (formulário de criação)
  createForm.watch((value, { name }) => {
    if (name === "name" && value.name && !createForm.formState.dirtyFields.slug) {
      createForm.setValue("slug", slugify(value.name));
    }
  });

  // Atualizar slug automaticamente a partir do nome (formulário de edição)
  editForm.watch((value, { name }) => {
    if (name === "name" && value.name && !editForm.formState.dirtyFields.slug) {
      editForm.setValue("slug", slugify(value.name));
    }
  });

  // Mutação para criar autor
  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof authorSchema>) => {
      return apiRequest("POST", "/api/authors", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authors"] });
      toast({
        title: "Autor criado",
        description: "O autor foi adicionado com sucesso",
      });
      setOpenCreateDialog(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o autor",
        variant: "destructive",
      });
    },
  });

  // Mutação para atualizar autor
  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: z.infer<typeof authorSchema> }) => {
      return apiRequest("PUT", `/api/authors/${id}`, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authors"] });
      toast({
        title: "Autor atualizado",
        description: "O autor foi atualizado com sucesso",
      });
      setOpenEditDialog(false);
      setSelectedAuthor(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o autor",
        variant: "destructive",
      });
    },
  });

  // Mutação para excluir autor
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/authors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authors"] });
      toast({
        title: "Autor excluído",
        description: "O autor foi excluído com sucesso",
      });
      setOpenDeleteDialog(false);
      setSelectedAuthor(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o autor. Verifique se não há livros associados a ele.",
        variant: "destructive",
      });
    },
  });

  // Manipuladores de eventos
  const handleCreateSubmit = (values: z.infer<typeof authorSchema>) => {
    createMutation.mutate(values);
  };

  const handleEditSubmit = (values: z.infer<typeof authorSchema>) => {
    if (selectedAuthor) {
      updateMutation.mutate({ id: selectedAuthor, values });
    }
  };

  const handleEditClick = (author: any) => {
    setSelectedAuthor(author.id);
    editForm.reset({
      name: author.name,
      slug: author.slug,
      bio: author.bio || "",
      imageUrl: author.imageUrl || "",
    });
    setOpenEditDialog(true);
  };

  const handleDeleteClick = (id: number) => {
    setSelectedAuthor(id);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedAuthor) {
      deleteMutation.mutate(selectedAuthor);
    }
  };

  // Filtrar autores pelo termo de busca
  const filteredAuthors = Array.isArray(authors)
    ? authors.filter((author: any) => 
        author.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  return (
    <main className="flex-grow p-6 bg-neutral-100 overflow-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-serif text-2xl md:text-3xl font-bold">Gerenciar Autores</h1>
          <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-dark">
                <Plus className="mr-2" size={16} /> Novo Autor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Autor</DialogTitle>
                <DialogDescription>
                  Adicione um novo autor à plataforma
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: J. R. R. Tolkien" {...field} />
                        </FormControl>
                        <FormDescription>
                          Nome completo do autor
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: j-r-r-tolkien" {...field} />
                        </FormControl>
                        <FormDescription>
                          Usado na URL. Gerado automaticamente a partir do nome
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biografia</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Informações sobre o autor..." 
                            rows={5}
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Uma breve biografia do autor
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL da imagem</FormLabel>
                        <FormControl>
                          <Input placeholder="https://exemplo.com/imagem.jpg" {...field} />
                        </FormControl>
                        <FormDescription>
                          Link para a foto do autor (opcional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpenCreateDialog(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="bg-primary hover:bg-primary-dark"
                    >
                      {createMutation.isPending ? "Criando..." : "Criar Autor"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <Input
                placeholder="Buscar autor por nome..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Autores</CardTitle>
            <CardDescription>
              Gerencie os autores disponíveis na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div>
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-9 rounded-md" />
                      <Skeleton className="h-9 w-9 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Foto</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Biografia</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuthors.length > 0 ? (
                      filteredAuthors.map((author: any) => (
                        <TableRow key={author.id}>
                          <TableCell>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={author.imageUrl} alt={author.name} />
                              <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium">{author.name}</TableCell>
                          <TableCell>{author.slug}</TableCell>
                          <TableCell>
                            {author.bio ? (
                              <div className="flex items-center text-sm text-neutral-500">
                                <FileText className="mr-1" size={14} />
                                <span className="truncate max-w-[200px]">{author.bio}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-neutral-400">Sem biografia</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditClick(author)}
                              >
                                <Pencil size={16} />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => handleDeleteClick(author.id)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6">
                          <div className="flex flex-col items-center justify-center text-neutral-500">
                            <AlertCircle className="mb-2" size={24} />
                            <p>Nenhum autor encontrado</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t p-4 text-sm text-neutral-500">
            <span>Total: {filteredAuthors.length} / {Array.isArray(authors) ? authors.length : 0} autores</span>
            <span>Obs: Autores com livros associados não podem ser excluídos</span>
          </CardFooter>
        </Card>
      </div>

      {/* Dialog de edição */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Autor</DialogTitle>
            <DialogDescription>
              Atualize as informações do autor
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: J. R. R. Tolkien" {...field} />
                    </FormControl>
                    <FormDescription>
                      Nome completo do autor
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: j-r-r-tolkien" {...field} />
                    </FormControl>
                    <FormDescription>
                      Usado na URL. Gerado automaticamente a partir do nome
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biografia</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Informações sobre o autor..." 
                        rows={5}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Uma breve biografia do autor
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da imagem</FormLabel>
                    <FormControl>
                      <Input placeholder="https://exemplo.com/imagem.jpg" {...field} />
                    </FormControl>
                    <FormDescription>
                      Link para a foto do autor (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenEditDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-primary hover:bg-primary-dark"
                >
                  {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este autor? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenDeleteDialog(false)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
