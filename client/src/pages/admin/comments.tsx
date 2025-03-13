import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
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
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  CheckCircle,
  Trash2,
  AlertCircle,
  Star,
  Filter,
  Eye,
  Book,
  User,
  MessageSquare
} from "lucide-react";

export default function AdminComments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedComment, setSelectedComment] = useState<number | null>(null);

  // Carregar comentários
  const { data: comments, isLoading } = useQuery({
    queryKey: ["/api/admin/comments"],
  });

  // Mutação para aprovar comentário
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/admin/comments/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/comments"] });
      toast({
        title: "Comentário aprovado",
        description: "O comentário foi aprovado e agora está visível para todos os usuários.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível aprovar o comentário.",
        variant: "destructive",
      });
    },
  });

  // Mutação para excluir comentário
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/comments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/comments"] });
      toast({
        title: "Comentário excluído",
        description: "O comentário foi excluído com sucesso.",
      });
      setOpenDeleteDialog(false);
      setSelectedComment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o comentário.",
        variant: "destructive",
      });
    },
  });

  // Filtrar comentários pelos termos de busca e filtro de status
  const filteredComments = comments
    ? comments.filter((comment: any) => {
        const matchesSearch = searchTerm
          ? comment.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            comment.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            comment.book?.title.toLowerCase().includes(searchTerm.toLowerCase())
          : true;
        
        const matchesStatus = statusFilter
          ? (statusFilter === "approved" && comment.isApproved) ||
            (statusFilter === "pending" && !comment.isApproved)
          : true;
        
        return matchesSearch && matchesStatus;
      })
    : [];

  // Manipuladores de eventos
  const handleApproveClick = (id: number) => {
    approveMutation.mutate(id);
  };

  const handleDeleteClick = (id: number) => {
    setSelectedComment(id);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedComment) {
      deleteMutation.mutate(selectedComment);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
  };

  // Renderizar estrelas para avaliação
  const renderStars = (rating: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < rating ? "fill-accent text-accent" : "text-neutral-300"}
        />
      ));
  };

  return (
    <main className="flex-grow p-6 bg-neutral-100 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-serif text-2xl md:text-3xl font-bold">Gerenciar Comentários</h1>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <Input
                  placeholder="Buscar por conteúdo, usuário ou livro..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Todos status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos status</SelectItem>
                    <SelectItem value="approved">Aprovados</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={handleResetFilters}
                  className="flex items-center"
                >
                  <Filter size={16} className="mr-2" /> Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Comentários</CardTitle>
            <CardDescription>
              Gerencie os comentários dos usuários sobre os livros
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex flex-col p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-3/4 mb-3" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-32" />
                      <div className="flex gap-2">
                        <Skeleton className="h-9 w-9 rounded-md" />
                        <Skeleton className="h-9 w-9 rounded-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Livro</TableHead>
                      <TableHead>Conteúdo</TableHead>
                      <TableHead>Avaliação</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComments.length > 0 ? (
                      filteredComments.map((comment: any) => (
                        <TableRow key={comment.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={comment.user?.avatarUrl} alt={comment.user?.name} />
                                <AvatarFallback>{comment.user?.name?.charAt(0) || "U"}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{comment.user?.name || "Usuário desconhecido"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Book size={14} />
                              <span className="truncate max-w-[120px]">{comment.book?.title || "Livro desconhecido"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="truncate max-w-[200px] text-sm">{comment.content}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex">{renderStars(comment.rating)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-neutral-500">
                              {formatDate(comment.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${
                                comment.isApproved
                                  ? "border-success bg-success/10 text-success"
                                  : "border-amber-500 bg-amber-500/10 text-amber-500"
                              }`}
                            >
                              {comment.isApproved ? "Aprovado" : "Pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {!comment.isApproved && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-success/10 text-success border-success hover:bg-success/20"
                                  onClick={() => handleApproveClick(comment.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  <CheckCircle size={16} className="mr-1" />
                                  Aprovar
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteClick(comment.id)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6">
                          <div className="flex flex-col items-center justify-center text-neutral-500">
                            <MessageSquare className="mb-2" size={24} />
                            <p>Nenhum comentário encontrado</p>
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
            <span>Total: {filteredComments.length} / {comments?.length || 0} comentários</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <Badge
                  variant="outline"
                  className="border-success bg-success/10 text-success mr-2"
                >
                  Aprovados
                </Badge>
                <span>{comments?.filter((c: any) => c.isApproved).length || 0}</span>
              </div>
              <div className="flex items-center">
                <Badge
                  variant="outline"
                  className="border-amber-500 bg-amber-500/10 text-amber-500 mr-2"
                >
                  Pendentes
                </Badge>
                <span>{comments?.filter((c: any) => !c.isApproved).length || 0}</span>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita.
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
