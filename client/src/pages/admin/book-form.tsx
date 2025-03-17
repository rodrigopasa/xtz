import { useState, useEffect, useRef } from "react";
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
import FileUpload from "@/components/upload/FileUpload";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Upload, File, FileText, X, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Author {
  id: number;
  name: string;
  slug: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Series {
  id: number;
  name: string;
  authorId: number;
}

interface Book {
  id: number;
  title: string;
  slug: string;
  authorId: number;
  categoryId: number;
  description: string;
  coverUrl: string;
  epubUrl: string | null;
  pdfUrl: string | null;
  amazonUrl: string | null;
  format: 'epub' | 'pdf' | 'both';
  pageCount: number | null;
  isbn: string | null;
  publishYear: number | null;
  publisher: string | null;
  language: string;
  isFeatured: boolean;
  isNew: boolean;
  isFree: boolean;
  seriesId: number | null;
  volumeNumber: number | null;
}

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
  coverUrl: z.string().min(1, {
    message: "A URL da capa é obrigatória",
  }),
  epubUrl: z.string().min(0).optional().or(z.literal("")),
  pdfUrl: z.string().min(0).optional().or(z.literal("")),
  amazonUrl: z.string().url({
    message: "Insira uma URL válida para o livro na Amazon.",
  }).optional().or(z.literal("")),
  format: z.enum(["epub", "pdf", "both"], {
    message: "Selecione um formato válido.",
  }),
  pageCount: z.coerce.number().optional(),
  isbn: z.string().optional(),
  publishYear: z.coerce.number().optional(),
  publisher: z.string().optional(),
  language: z.string().default("pt-BR"),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isFree: z.boolean().default(false),
  seriesId: z.number().optional().nullable(),
  volumeNumber: z.number().optional().nullable(),
});

