import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Helmet } from "react-helmet";
import { 
  BookOpen, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Search as SearchIcon 
} from "lucide-react";

// Components
import BookCard from "@/components/ui/book-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import SEOHead from "@/components/SEOHead";

export default function Explorar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedAuthor, setSelectedAuthor] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [sortBy, setSortBy] = useState("title");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Fetch all books
  const { data: books, isLoading: isLoadingBooks } = useQuery({
    queryKey: ['/api/books'],
    queryFn: () => apiRequest('GET', '/api/books')
  });

  // Fetch all categories
  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: () => apiRequest('GET', '/api/categories')
  });

  // Fetch all authors
  const { data: authors } = useQuery({
    queryKey: ['/api/authors'],
    queryFn: () => apiRequest('GET', '/api/authors')
  });

  // Fetch site settings for SEO
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: () => apiRequest('GET', '/api/settings')
  });

  // Filter books based on selected filters
  const filteredBooks = books ? books.filter((book: any) => {
    // Apply search filter
    const matchesSearch = searchQuery 
      ? book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author?.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    // Apply category filter
    const matchesCategory = selectedCategory 
      ? book.categoryId === parseInt(selectedCategory)
      : true;
    
    // Apply author filter
    const matchesAuthor = selectedAuthor 
      ? book.authorId === parseInt(selectedAuthor)
      : true;
    
    // Apply format filter
    const matchesFormat = selectedFormat 
      ? book.format === selectedFormat || (selectedFormat === "both" && book.format === "both")
      : true;
    
    return matchesSearch && matchesCategory && matchesAuthor && matchesFormat;
  }) : [];
  
  // Sort filtered books
  const sortedBooks = filteredBooks.length > 0 
    ? [...filteredBooks].sort((a, b) => {
        if (sortBy === "title") {
          return sortOrder === "asc"
            ? a.title.localeCompare(b.title)
            : b.title.localeCompare(a.title);
        } else if (sortBy === "author") {
          return sortOrder === "asc"
            ? a.author?.name.localeCompare(b.author?.name)
            : b.author?.name.localeCompare(a.author?.name);
        } else if (sortBy === "publishYear") {
          const yearA = a.publishYear || 0;
          const yearB = b.publishYear || 0;
          return sortOrder === "asc" ? yearA - yearB : yearB - yearA;
        } else if (sortBy === "rating") {
          return sortOrder === "asc" ? a.rating - b.rating : b.rating - a.rating;
        } else if (sortBy === "downloads") {
          return sortOrder === "asc" ? a.downloadCount - b.downloadCount : b.downloadCount - a.downloadCount;
        }
        return 0;
      })
    : [];

  // Pagination
  const totalPages = Math.ceil(sortedBooks.length / itemsPerPage);
  const paginatedBooks = sortedBooks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when filters change
  // Resetar para primeira página quando os filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedAuthor, selectedFormat, sortBy, sortOrder]);
  
  // Determinar se a página atual deve ser indexada
  const shouldIndex = 
    currentPage === 1 && 
    !searchQuery && 
    !selectedCategory && 
    !selectedAuthor && 
    !selectedFormat;

  // Handle search input
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Generate pagination items
  const getPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    
    // Always show first page
    items.push(
      <PaginationItem key="first">
        <PaginationLink
          onClick={() => setCurrentPage(1)}
          isActive={currentPage === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );
    
    // Add ellipsis after first page if needed
    if (currentPage > 3) {
      items.push(
        <PaginationItem key="ellipsis-start">
          <span className="px-4">...</span>
        </PaginationItem>
      );
    }
    
    // Calculate range of pages to show
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);
    
    // Adjust range if at the beginning or end
    if (currentPage <= 3) {
      endPage = Math.min(totalPages - 1, maxVisiblePages - 1);
    } else if (currentPage >= totalPages - 2) {
      startPage = Math.max(2, totalPages - maxVisiblePages + 2);
    }
    
    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => setCurrentPage(i)}
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    // Add ellipsis before last page if needed
    if (currentPage < totalPages - 2 && totalPages > maxVisiblePages) {
      items.push(
        <PaginationItem key="ellipsis-end">
          <span className="px-4">...</span>
        </PaginationItem>
      );
    }
    
    // Always show last page if there is more than one page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key="last">
          <PaginationLink
            onClick={() => setCurrentPage(totalPages)}
            isActive={currentPage === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return items;
  };

  // Loading skeletons
  const renderSkeletons = () => {
    return Array(12).fill(0).map((_, index) => (
      <div key={index} className="flex flex-col space-y-3">
        <Skeleton className="h-[280px] w-full rounded-lg" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    ));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <SEOHead 
        title="Explorar Livros"
        description="Explore nossa ampla coleção de livros digitais. Encontre seu próximo livro favorito por categoria, autor ou formato."
        canonicalUrl="/explorar"
        noIndex={!shouldIndex}
      />
      
      {/* Página principal */}
      <div className="flex flex-col">
        {/* Cabeçalho da página */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-serif font-bold mb-4">Explorar Livros</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Descubra novos mundos e histórias em nossa vasta coleção de livros digitais.
            Use os filtros para encontrar exatamente o que você está procurando.
          </p>
        </div>
        
        {/* Barra de pesquisa e filtros */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <form onSubmit={handleSearchSubmit} className="flex-1">
            <div className="relative">
              <Input
                type="text"
                placeholder="Pesquisar por título ou autor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 h-11"
              />
              <SearchIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            </div>
          </form>
          
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] h-11">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Título</SelectItem>
                <SelectItem value="author">Autor</SelectItem>
                <SelectItem value="publishYear">Ano</SelectItem>
                <SelectItem value="rating">Avaliação</SelectItem>
                <SelectItem value="downloads">Downloads</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="h-11 w-11"
              title={sortOrder === "asc" ? "Ordem crescente" : "Ordem decrescente"}
            >
              {sortOrder === "asc" ? <SortAsc /> : <SortDesc />}
            </Button>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-11 gap-2">
                  <Filter size={16} />
                  <span className="hidden sm:inline">Filtros</span>
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtrar Livros</SheetTitle>
                  <SheetDescription>
                    Refine sua busca usando os filtros abaixo
                  </SheetDescription>
                </SheetHeader>
                
                <div className="py-6 space-y-6">
                  <Accordion type="single" collapsible defaultValue="category">
                    <AccordionItem value="category">
                      <AccordionTrigger>Categoria</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <Button
                            variant={selectedCategory === "" ? "default" : "outline"}
                            className="w-full justify-start"
                            onClick={() => setSelectedCategory("")}
                          >
                            Todas as categorias
                          </Button>
                          {categories?.map((category: any) => (
                            <Button
                              key={category.id}
                              variant={selectedCategory === category.id.toString() ? "default" : "outline"}
                              className="w-full justify-start"
                              onClick={() => setSelectedCategory(category.id.toString())}
                            >
                              {category.name}
                            </Button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="author">
                      <AccordionTrigger>Autor</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <Button
                            variant={selectedAuthor === "" ? "default" : "outline"}
                            className="w-full justify-start"
                            onClick={() => setSelectedAuthor("")}
                          >
                            Todos os autores
                          </Button>
                          {authors?.map((author: any) => (
                            <Button
                              key={author.id}
                              variant={selectedAuthor === author.id.toString() ? "default" : "outline"}
                              className="w-full justify-start"
                              onClick={() => setSelectedAuthor(author.id.toString())}
                            >
                              {author.name}
                            </Button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="format">
                      <AccordionTrigger>Formato</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <Button
                            variant={selectedFormat === "" ? "default" : "outline"}
                            className="w-full justify-start"
                            onClick={() => setSelectedFormat("")}
                          >
                            Todos os formatos
                          </Button>
                          <Button
                            variant={selectedFormat === "epub" ? "default" : "outline"}
                            className="w-full justify-start"
                            onClick={() => setSelectedFormat("epub")}
                          >
                            EPUB
                          </Button>
                          <Button
                            variant={selectedFormat === "pdf" ? "default" : "outline"}
                            className="w-full justify-start"
                            onClick={() => setSelectedFormat("pdf")}
                          >
                            PDF
                          </Button>
                          <Button
                            variant={selectedFormat === "both" ? "default" : "outline"}
                            className="w-full justify-start"
                            onClick={() => setSelectedFormat("both")}
                          >
                            EPUB e PDF
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  
                  <Separator />
                  
                  <div className="flex flex-col gap-2">
                    <Button className="w-full" onClick={() => {
                      setSelectedCategory("");
                      setSelectedAuthor("");
                      setSelectedFormat("");
                      setSearchQuery("");
                    }}>
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        
        {/* Resultados */}
        {isLoadingBooks ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {renderSkeletons()}
          </div>
        ) : paginatedBooks.length > 0 ? (
          <>
            <div className="mb-4 text-muted-foreground">
              Mostrando {paginatedBooks.length} de {filteredBooks.length} livros
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {paginatedBooks.map((book: any) => (
                <BookCard
                  key={book.id}
                  id={book.id}
                  title={book.title}
                  author={book.author}
                  slug={book.slug}
                  coverUrl={book.coverUrl}
                  rating={book.rating || 0}
                  ratingCount={book.ratingCount || 0}
                  isNew={book.isNew}
                  isFeatured={book.isFeatured}
                />
              ))}
            </div>
            
            {/* Paginação */}
            {totalPages > 1 && (
              <Pagination className="mt-8">
                <PaginationContent>
                  {currentPage > 1 ? (
                    <PaginationPrevious
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    />
                  ) : (
                    <PaginationItem>
                      <span className="cursor-not-allowed opacity-50">
                        <PaginationPrevious />
                      </span>
                    </PaginationItem>
                  )}
                  
                  {getPaginationItems()}
                  
                  {currentPage < totalPages ? (
                    <PaginationNext
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    />
                  ) : (
                    <PaginationItem>
                      <span className="cursor-not-allowed opacity-50">
                        <PaginationNext />
                      </span>
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-medium mb-2">Nenhum livro encontrado</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Não encontramos livros correspondentes aos filtros selecionados.
              Tente modificar sua pesquisa ou remover alguns filtros.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSelectedCategory("");
                setSelectedAuthor("");
                setSelectedFormat("");
                setSearchQuery("");
              }}
            >
              Limpar todos os filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}