import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Button,
  buttonVariants,
} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  BookOpen, 
  FileDown,
  Pencil, 
  Star,
  Filter
} from "lucide-react";

export default function AdminBooks() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedBooks, setSelectedBooks] = useState<number[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Carregar livros
  const { data, isLoading } = useQuery({
    queryKey: ["/api/books"],
  });
  
  // Carregar categorias para filtro
  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
  });
  
  // Mutação para deletar livro
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/books/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({
        title: "Livro excluído",
        description: "O livro foi excluído com sucesso.",
      });
      setShowDeleteDialog(false);
      setBookToDelete(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o livro. Tente novamente.",
        variant: "destructive",
      });
    },
  });
  
  // Filtrar e paginar livros
  const filteredBooks = data
    ? data.filter((book: any) => {
        // Filtrar por termo de busca
        const matchesSearch = searchTerm
          ? book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.author.name.toLowerCase().includes(searchTerm.toLowerCase())
          : true;
          
        // Filtrar por categoria
        const matchesCategory = categoryFilter && categoryFilter !== "all"
          ? book.category.id === parseInt(categoryFilter)
          : true;
          
        // Filtrar por status
        const matchesStatus = statusFilter && statusFilter !== "all"
          ? (statusFilter === "featured" && book.isFeatured) ||
            (statusFilter === "new" && book.isNew) ||
            (statusFilter === "free" && book.isFree)
          : true;
          
        return matchesSearch && matchesCategory && matchesStatus;
      })
    : [];
    
  // Paginação
  const booksPerPage = 10;
  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
  const paginatedBooks = filteredBooks.slice(
    (page - 1) * booksPerPage,
    page * booksPerPage
  );
  
  // Manipuladores de eventos
  const handleSelectBook = (id: number) => {
    if (selectedBooks.includes(id)) {
      setSelectedBooks(selectedBooks.filter((bookId) => bookId !== id));
    } else {
      setSelectedBooks([...selectedBooks, id]);
    }
  };
  
  const handleSelectAllBooks = () => {
    if (selectedBooks.length === paginatedBooks.length) {
      setSelectedBooks([]);
    } else {
      setSelectedBooks(paginatedBooks.map((book: any) => book.id));
    }
  };
  
  const handleDeleteClick = (id: number) => {
    setBookToDelete(id);
    setShowDeleteDialog(true);
  };
  
  const handleConfirmDelete = () => {
    if (bookToDelete) {
      deleteMutation.mutate(bookToDelete);
    }
  };
  
  const handleBulkDelete = () => {
    // Implementação deixada como exercício
    toast({
      title: "Função em desenvolvimento",
      description: "A exclusão em massa será implementada em breve.",
    });
  };
  
  const handleResetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStatusFilter("all");
  };

  return (
    <main className="flex-grow p-6 bg-neutral-100 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-serif text-2xl md:text-3xl font-bold">Gerenciar Livros</h1>
          <Button asChild className="bg-primary hover:bg-primary-dark flex items-center">
            <Link href="/admin/livros/novo">
              <Plus className="mr-2" size={16} /> Adicionar Livro
            </Link>
          </Button>
        </div>
        
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <Input
                  placeholder="Buscar por título ou autor..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap gap-4">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todas categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas categorias</SelectItem>
                    {categories?.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Todos status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos status</SelectItem>
                    <SelectItem value="featured">Destaques</SelectItem>
                    <SelectItem value="new">Novos</SelectItem>
                    <SelectItem value="free">Gratuitos</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  onClick={handleResetFilters}
                  className="flex items-center"
                >
                  <Filter size={16} className="mr-2" /> Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-4 flex flex-row items-center justify-between">
            <CardTitle className="font-serif text-xl font-bold">Lista de Livros</CardTitle>
            
            {selectedBooks.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-neutral-500">
                  {selectedBooks.length} livro(s) selecionado(s)
                </span>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 size={16} className="mr-2" /> Excluir selecionados
                </Button>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={selectedBooks.length === paginatedBooks.length && paginatedBooks.length > 0}
                        onCheckedChange={handleSelectAllBooks}
                        aria-label="Selecionar todos os livros"
                      />
                    </TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Formatos</TableHead>
                    <TableHead className="text-center">Avaliação</TableHead>
                    <TableHead className="text-center">Downloads</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Skeleton className="h-12 w-8 mr-3" />
                            <Skeleton className="h-5 w-36" />
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : paginatedBooks.length > 0 ? (
                    paginatedBooks.map((book: any) => (
                      <TableRow key={book.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedBooks.includes(book.id)}
                            onCheckedChange={() => handleSelectBook(book.id)}
                            aria-label={`Selecionar ${book.title}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <img 
                              src={book.coverUrl}
                              alt={`Capa do livro ${book.title}`}
                              className="h-12 w-8 object-cover rounded mr-3"
                            />
                            <span className="font-medium line-clamp-1">{book.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>{book.author.name}</TableCell>
                        <TableCell>{book.category.name}</TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {book.epubUrl && <Badge variant="outline" className="text-xs">EPUB</Badge>}
                            {book.pdfUrl && <Badge variant="outline" className="text-xs">PDF</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <Star className="h-3 w-3 text-accent fill-accent mr-1" />
                            <span>{book.rating.toFixed(1)}</span>
                            <span className="text-xs text-neutral-400 ml-1">({book.ratingCount})</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{book.downloadCount}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {book.isFeatured && <Badge className="bg-secondary text-white text-xs">Destaque</Badge>}
                            {book.isNew && <Badge className="bg-accent text-black text-xs">Novo</Badge>}
                            {book.isFree && <Badge className="bg-success text-white text-xs">Grátis</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/livro/${book.slug}/${book.author.slug}`} className="flex items-center cursor-pointer">
                                  <Eye className="mr-2 h-4 w-4" /> Visualizar
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/livros/editar/${book.id}`} className="flex items-center cursor-pointer">
                                  <Edit className="mr-2 h-4 w-4" /> Editar
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-error flex items-center cursor-pointer"
                                onClick={() => handleDeleteClick(book.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center">
                        Nenhum livro encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="py-4 px-6 border-t border-neutral-200">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setPage(Math.max(1, page - 1))}
                        className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNumber = i + 1;
                      // Show only first, last, and pages around current
                      if (
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= page - 1 && pageNumber <= page + 1)
                      ) {
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              isActive={pageNumber === page}
                              onClick={() => setPage(pageNumber)}
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (
                        (pageNumber === 2 && page > 3) ||
                        (pageNumber === totalPages - 1 && page < totalPages - 2)
                      ) {
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Confirm Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este livro? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
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
