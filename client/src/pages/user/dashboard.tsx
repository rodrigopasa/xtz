import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Heart, MessageSquare, History } from "lucide-react";

export default function UserDashboard() {
  const { user } = useAuth();

  // Carregar livros favoritos
  const { data: favoriteBooks, isLoading: favoritesLoading } = useQuery({
    queryKey: ["/api/favorites"],
  });

  // Carregar histórico de leitura
  const { data: readingHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/reading-history"],
  });

  // Carregar comentários do usuário
  const { data: userComments, isLoading: commentsLoading } = useQuery({
    queryKey: [`/api/books/${user?.id}/comments`],
    enabled: !!user?.id,
  });

  return (
    <main className="flex-grow p-6 bg-neutral-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-serif text-3xl font-bold mb-8">Meu Perfil</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6 flex items-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mr-4">
                <Book size={24} />
              </div>
              <div>
                <p className="text-neutral-500 text-sm">Livros lidos</p>
                <p className="font-bold text-2xl">
                  {historyLoading ? (
                    <Skeleton className="h-7 w-10" />
                  ) : (
                    readingHistory?.filter((item: any) => item.isCompleted)?.length || 0
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 flex items-center">
              <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary mr-4">
                <Heart size={24} />
              </div>
              <div>
                <p className="text-neutral-500 text-sm">Favoritos</p>
                <p className="font-bold text-2xl">
                  {favoritesLoading ? (
                    <Skeleton className="h-7 w-10" />
                  ) : (
                    favoriteBooks?.length || 0
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 flex items-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent-dark mr-4">
                <MessageSquare size={24} />
              </div>
              <div>
                <p className="text-neutral-500 text-sm">Comentários</p>
                <p className="font-bold text-2xl">
                  {commentsLoading ? (
                    <Skeleton className="h-7 w-10" />
                  ) : (
                    userComments?.length || 0
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Favorites Section */}
        <Card className="mb-8">
          <CardHeader className="flex justify-between items-center pb-2">
            <CardTitle className="font-serif text-xl font-bold">Livros Favoritos</CardTitle>
            <Link href="/favoritos" className="text-primary hover:text-primary-dark font-medium text-sm">
              Ver todos
            </Link>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {favoritesLoading ? (
                Array(4).fill(0).map((_, index) => (
                  <div key={index} className="border border-neutral-200 rounded-lg overflow-hidden">
                    <div className="relative pb-[140%]">
                      <Skeleton className="absolute inset-0" />
                    </div>
                    <div className="p-3">
                      <Skeleton className="h-5 w-3/4 mb-1" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))
              ) : favoriteBooks?.length > 0 ? (
                favoriteBooks.slice(0, 4).map((book: any) => (
                  <div key={book.id} className="bg-white border border-neutral-200 rounded-lg overflow-hidden hover:shadow-md transition-all">
                    <Link href={`/livro/${book.slug}/${book.author.slug}`} className="block relative pb-[140%]">
                      <img 
                        src={book.coverUrl}
                        alt={`Capa do livro ${book.title}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </Link>
                    <div className="p-3">
                      <h3 className="font-medium text-sm line-clamp-1">{book.title}</h3>
                      <p className="text-neutral-500 text-xs">{book.author.name}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-4 py-6 text-center text-neutral-500">
                  <p>Você ainda não tem livros favoritos.</p>
                  <Link href="/" className="text-primary hover:underline text-sm">
                    Explorar livros
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Reading History Section */}
        <Card>
          <CardHeader className="flex justify-between items-center pb-2">
            <CardTitle className="font-serif text-xl font-bold">Histórico de Leitura</CardTitle>
            <Link href="/historico" className="text-primary hover:text-primary-dark font-medium text-sm">
              Ver completo
            </Link>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {historyLoading ? (
                Array(3).fill(0).map((_, index) => (
                  <div key={index} className="flex items-center p-3 border border-neutral-200 rounded-lg">
                    <Skeleton className="w-12 h-18 rounded mr-4" />
                    <div className="flex-grow">
                      <Skeleton className="h-5 w-1/2 mb-1" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-5 w-24 mb-1" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                ))
              ) : readingHistory?.length > 0 ? (
                readingHistory.slice(0, 3).map((item: any) => (
                  <div key={item.id} className="flex items-center p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50">
                    <img 
                      src={item.book.coverUrl}
                      alt={`Capa do livro ${item.book.title}`}
                      className="w-12 h-18 object-cover rounded mr-4"
                    />
                    
                    <div className="flex-grow">
                      <h3 className="font-medium line-clamp-1">{item.book.title}</h3>
                      <p className="text-neutral-500 text-sm">{item.book.author.name}</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-neutral-800 text-sm font-medium">
                        Progresso: {item.progress}%
                      </p>
                      <p className="text-neutral-500 text-xs">
                        {item.isCompleted
                          ? `Concluído: ${formatDate(item.lastReadAt)}`
                          : `Última leitura: ${formatDate(item.lastReadAt)}`}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-neutral-500">
                  <p>Você ainda não iniciou a leitura de nenhum livro.</p>
                  <Link href="/" className="text-primary hover:underline text-sm">
                    Começar a ler
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
