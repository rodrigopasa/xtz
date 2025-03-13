import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDate, formatProgress } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Book,
  CheckCircle2,
  Clock,
  ArrowUpRight
} from "lucide-react";

export default function UserHistory() {
  // Carregar histórico de leitura
  const { data: readingHistory, isLoading } = useQuery({
    queryKey: ["/api/reading-history"],
  });

  // Agrupar por status (em andamento, concluídos)
  const groupedHistory = {
    inProgress: readingHistory?.filter((item: any) => !item.isCompleted) || [],
    completed: readingHistory?.filter((item: any) => item.isCompleted) || [],
  };

  return (
    <main className="flex-grow p-6 bg-neutral-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-serif text-3xl font-bold mb-6">Histórico de Leitura</h1>
        
        {/* Em Progresso */}
        <div className="mb-8">
          <h2 className="font-serif text-xl font-semibold mb-4 flex items-center">
            <Clock className="mr-2 h-5 w-5 text-primary" /> 
            Em Progresso
          </h2>
          
          {isLoading ? (
            <div className="space-y-4">
              {Array(2).fill(0).map((_, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex">
                      <Skeleton className="w-24 h-36 rounded mr-4" />
                      <div className="flex-1">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2 mb-3" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <div className="mb-3">
                          <Skeleton className="h-2 w-full rounded-full mb-1" />
                          <div className="flex justify-between">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : groupedHistory.inProgress.length > 0 ? (
            <div className="space-y-4">
              {groupedHistory.inProgress.map((item: any) => (
                <Card key={item.id}>
                  <CardContent className="p-6">
                    <div className="flex">
                      <Link 
                        href={`/livro/${item.book.slug}/${item.book.author.slug}`} 
                        className="block shrink-0"
                      >
                        <img 
                          src={item.book.coverUrl}
                          alt={`Capa do livro ${item.book.title}`}
                          className="w-24 h-36 object-cover rounded"
                        />
                      </Link>
                      <div className="ml-4 flex-1">
                        <Link href={`/livro/${item.book.slug}/${item.book.author.slug}`}>
                          <h3 className="font-serif font-bold text-lg mb-1 hover:text-primary line-clamp-1">
                            {item.book.title}
                          </h3>
                        </Link>
                        <p className="text-neutral-600 text-sm mb-3">{item.book.author.name}</p>
                        
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progresso</span>
                            <span className="font-medium">{formatProgress(item.progress)}</span>
                          </div>
                          <Progress value={item.progress} className="h-2" />
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="default" 
                            size="sm" 
                            asChild 
                            className="text-xs flex items-center"
                          >
                            <Link href={`/ler/${item.book.id}/${item.book.format === 'pdf' ? 'pdf' : 'epub'}`}>
                              <Book className="mr-1 h-3 w-3" /> Continuar leitura
                            </Link>
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            asChild 
                            className="text-xs flex items-center"
                          >
                            <Link href={`/livro/${item.book.slug}/${item.book.author.slug}`}>
                              <ArrowUpRight className="mr-1 h-3 w-3" /> Ver detalhes
                            </Link>
                          </Button>
                        </div>
                        
                        <p className="text-neutral-500 text-xs mt-3">
                          Última leitura: {formatDate(item.lastReadAt)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-neutral-500">
                  Você não tem nenhum livro em progresso no momento.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/">Explorar livros</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Concluídos */}
        <div>
          <h2 className="font-serif text-xl font-semibold mb-4 flex items-center">
            <CheckCircle2 className="mr-2 h-5 w-5 text-success" /> 
            Concluídos
          </h2>
          
          {isLoading ? (
            <div className="space-y-4">
              {Array(2).fill(0).map((_, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex">
                      <Skeleton className="w-24 h-36 rounded mr-4" />
                      <div className="flex-1">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2 mb-3" />
                        <Skeleton className="h-4 w-full mb-4" />
                        <Skeleton className="h-8 w-32" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : groupedHistory.completed.length > 0 ? (
            <div className="space-y-4">
              {groupedHistory.completed.map((item: any) => (
                <Card key={item.id}>
                  <CardContent className="p-6">
                    <div className="flex">
                      <Link 
                        href={`/livro/${item.book.slug}/${item.book.author.slug}`} 
                        className="block shrink-0"
                      >
                        <img 
                          src={item.book.coverUrl}
                          alt={`Capa do livro ${item.book.title}`}
                          className="w-24 h-36 object-cover rounded"
                        />
                      </Link>
                      <div className="ml-4 flex-1">
                        <Link href={`/livro/${item.book.slug}/${item.book.author.slug}`}>
                          <h3 className="font-serif font-bold text-lg mb-1 hover:text-primary line-clamp-1">
                            {item.book.title}
                          </h3>
                        </Link>
                        <p className="text-neutral-600 text-sm mb-2">{item.book.author.name}</p>
                        <p className="text-sm text-success font-medium mb-3 flex items-center">
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Concluído em {formatDate(item.lastReadAt)}
                        </p>
                        
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            asChild 
                            className="text-xs flex items-center"
                          >
                            <Link href={`/ler/${item.book.id}/${item.book.format === 'pdf' ? 'pdf' : 'epub'}`}>
                              <Book className="mr-1 h-3 w-3" /> Ler novamente
                            </Link>
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            asChild 
                            className="text-xs flex items-center"
                          >
                            <Link href={`/livro/${item.book.slug}/${item.book.author.slug}`}>
                              <ArrowUpRight className="mr-1 h-3 w-3" /> Ver detalhes
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-neutral-500">
                  Você ainda não concluiu a leitura de nenhum livro.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
