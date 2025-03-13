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
  Pencil,
  Plus,
  Save,
  Trash2,
  Rocket,
  Heart,
  Search,
  Landmark,
  Leaf,
  Baby,
  BookOpen,
  Globe,
  Brain,
  Utensils,
  Music,
  Palette,
  Code,
  Briefcase,
  GraduationCap,
  Dumbbell,
  AlertCircle
} from "lucide-react";

// Schema de validação para categoria
const categorySchema = z.object({
  name: z.string().min(3, {
    message: "O nome deve ter pelo menos 3 caracteres",
  }),
  slug: z.string().min(3, {
    message: "O slug deve ter pelo menos 3 caracteres",
  }),
  iconName: z.string().min(1, {
    message: "Selecione um ícone",
  }),
});

export default function AdminCategories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Carregar categorias
  const { data: categories, isLoading } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Formulário de criação
  const createForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      slug: "",
      iconName: "book",
    },
  });

  // Formulário de edição
  const editForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      slug: "",
      iconName: "book",
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

  // Mutação para criar categoria
  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof categorySchema>) => {
      return apiRequest("POST", "/api/categories", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Categoria criada",
        description: "A categoria foi criada com sucesso",
      });
      setOpenCreateDialog(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a categoria",
        variant: "destructive",
      });
    },
  });

  // Mutação para atualizar categoria
  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: z.infer<typeof categorySchema> }) => {
      return apiRequest("PUT", `/api/categories/${id}`, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Categoria atualizada",
        description: "A categoria foi atualizada com sucesso",
      });
      setOpenEditDialog(false);
      setSelectedCategory(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar a categoria",
        variant: "destructive",
      });
    },
  });

  // Mutação para excluir categoria
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Categoria excluída",
        description: "A categoria foi excluída com sucesso",
      });
      setOpenDeleteDialog(false);
      setSelectedCategory(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir a categoria. Verifique se não há livros associados a ela.",
        variant: "destructive",
      });
    },
  });

  // Função para renderizar ícone
  const renderIcon = (iconName: string, size = 18) => {
    const icons: Record<string, any> = {
      rocket: <Rocket size={size} />,
      heart: <Heart size={size} />,
      search: <Search size={size} />,
      landmark: <Landmark size={size} />,
      seedling: <Leaf size={size} />,
      child: <Baby size={size} />,
      book: <BookOpen size={size} />,
      globe: <Globe size={size} />,
      brain: <Brain size={size} />,
      utensils: <Utensils size={size} />,
      music: <Music size={size} />,
      palette: <Palette size={size} />,
      code: <Code size={size} />,
      briefcase: <Briefcase size={size} />,
      graduation: <GraduationCap size={size} />,
      dumbbell: <Dumbbell size={size} />,
    };

    return icons[iconName] || <BookOpen size={size} />;
  };

  // Opções de ícones para o formulário
  const iconOptions = [
    { value: "rocket", label: "Foguete", icon: <Rocket size={16} /> },
    { value: "heart", label: "Coração", icon: <Heart size={16} /> },
    { value: "search", label: "Lupa", icon: <Search size={16} /> },
    { value: "landmark", label: "Marco", icon: <Landmark size={16} /> },
    { value: "seedling", label: "Planta", icon: <Leaf size={16} /> },
    { value: "child", label: "Criança", icon: <Baby size={16} /> },
    { value: "book", label: "Livro", icon: <BookOpen size={16} /> },
    { value: "globe", label: "Globo", icon: <Globe size={16} /> },
    { value: "brain", label: "Cérebro", icon: <Brain size={16} /> },
    { value: "utensils", label: "Talheres", icon: <Utensils size={16} /> },
    { value: "music", label: "Música", icon: <Music size={16} /> },
    { value: "palette", label: "Paleta", icon: <Palette size={16} /> },
    { value: "code", label: "Código", icon: <Code size={16} /> },
    { value: "briefcase", label: "Pasta", icon: <Briefcase size={16} /> },
    { value: "graduation", label: "Formatura", icon: <GraduationCap size={16} /> },
    { value: "dumbbell", label: "Haltere", icon: <Dumbbell size={16} /> },
  ];

  // Manipuladores de eventos
  const handleCreateSubmit = (values: z.infer<typeof categorySchema>) => {
    createMutation.mutate(values);
  };

  const handleEditSubmit = (values: z.infer<typeof categorySchema>) => {
    if (selectedCategory) {
      updateMutation.mutate({ id: selectedCategory, values });
    }
  };

  const handleEditClick = (category: any) => {
    setSelectedCategory(category.id);
    editForm.reset({
      name: category.name,
      slug: category.slug,
      iconName: category.iconName,
    });
    setOpenEditDialog(true);
  };

  const handleDeleteClick = (id: number) => {
    setSelectedCategory(id);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedCategory) {
      deleteMutation.mutate(selectedCategory);
    }
  };

  return (
    <main className="flex-grow p-6 bg-neutral-100 overflow-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-serif text-2xl md:text-3xl font-bold">Gerenciar Categorias</h1>
          <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-dark">
                <Plus className="mr-2" size={16} /> Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Categoria</DialogTitle>
                <DialogDescription>
                  Crie uma nova categoria para organizar os livros
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
                          <Input placeholder="Ex: Ficção Científica" {...field} />
                        </FormControl>
                        <FormDescription>
                          Nome da categoria exibido para os usuários
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
                          <Input placeholder="Ex: ficcao-cientifica" {...field} />
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
                    name="iconName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ícone</FormLabel>
                        <div className="grid grid-cols-4 gap-2">
                          {iconOptions.map((option) => (
                            <Button
                              key={option.value}
                              type="button"
                              variant={field.value === option.value ? "default" : "outline"}
                              className="flex flex-col items-center justify-center py-3 h-auto"
                              onClick={() => createForm.setValue("iconName", option.value)}
                            >
                              {option.icon}
                              <span className="text-xs mt-1">{option.label}</span>
                            </Button>
                          ))}
                        </div>
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
                      {createMutation.isPending ? "Criando..." : "Criar Categoria"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Categorias</CardTitle>
            <CardDescription>
              Gerencie as categorias para organização dos livros
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
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
                      <TableHead>Ícone</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Livros</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories?.length > 0 ? (
                      categories.map((category: any) => (
                        <TableRow key={category.id}>
                          <TableCell>
                            <div className="w-10 h-10 flex items-center justify-center bg-primary/10 text-primary rounded-full">
                              {renderIcon(category.iconName)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>{category.slug}</TableCell>
                          <TableCell>{category.bookCount}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditClick(category)}
                              >
                                <Pencil size={16} />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => handleDeleteClick(category.id)}
                                disabled={category.bookCount > 0}
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
                            <p>Nenhuma categoria encontrada</p>
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
            <span>Total: {categories?.length || 0} categorias</span>
            <span>Obs: Categorias com livros associados não podem ser excluídas</span>
          </CardFooter>
        </Card>
      </div>

      {/* Dialog de edição */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
            <DialogDescription>
              Atualize as informações da categoria
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
                      <Input placeholder="Ex: Ficção Científica" {...field} />
                    </FormControl>
                    <FormDescription>
                      Nome da categoria exibido para os usuários
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
                      <Input placeholder="Ex: ficcao-cientifica" {...field} />
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
                name="iconName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ícone</FormLabel>
                    <div className="grid grid-cols-4 gap-2">
                      {iconOptions.map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          variant={field.value === option.value ? "default" : "outline"}
                          className="flex flex-col items-center justify-center py-3 h-auto"
                          onClick={() => editForm.setValue("iconName", option.value)}
                        >
                          {option.icon}
                          <span className="text-xs mt-1">{option.label}</span>
                        </Button>
                      ))}
                    </div>
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
              Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.
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
