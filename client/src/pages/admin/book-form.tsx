import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { slugify } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BookFormProps {
  id?: number;
}

const bookFormSchema = z.object({
  title: z.string().min(2, {
    message: "O título deve ter pelo menos 2 caracteres.",
  }),
  slug: z.string().min(2, {
    message: "O slug deve ter pelo menos 2 caracteres.",
  }),
  authorId: z.string().min(1, {
    message: "Selecione um autor.",
  }),
  categoryId: z.string().min(1, {
    message: "Selecione uma categoria.",
  }),
  description: z.string().min(10, {
    message: "A descrição deve ter pelo menos 10 caracteres.",
  }),
  coverUrl: z.string().url({
    message: "Insira uma URL válida para a capa do livro.",
  }),
  epubUrl: z.string().url({
    message: "Insira uma URL válida para o arquivo EPUB.",
  }).optional().or(z.literal("")),
  pdfUrl: z.string().url({
    message: "Insira uma URL válida para o arquivo PDF.",
  }).optional().or(z.literal("")),
  amazonUrl: z.string().url({
    message: "Insira uma URL válida para o livro na Amazon.",
  }).optional().or(z.literal("")),
  format: z.enum(["epub", "pdf", "both"], {
    message: "Selecione um formato válido.",
  }),
  pageCount: z.string().transform((val) => (val === "" ? 0 : parseInt(val, 10))),
  isbn: z.string().optional(),
  publishYear: z.string().transform((val) => (val === "" ? 0 : parseInt(val, 10))),
  publisher: z.string().optional(),
  language: z.string().default("pt-BR"),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isFree: z.boolean().default(false),
});

