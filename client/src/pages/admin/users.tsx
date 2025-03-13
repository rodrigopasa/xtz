import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  UserCog,
  Users,
  ShieldCheck,
  User,
  AlertCircle,
  MoveUp,
  MoveDown,
  Filter,
} from "lucide-react";

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string; role: string } | null>(null);
  const [newRole, setNewRole] = useState<"user" | "admin">("user");

  // Carregar usuários
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  // Mutação para atualizar papel do usuário
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      return apiRequest("PUT", `/api/admin/users/${id}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Papel atualizado",
        description: `O usuário agora tem papel de ${newRole === "admin" ? "Administrador" : "Usuário"}.`,
      });
      setOpenRoleDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o papel do usuário.",
        variant: "destructive",
      });
    },
  });

  // Filtrar usuários pelos termos de busca e filtro de papel
  const filteredUsers = users
    ? users.filter((user: any) => {
        const matchesSearch = searchTerm
          ? user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
          : true;
        
        const matchesRole = roleFilter && roleFilter !== "all"
          ? user.role === roleFilter
          : true;
        
        return matchesSearch && matchesRole;
      })
    : [];

  // Manipuladores de eventos
  const handleRoleClick = (user: any) => {
    setSelectedUser({
      id: user.id,
      name: user.name,
      role: user.role,
    });
    setNewRole(user.role === "admin" ? "user" : "admin");
    setOpenRoleDialog(true);
  };

  const handleConfirmRoleChange = () => {
    if (selectedUser) {
      updateRoleMutation.mutate({
        id: selectedUser.id,
        role: newRole,
      });
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <main className="flex-grow p-6 bg-neutral-100 overflow-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-serif text-2xl md:text-3xl font-bold">Gerenciar Usuários</h1>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <Input
                  placeholder="Buscar por nome, usuário ou email..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Todos papéis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos papéis</SelectItem>
                    <SelectItem value="admin">Administradores</SelectItem>
                    <SelectItem value="user">Usuários</SelectItem>
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
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>
              Gerencie os usuários da plataforma e seus níveis de acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div>
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
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
                      <TableHead className="w-[80px]">Avatar</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatarUrl} alt={user.name} />
                              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${
                                user.role === "admin"
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-neutral-200 bg-neutral-100 text-neutral-800"
                              }`}
                            >
                              {user.role === "admin" ? (
                                <><ShieldCheck className="mr-1" size={14} /> Admin</>
                              ) : (
                                <><User className="mr-1" size={14} /> Usuário</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center"
                                onClick={() => handleRoleClick(user)}
                              >
                                <UserCog className="mr-2" size={14} />
                                {user.role === "admin" ? "Tornar usuário" : "Tornar admin"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6">
                          <div className="flex flex-col items-center justify-center text-neutral-500">
                            <AlertCircle className="mb-2" size={24} />
                            <p>Nenhum usuário encontrado</p>
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
            <span>
              Total: {filteredUsers.length} / {users?.length || 0} usuários
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <Badge
                  variant="outline"
                  className="border-primary bg-primary/10 text-primary mr-2"
                >
                  <ShieldCheck className="mr-1" size={14} /> Admin
                </Badge>
                <span>{users?.filter((u: any) => u.role === "admin").length || 0}</span>
              </div>
              <div className="flex items-center">
                <Badge
                  variant="outline"
                  className="border-neutral-200 bg-neutral-100 text-neutral-800 mr-2"
                >
                  <User className="mr-1" size={14} /> Usuário
                </Badge>
                <span>{users?.filter((u: any) => u.role === "user").length || 0}</span>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Dialog de mudança de papel */}
      <Dialog open={openRoleDialog} onOpenChange={setOpenRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar papel do usuário</DialogTitle>
            <DialogDescription>
              Você está prestes a alterar o nível de acesso de {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">
              {selectedUser?.role === "admin"
                ? "Este usuário perderá os privilégios de administrador."
                : "Este usuário receberá privilégios de administrador."}
            </p>
            <div className="flex items-center justify-center p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center gap-2 text-neutral-500">
                <Badge
                  variant="outline"
                  className={`${
                    selectedUser?.role === "admin"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-neutral-200 bg-neutral-100 text-neutral-800"
                  }`}
                >
                  {selectedUser?.role === "admin" ? (
                    <><ShieldCheck className="mr-1" size={14} /> Admin</>
                  ) : (
                    <><User className="mr-1" size={14} /> Usuário</>
                  )}
                </Badge>
                <MoveDown className="mx-2" size={16} />
                <Badge
                  variant="outline"
                  className={`${
                    selectedUser?.role !== "admin"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-neutral-200 bg-neutral-100 text-neutral-800"
                  }`}
                >
                  {selectedUser?.role !== "admin" ? (
                    <><ShieldCheck className="mr-1" size={14} /> Admin</>
                  ) : (
                    <><User className="mr-1" size={14} /> Usuário</>
                  )}
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenRoleDialog(false)}
              disabled={updateRoleMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmRoleChange}
              disabled={updateRoleMutation.isPending}
              className={selectedUser?.role !== "admin" ? "bg-primary" : ""}
            >
              {updateRoleMutation.isPending
                ? "Alterando..."
                : "Confirmar alteração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