export default function BookForm({ id }: BookFormProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const isEditMode = !!id;

  // Refs e estados para upload de arquivo
  const epubFileInputRef = useRef<HTMLInputElement>(null);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const [epubFile, setEpubFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [epubUploading, setEpubUploading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Buscar dados do livro para edição
  const { data: book, isLoading: bookLoading, isError: bookError } = useQuery<Book>({
    queryKey: [`/api/books/${id}`],
    enabled: isEditMode,
  });

  // Buscar autores e categorias
  const { data: authors, isLoading: authorsLoading } = useQuery<Author[]>({
    queryKey: ["/api/authors"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Buscar séries disponíveis
  const { data: series, isLoading: seriesLoading } = useQuery<Series[]>({
    queryKey: ["/api/series"],
    enabled: !!selectedAuthor, // Só buscar séries quando um autor for selecionado
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
      seriesId: null,
      volumeNumber: null,
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
        seriesId: book.seriesId,
        volumeNumber: book.volumeNumber,
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
      // Converter strings para números e tratar campos opcionais
      const payload = {
        ...values,
        authorId: parseInt(values.authorId),
        categoryId: parseInt(values.categoryId),
        seriesId: values.seriesId,
        volumeNumber: values.volumeNumber,
        pageCount: values.pageCount || null,
        publishYear: values.publishYear || null,
      };

      console.log("Sending payload:", payload); // Debug log

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
      console.error("Error saving book:", error); // Debug log
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar o livro.",
        variant: "destructive",
      });
    },
  });

  // Funções para upload de arquivos
  const handleEpubFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEpubFile(e.target.files[0]);
    }
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleUploadEpub = async () => {
    if (!epubFile) return;

    setEpubUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', epubFile);

      // Simular o progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 5;
        });
      }, 200);

      const response = await apiRequest("POST", "/api/upload/epub", formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response && response.epubUrl) {
        form.setValue("epubUrl", response.epubUrl);
        toast({
          title: "Arquivo EPUB enviado",
          description: "O arquivo EPUB foi enviado com sucesso.",
        });
      } else {
        console.error("Resposta do upload não contém epubUrl:", response);
        toast({
          title: "Erro ao salvar arquivo",
          description: "O arquivo foi enviado mas a URL não foi retornada corretamente.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao enviar arquivo",
        description: error.message || "Ocorreu um erro ao enviar o arquivo EPUB.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setEpubUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleUploadPdf = async () => {
    if (!pdfFile) return;

    setPdfUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', pdfFile);

      // Simular o progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 5;
        });
      }, 200);

      const response = await apiRequest("POST", "/api/upload/pdf", formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response && response.pdfUrl) {
        form.setValue("pdfUrl", response.pdfUrl);
        toast({
          title: "Arquivo PDF enviado",
          description: "O arquivo PDF foi enviado com sucesso.",
        });
      } else {
        console.error("Resposta do upload não contém pdfUrl:", response);
        toast({
          title: "Erro ao salvar arquivo",
          description: "O arquivo foi enviado mas a URL não foi retornada corretamente.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao enviar arquivo",
        description: error.message || "Ocorreu um erro ao enviar o arquivo PDF.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setPdfUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

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
    <main className="flex-grow p-6 bg-neutral-900 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/livros")}
              className="mr-2 text-white hover:bg-neutral-800"
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-white">
              {isEditMode ? "Editar Livro" : "Adicionar Novo Livro"}
            </h1>
          </div>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={mutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 flex items-center text-white"
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
                                      authors.map((author: Author) => (
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
                                      categories.map((category: Category) => (
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
                              <FormLabel>Capa do livro*</FormLabel>
                              <FormControl>
                                <div className="space-y-4">
                                  <FileUpload
                                    endpoint="/api/upload/cover"
                                    fileType="cover"
                                    allowedTypes={[".jpg", ".jpeg", ".png", "image/jpeg", "image/png"]}
                                    maxSizeMB={5}
                                    onSuccess={(url) => field.onChange(url)}
                                  />
                                  {field.value && (
                                    <div className="relative rounded-md border overflow-hidden w-36 h-48">
                                      <img
                                        src={field.value}
                                        alt="Capa do livro"
                                        className="object-cover w-full h-full"
                                      />
                                    </div>
                                  )}
                                  <Input
                                    type="hidden"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>
                                Faça upload da imagem de capa do livro. Formato recomendado: JPG ou PNG.
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

                      {/* Series section */}
                      {selectedAuthor && (
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="seriesId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Série</FormLabel>
                                <Select
                                  value={field.value || "none"}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione uma série (opcional)" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">Nenhuma série</SelectItem>
                                    {seriesLoading ? (
                                      <div className="py-2 px-4 text-center">
                                        Carregando séries...
                                      </div>
                                    ) : series?.length > 0 ? (
                                      series
                                        .filter((s: Series) => s.authorId === parseInt(selectedAuthor))
                                        .map((s: Series) => (
                                          <SelectItem key={s.id} value={s.id.toString()}>
                                            {s.name}
                                          </SelectItem>
                                        ))
                                    ) : (
                                      <div className="py-2 px-4 text-center">
                                        Nenhuma série encontrada
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Selecione uma série caso este livro faça parte de uma
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {form.watch("seriesId") && form.watch("seriesId") !== "none" && (
                            <FormField
                              control={form.control}
                              name="volumeNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Número do Volume</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="Ex: 1"
                                      {...field}
                                      value={field.value || ""}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        field.onChange(value ? parseInt(value) : null);
                                      }}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Informe o número do volume deste livro na série
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      )}
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
                            <FormLabel>Arquivo EPUB</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="https://example.com/livro.epub" {...field} />
                              </FormControl>
                              <div className="relative">
                                <input
                                  type="file"
                                  ref={epubFileInputRef}
                                  onChange={handleEpubFileChange}
                                  accept=".epub"
                                  className="sr-only"
                                  aria-hidden="true"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => epubFileInputRef.current?.click()}
                                  disabled={epubUploading}
                                >
                                  <File className="w-4 h-4 mr-2" />
                                  Selecionar
                                </Button>
                              </div>
                              {epubFile && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={handleUploadEpub}
                                  disabled={epubUploading}
                                  className="flex-shrink-0"
                                >
                                  {epubUploading ? (
                                    <>
                                      <span className="mr-2">{uploadProgress}%</span>
                                      <span>Enviando...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-2" />
                                      <span>Enviar</span>
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                            {epubFile && !epubUploading && (
                              <div className="flex items-center text-sm mt-1 text-neutral-600">
                                <FileText className="w-4 h-4 mr-1" />
                                <span className="truncate">{epubFile.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 ml-1"
                                  onClick={() => setEpubFile(null)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            <FormDescription>
                              Digite a URL ou faça upload de um arquivo EPUB.
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
                            <FormLabel>Arquivo PDF</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="https://example.com/livro.pdf" {...field} />
                              </FormControl>
                              <div className="relative">
                                <input
                                  type="file"
                                  ref={pdfFileInputRef}
                                  onChange={handlePdfFileChange}
                                  accept=".pdf"
                                  className="sr-only"
                                  aria-hidden="true"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => pdfFileInputRef.current?.click()}
                                  disabled={pdfUploading}
                                >
                                  <File className="w-4 h-4 mr-2" />
                                  Selecionar
                                </Button>
                              </div>
                              {pdfFile && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={handleUploadPdf}
                                  disabled={pdfUploading}
                                  className="flex-shrink-0"
                                >
                                  {pdfUploading ? (
                                    <>
                                      <span className="mr-2">{uploadProgress}%</span>
                                      <span>Enviando...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-2" />
                                      <span>Enviar</span>
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                            {pdfFile && !pdfUploading && (
                              <div className="flex items-center text-sm mt-1 text-neutral-600">
                                <FileText className="w-4 h-4 mr-1" />
                                <span className="truncate">{pdfFile.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 ml-1"
                                  onClick={() => setPdfFile(null)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            <FormDescription>
                              Digite a URL ou faça upload de um arquivo PDF.
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
                          ? authors.find((a: Author) => a.id.toString() === selectedAuthor)?.name
                          : "Autor"}
                      </p>

                      <div className="flex items-center mb-4">
                        <span className="bg-neutral-100 text-neutral-800 text-sm py-1 px-3 rounded-full mr-2">
                          {selectedCategory && categories
                            ? categories.find((c: Category) => c.id.toString() === selectedCategory)?.name
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