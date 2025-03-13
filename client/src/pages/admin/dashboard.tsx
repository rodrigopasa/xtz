import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUp,
  ArrowDown,
  Users,
  BookOpen,
  Download,
  MessageSquare,
  Plus,
  Edit,
  Trash2
} from "lucide-react";

export default function AdminDashboard() {
  // Carregar estatísticas
  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: ["/api/books"],
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["/api/admin/comments"],
  });

  // Atividades recentes
  const recentActivities = [
    {
      id: 1,
      type: "book",
      title: "Novo livro adicionado: \"A Biblioteca da Meia-Noite\"",
      date: new Date(),
      status: "completed"
    },
    {
      id: 2,
      type: "user",
      title: "5 novos usuários registrados",
      date: new Date(Date.now() - 3600000), // 1 hour ago
      status: "pending"
    },
    {
      id: 3,
      type: "error",
      title: "Relatório de erro no leitor de EPUB",
      date: new Date(Date.now() - 86400000), // 1 day ago
      status: "error"
    },
    {
      id: 4,
      type: "comment",
      title: "12 novos comentários para moderação",
      date: new Date(Date.now() - 172800000), // 2 days ago
      status: "review"
    }
  ];

  // Dados de categorias populares para demonstração
  const popularCategories = [
    { name: "Ficção Científica", percentage: 28 },
    { name: "Romance", percentage: 22 },
    { name: "Mistério", percentage: 18 },
    { name: "História", percentage: 14 },
    { name: "Autoajuda", percentage: 10 }
  ];

  // Dados para a tabela de livros recentes
  const recentBooks = books?.slice(0, 3) || [];

  // Calcular estatísticas
  const stats = {
    books: books?.length || 0,
    users: users?.length || 0,
    downloads: books?.reduce((total: number, book: any) => total + (book.downloadCount || 0), 0) || 0,
    comments: comments?.length || 0,
    // Demonstrar crescimento com valores simulados
    booksGrowth: 12,
    usersGrowth: 18,
    downloadsGrowth: 7,
    commentsGrowth: -3
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-success/10 text-success">Concluído</Badge>;
      case "pending":
        return <Badge variant="default" className="bg-neutral-100 text-neutral-600">Verificar</Badge>;
      case "error":
        return <Badge variant="default" className="bg-error/10 text-error">Pendente</Badge>;
      case "review":
        return <Badge variant="default" className="bg-warning/10 text-warning">Revisar</Badge>;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "book":
        return <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3"><BookOpen size={20} /></div>;
      case "user":
        return <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center text-warning mr-3"><Users size={20} /></div>;
      case "error":
        return <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center text-error mr-3"><div className="h-5 w-5 flex items-center justify-center">!</div></div>;
      case "comment":
        return <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent-dark mr-3"><MessageSquare size={20} /></div>;
      default:
        return null;
    }
  };

  return (
    <main className="flex-grow p-6 bg-neutral-100 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-serif text-2xl md:text-3xl font-bold">Dashboard</h1>
          <div className="flex space-x-2">
            <Button asChild className="bg-primary hover:bg-primary-dark flex items-center">
              <Link href="/admin/livros/novo">
                <Plus className="mr-2" size={18} /> Novo Livro
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-neutral-500 text-sm">Total de Livros</p>
                  {booksLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="font-bold text-3xl">{stats.books}</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <BookOpen size={24} />
                </div>
              </div>
              {booksLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <div className="flex items-center text-success text-sm">
                  <ArrowUp className="mr-1" size={14} />
                  <span>{stats.booksGrowth}% este mês</span>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-neutral-500 text-sm">Usuários Ativos</p>
                  {usersLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="font-bold text-3xl">{stats.users >= 1000 ? `${(stats.users / 1000).toFixed(1)}k` : stats.users}</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent-dark">
                  <Users size={24} />
                </div>
              </div>
              {usersLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <div className="flex items-center text-success text-sm">
                  <ArrowUp className="mr-1" size={14} />
                  <span>{stats.usersGrowth}% este mês</span>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-neutral-500 text-sm">Downloads</p>
                  {booksLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="font-bold text-3xl">{stats.downloads >= 1000 ? `${(stats.downloads / 1000).toFixed(1)}k` : stats.downloads}</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                  <Download size={24} />
                </div>
              </div>
              {booksLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <div className="flex items-center text-success text-sm">
                  <ArrowUp className="mr-1" size={14} />
                  <span>{stats.downloadsGrowth}% este mês</span>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-neutral-500 text-sm">Comentários</p>
                  {commentsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="font-bold text-3xl">{stats.comments}</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-neutral-200 rounded-full flex items-center justify-center text-neutral-700">
                  <MessageSquare size={24} />
                </div>
              </div>
              {commentsLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <div className="flex items-center text-error text-sm">
                  <ArrowDown className="mr-1" size={14} />
                  <span>{Math.abs(stats.commentsGrowth)}% este mês</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-serif text-xl font-bold">Atividade Recente</CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start pb-4 border-b border-neutral-100">
                      {getTypeIcon(activity.type)}
                      <div className="flex-grow">
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-neutral-500">{formatDate(activity.date)}</p>
                      </div>
                      <div>
                        {renderStatusBadge(activity.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Popular Categories */}
          <div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-serif text-xl font-bold">Categorias Populares</CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {popularCategories.map((category, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center">
                        <p className="font-medium">{category.name}</p>
                        <span className="text-sm text-neutral-500">{category.percentage}%</span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full ${index % 5 === 0 ? 'bg-primary' : 
                            index % 5 === 1 ? 'bg-secondary' : 
                            index % 5 === 2 ? 'bg-accent' : 
                            index % 5 === 3 ? 'bg-neutral-700' : 'bg-success'}`} 
                          style={{ width: `${category.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Recent Books Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-xl font-bold">Livros Recentes</CardTitle>
          </CardHeader>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 text-neutral-600 uppercase text-xs font-medium">
                <tr>
                  <th className="py-4 px-6">Título</th>
                  <th className="py-4 px-6">Autor</th>
                  <th className="py-4 px-6">Categoria</th>
                  <th className="py-4 px-6">Adicionado</th>
                  <th className="py-4 px-6">Downloads</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {booksLoading ? (
                  Array(3).fill(0).map((_, index) => (
                    <tr key={index} className="hover:bg-neutral-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <Skeleton className="w-8 h-12 mr-3" />
                          <Skeleton className="h-5 w-32" />
                        </div>
                      </td>
                      <td className="py-4 px-6"><Skeleton className="h-5 w-24" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-5 w-20" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-5 w-16" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-5 w-12" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-6 w-20 rounded-full" /></td>
                      <td className="py-4 px-6">
                        <div className="flex space-x-2">
                          <Skeleton className="h-5 w-5 rounded-full" />
                          <Skeleton className="h-5 w-5 rounded-full" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : recentBooks.length > 0 ? (
                  recentBooks.map((book: any) => (
                    <tr key={book.id} className="hover:bg-neutral-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <img 
                            src={book.coverUrl}
                            alt={`Capa do livro ${book.title}`}
                            className="w-8 h-12 object-cover rounded mr-3"
                          />
                          <span className="font-medium">{book.title}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">{book.author.name}</td>
                      <td className="py-4 px-6">{book.category.name}</td>
                      <td className="py-4 px-6">{book.isNew ? 'Recente' : '—'}</td>
                      <td className="py-4 px-6">{book.downloadCount}</td>
                      <td className="py-4 px-6">
                        <Badge className="bg-success/10 text-success">Publicado</Badge>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/livros/editar/${book.id}`}>
                              <Edit className="h-4 w-4 text-primary" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-error" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-neutral-500">
                      Nenhum livro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex justify-between items-center">
            <span className="text-sm text-neutral-500">
              Mostrando {recentBooks.length} de {stats.books} livros
            </span>
            <Button asChild variant="outline" className="text-primary">
              <Link href="/admin/livros">Ver todos os livros</Link>
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
