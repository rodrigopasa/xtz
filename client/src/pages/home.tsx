import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import BookCard from "@/components/ui/book-card";
import CategoryCard from "@/components/ui/category-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Carregar categorias
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
  });
  
  // Carregar livros destacados
  const { data: featuredBooks, isLoading: featuredLoading } = useQuery({
    queryKey: ["/api/books?featured=true"],
  });
  
  // Carregar novos lançamentos
  const { data: newBooks, isLoading: newBooksLoading } = useQuery({
    queryKey: ["/api/books?isNew=true"],
  });
  
  // Carregar livros grátis
  const { data: freeBooks, isLoading: freeBooksLoading } = useQuery({
    queryKey: ["/api/books?isFree=true"],
  });

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsSubmitting(true);
    
    // Simulação de envio - normalmente seria uma chamada de API
    setTimeout(() => {
      setEmail("");
      setIsSubmitting(false);
      alert("Obrigado por se inscrever na nossa newsletter!");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-purple-800 to-purple-950 text-white py-12 md:py-20 relative overflow-hidden">
        {/* Animated stars in background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-10 left-20 w-2 h-2 rounded-full bg-purple-300 animate-pulse" style={{animationDelay: '0.3s'}}></div>
          <div className="absolute top-40 left-[30%] w-1 h-1 rounded-full bg-purple-300 animate-pulse" style={{animationDelay: '0.7s'}}></div>
          <div className="absolute top-20 right-[25%] w-2 h-2 rounded-full bg-purple-300 animate-pulse" style={{animationDelay: '1.1s'}}></div>
          <div className="absolute bottom-[30%] left-10 w-1 h-1 rounded-full bg-purple-300 animate-pulse" style={{animationDelay: '0.9s'}}></div>
          <div className="absolute bottom-20 right-[15%] w-2 h-2 rounded-full bg-purple-300 animate-pulse" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute top-[30%] right-10 w-1 h-1 rounded-full bg-purple-300 animate-pulse" style={{animationDelay: '1.3s'}}></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <h1 className="font-serif text-3xl md:text-5xl font-bold leading-tight mb-4 text-white">
                Descubra novos mundos através da leitura
              </h1>
              <p className="text-lg md:text-xl mb-6 text-white/90">
                Acesse milhares de livros em formatos digitais, faça download ou leia online
              </p>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <Button asChild size="lg" variant="secondary" className="glass-card border border-purple-400/30 text-white hover:bg-purple-800/50">
                  <Link href="/explorar">
                    Explorar Catálogo
                  </Link>
                </Button>
                <Button asChild size="lg" className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 shadow-lg shadow-purple-900/50">
                  <Link href="/cadastro">
                    Cadastre-se Grátis
                  </Link>
                </Button>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-purple-400 rounded-lg opacity-75 blur-xl"></div>
                <img 
                  src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&h=400&q=80" 
                  alt="Pilha de livros com um tablet mostrando um e-book" 
                  className="rounded-lg shadow-xl max-w-full h-auto relative z-10"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-2xl md:text-3xl font-bold mb-8 text-center">Navegue por Categorias</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categoriesLoading ? (
              Array(6).fill(0).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-4 text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-neutral-200 flex items-center justify-center">
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                  <Skeleton className="h-5 w-24 mx-auto mb-1" />
                  <Skeleton className="h-4 w-16 mx-auto" />
                </div>
              ))
            ) : (
              Array.isArray(categories) && categories.slice(0, 6).map((category: any) => (
                <CategoryCard 
                  key={category.id}
                  name={category.name}
                  slug={category.slug}
                  iconName={category.iconName}
                  bookCount={category.bookCount}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Featured Books Section */}
      <section className="py-10 md:py-16 bg-neutral-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold">Destaques da Semana</h2>
            <Link href="/destaques" className="text-primary hover:text-primary-dark font-medium flex items-center">
              Ver todos <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredLoading ? (
              Array(4).fill(0).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="relative pb-[140%]">
                    <Skeleton className="absolute inset-0 w-full h-full" />
                  </div>
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-24" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              Array.isArray(featuredBooks) && featuredBooks.slice(0, 4).map((book: any) => (
                <BookCard
                  key={book.id}
                  id={book.id}
                  title={book.title}
                  author={book.author}
                  slug={book.slug}
                  coverUrl={book.coverUrl}
                  rating={book.rating}
                  ratingCount={book.ratingCount}
                  isFeatured={book.isFeatured}
                  isNew={book.isNew}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* New Releases Section */}
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold">Lançamentos</h2>
            <Link href="/lancamentos" className="text-primary hover:text-primary-dark font-medium flex items-center">
              Ver todos <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {newBooksLoading ? (
              Array(4).fill(0).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="relative pb-[140%]">
                    <Skeleton className="absolute inset-0 w-full h-full" />
                  </div>
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-24" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              Array.isArray(newBooks) && newBooks.slice(0, 4).map((book: any) => (
                <BookCard
                  key={book.id}
                  id={book.id}
                  title={book.title}
                  author={book.author}
                  slug={book.slug}
                  coverUrl={book.coverUrl}
                  rating={book.rating}
                  ratingCount={book.ratingCount}
                  isFeatured={book.isFeatured}
                  isNew={book.isNew}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Free Books Section */}
      <section className="py-10 md:py-16 bg-neutral-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold">Livros Gratuitos</h2>
            <Link href="/livros-gratuitos" className="text-primary hover:text-primary-dark font-medium flex items-center">
              Ver todos <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {freeBooksLoading ? (
              Array(6).fill(0).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="relative pb-[140%]">
                    <Skeleton className="absolute inset-0 w-full h-full" />
                  </div>
                </div>
              ))
            ) : (
              Array.isArray(freeBooks) && freeBooks.slice(0, 6).map((book: any) => (
                <div key={book.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all">
                  <Link href={`/livro/${book.slug}/${book.author.slug}`} className="block relative pb-[140%]">
                    <img 
                      src={book.coverUrl}
                      alt={`Capa do livro ${book.title}`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white p-3">
                      <h3 className="font-medium text-sm line-clamp-1">{book.title}</h3>
                      <p className="text-xs text-white/80">{book.author.name}</p>
                    </div>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-2xl md:text-3xl font-bold mb-12 text-center">Por que escolher a BiblioTech?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-serif font-bold text-xl mb-3">Leitura Online</h3>
              <p className="text-neutral-600">Leia diretamente no navegador com nosso leitor de EPUB e PDF integrado, sem necessidade de baixar aplicativos adicionais.</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h3 className="font-serif font-bold text-xl mb-3">Downloads Ilimitados</h3>
              <p className="text-neutral-600">Baixe seus livros favoritos em formatos EPUB e PDF para ler offline em qualquer dispositivo, a qualquer momento.</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-accent/10 rounded-full flex items-center justify-center text-accent-dark">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h3 className="font-serif font-bold text-xl mb-3">Comunidade Ativa</h3>
              <p className="text-neutral-600">Compartilhe suas impressões, deixe comentários e descubra novas leituras através das recomendações de outros leitores.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-10 md:py-16 bg-primary text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-serif text-2xl md:text-3xl font-bold mb-4">Fique por dentro das novidades</h2>
            <p className="text-white/90 mb-6">Cadastre-se para receber atualizações sobre novos livros, promoções e conteúdo exclusivo.</p>
            
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
              <Input 
                type="email" 
                placeholder="Seu melhor e-mail" 
                className="flex-grow py-3 px-4 rounded-lg text-neutral-800 focus:outline-none focus:ring-2 focus:ring-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button 
                type="submit" 
                className="bg-white text-primary hover:bg-neutral-100 py-3 px-6 rounded-lg font-medium transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Enviando..." : "Inscrever-se"}
              </Button>
            </form>
            <p className="text-white/70 text-sm mt-4">Prometemos não enviar spam. Você pode cancelar a inscrição a qualquer momento.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