export default function BookForm({ id }: BookFormProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const isEditMode = !!id;
  
  // Buscar dados do livro para edição
  const { data: book, isLoading: bookLoading, isError: bookError } = useQuery({
    queryKey: [`/api/books/${id}`],
    enabled: isEditMode,
  });
  
  // Buscar autores e categorias
  const { data: authors, isLoading: authorsLoading } = useQuery({
    queryKey: ["/api/authors"],
  });
  
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
  });
  
  // Configurar o formulário
  const form = useForm<z.infer<typeof bookFormSchema>>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      title: "",
      slug: "",
      authorId: "",
      categoryId: "",
      description: "",
      coverUrl: "",
      epubUrl: "",
      pdfUrl: "",
      amazonUrl: "",
      format: "both",
      pageCount: "",
      isbn: "",
      publishYear: "",
      publisher: "",
      language: "pt-BR",
      isFeatured: false,
      isNew: false,
      isFree: false,
    },
  });
  
  // Preencher o formulário com dados do livro quando carregado
  useEffect(() => {
    if (book && !form.formState.isDirty) {
      form.reset({
        title: book.title,
        slug: book.slug,
        authorId: book.authorId.toString(),
        categoryId: book.categoryId.toString(),
        description: book.description,
        coverUrl: book.coverUrl,
        epubUrl: book.epubUrl || "",
        pdfUrl: book.pdfUrl || "",
        amazonUrl: book.amazonUrl || "",
        format: book.format,
        pageCount: book.pageCount?.toString() || "",
        isbn: book.isbn || "",
        publishYear: book.publishYear?.toString() || "",
        publisher: book.publisher || "",
        language: book.language || "pt-BR",
        isFeatured: book.isFeatured || false,
        isNew: book.isNew || false,
        isFree: book.isFree || false,
      });
      
      setSelectedAuthor(book.authorId.toString());
      setSelectedCategory(book.categoryId.toString());
    }
  }, [book, form]);
  
  // Atualizar slug automaticamente a partir do título
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "title" && value.title && !form.formState.dirtyFields.slug) {
        form.setValue("slug", slugify(value.title));
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);
  
  // Mutação para criar ou atualizar livro
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof bookFormSchema>) => {
      // Converter strings para números
      const payload = {
        ...values,
        authorId: parseInt(values.authorId),
        categoryId: parseInt(values.categoryId),
      };
      
      if (isEditMode) {
        return apiRequest("PUT", `/api/books/${id}`, payload);
      } else {
        return apiRequest("POST", "/api/books", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({
        title: isEditMode ? "Livro atualizado" : "Livro criado",
        description: isEditMode 
          ? "O livro foi atualizado com sucesso." 
          : "O livro foi criado com sucesso.",
      });
      navigate("/admin/livros");
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar o livro.",
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(values: z.infer<typeof bookFormSchema>) {
    mutation.mutate(values);
  }
  
  if (isEditMode && bookError) {
    return (
      <main className="flex-grow p-6 bg-neutral-100">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 text-center">
            <h2 className="text-xl font-medium mb-2">Livro não encontrado</h2>
            <p className="text-neutral-600 mb-4">O livro que você está tentando editar não existe ou foi removido.</p>
            <Button onClick={() => navigate("/admin/livros")}>
              Voltar para a lista de livros
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow p-6 bg-neutral-100 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/admin/livros")}
              className="mr-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="font-serif text-2xl md:text-3xl font-bold">
              {isEditMode ? "Editar Livro" : "Adicionar Novo Livro"}
            </h1>
          </div>
          <Button 
            onClick={form.handleSubmit(onSubmit)}
            disabled={mutation.isPending}
            className="bg-primary hover:bg-primary-dark flex items-center"
          >
            <Save className="mr-2" size={16} />
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
        
        {isEditMode && bookLoading ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Informações básicas</TabsTrigger>
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                  <TabsTrigger value="files">Arquivos e Links</TabsTrigger>
                </TabsList>
                
                {/* Informações Básicas */}
                <TabsContent value="basic">
                  <Card>
                    <CardHeader>
                      <CardTitle>Informações básicas</CardTitle>
                      <CardDescription>
                        Preencha as informações básicas do livro.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Título*</FormLabel>
                              <FormControl>
                                <Input placeholder="Título do livro" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="slug"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Slug*</FormLabel>
                              <FormControl>
                                <Input placeholder="titulo-do-livro" {...field} />
                              </FormControl>
                              <FormDescription>
                                Usado na URL do livro. Será gerado automaticamente a partir do título.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="authorId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Autor*</FormLabel>
                                <Select 
                                  value={field.value} 
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    setSelectedAuthor(value);
                                  }}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione um autor" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {authorsLoading ? (
                                      <div className="py-2 px-4 text-center">
                                        Carregando autores...
                                      </div>
                                    ) : authors?.length > 0 ? (
                                      authors.map((author: any) => (
                                        <SelectItem key={author.id} value={author.id.toString()}>
                                          {author.name}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <div className="py-2 px-4 text-center">
                                        Nenhum autor encontrado
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Categoria*</FormLabel>
                                <Select 
                                  value={field.value} 
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    setSelectedCategory(value);
                                  }}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione uma categoria" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {categoriesLoading ? (
                                      <div className="py-2 px-4 text-center">
                                        Carregando categorias...
                                      </div>
                                    ) : categories?.length > 0 ? (
                                      categories.map((category: any) => (
                                        <SelectItem key={category.id} value={category.id.toString()}>
                                          {category.name}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <div className="py-2 px-4 text-center">
                                        Nenhuma categoria encontrada
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descrição*</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Descrição do livro" 
                                  rows={6}
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
                              <FormLabel>URL da capa*</FormLabel>
                              <FormControl>
                                <Input placeholder="https://example.com/capa.jpg" {...field} />
                              </FormControl>
                              <FormDescription>
                                URL da imagem da capa do livro.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="isFeatured"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Destaque</FormLabel>
                                  <FormDescription>
                                    Mostrar na seção de destaques
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="isNew"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Novo</FormLabel>
                                  <FormDescription>
                                    Marcar como lançamento
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="isFree"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Gratuito</FormLabel>
                                  <FormDescription>
                                    Marcar como livro gratuito
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Detalhes */}
                <TabsContent value="details">
                  <Card>
                    <CardHeader>
                      <CardTitle>Detalhes adicionais</CardTitle>
                      <CardDescription>
                        Informações complementares sobre o livro.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="publisher"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Editora</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome da editora" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="language"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Idioma</FormLabel>
                              <Select 
                                value={field.value} 
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o idioma" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                                  <SelectItem value="pt-PT">Português (Portugal)</SelectItem>
                                  <SelectItem value="en">Inglês</SelectItem>
                                  <SelectItem value="es">Espanhol</SelectItem>
                                  <SelectItem value="fr">Francês</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="publishYear"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ano de publicação</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="Ex: 2023" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="pageCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número de páginas</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="Ex: 320" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="isbn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ISBN</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: 9781234567890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Arquivos e Links */}
                <TabsContent value="files">
                  <Card>
                    <CardHeader>
                      <CardTitle>Arquivos e Links</CardTitle>
                      <CardDescription>
                        Adicione os arquivos do livro e links externos.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="format"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Formato disponível*</FormLabel>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o formato" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="epub">Somente EPUB</SelectItem>
                                <SelectItem value="pdf">Somente PDF</SelectItem>
                                <SelectItem value="both">EPUB e PDF</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="epubUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL do arquivo EPUB</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/livro.epub" {...field} />
                            </FormControl>
                            <FormDescription>
                              Link para download do arquivo EPUB.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="pdfUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL do arquivo PDF</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/livro.pdf" {...field} />
                            </FormControl>
                            <FormDescription>
                              Link para download do arquivo PDF.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="amazonUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Link para compra na Amazon</FormLabel>
                            <FormControl>
                              <Input placeholder="https://amazon.com.br/..." {...field} />
                            </FormControl>
                            <FormDescription>
                              Link para compra do livro na Amazon.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              
              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Pré-visualização</CardTitle>
                  <CardDescription>
                    Veja como o livro ficará na plataforma.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="md:w-1/3">
                      {form.watch("coverUrl") ? (
                        <img 
                          src={form.watch("coverUrl")}
                          alt="Pré-visualização da capa"
                          className="w-full h-auto rounded-lg shadow-md"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://via.placeholder.com/300x450?text=Capa+Inválida";
                          }}
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-neutral-200 rounded-lg flex items-center justify-center text-neutral-500">
                          Sem capa
                        </div>
                      )}
                    </div>
                    
                    <div className="md:w-2/3">
                      <h2 className="font-serif text-2xl font-bold mb-2">
                        {form.watch("title") || "Título do livro"}
                      </h2>
                      
                      <p className="text-neutral-600 mb-3">
                        {selectedAuthor && authors
                          ? authors.find((a: any) => a.id.toString() === selectedAuthor)?.name
                          : "Autor"}
                      </p>
                      
                      <div className="flex items-center mb-4">
                        <span className="bg-neutral-100 text-neutral-800 text-sm py-1 px-3 rounded-full mr-2">
                          {selectedCategory && categories
                            ? categories.find((c: any) => c.id.toString() === selectedCategory)?.name
                            : "Categoria"}
                        </span>
                        
                        {form.watch("isFeatured") && (
                          <span className="bg-secondary text-white text-sm py-1 px-3 rounded-full mr-2">
                            Destaque
                          </span>
                        )}
                        
                        {form.watch("isNew") && (
                          <span className="bg-accent text-black text-sm py-1 px-3 rounded-full mr-2">
                            Novo
                          </span>
                        )}
                        
                        {form.watch("isFree") && (
                          <span className="bg-success text-white text-sm py-1 px-3 rounded-full">
                            Grátis
                          </span>
                        )}
                      </div>
                      
                      <div className="prose max-w-none mb-6">
                        <p className="text-neutral-700 whitespace-pre-line">
                          {form.watch("description") || "Descrição do livro..."}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p><strong>Editora:</strong> {form.watch("publisher") || "—"}</p>
                          <p><strong>Publicação:</strong> {form.watch("publishYear") || "—"}</p>
                          <p><strong>Idioma:</strong> {form.watch("language") === "pt-BR" ? "Português (Brasil)" : form.watch("language")}</p>
                        </div>
                        <div>
                          <p><strong>Páginas:</strong> {form.watch("pageCount") || "—"}</p>
                          <p><strong>ISBN:</strong> {form.watch("isbn") || "—"}</p>
                          <p><strong>Formato:</strong> {
                            form.watch("format") === "epub" ? "EPUB" : 
                            form.watch("format") === "pdf" ? "PDF" : "EPUB e PDF"
                          }</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/admin/livros")}
                  >
                    Cancelar
                  </Button>
                  
                  <Button 
                    type="submit"
                    disabled={mutation.isPending}
                    className="bg-primary hover:bg-primary-dark"
                  >
                    {mutation.isPending 
                      ? (isEditMode ? "Atualizando..." : "Criando...") 
                      : (isEditMode ? "Atualizar livro" : "Criar livro")
                    }
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        )}
      </div>
    </main>
  );
}
