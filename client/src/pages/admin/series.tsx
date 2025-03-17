import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function AdminSeries() {
  // Query para buscar séries
  const { data: series, isLoading } = useQuery({
    queryKey: ["/api/series"],
    onSuccess: (data) => {
      console.log("Series data loaded:", data);
    },
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-background">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Gerenciar Séries</h2>
        <div className="flex items-center space-x-2">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Série
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Livros</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                  Carregando séries...
                </TableCell>
              </TableRow>
            ) : series && series.length > 0 ? (
              series.map((series: any) => (
                <TableRow key={series.id}>
                  <TableCell className="font-medium">{series.name}</TableCell>
                  <TableCell>{series.author?.name || "Sem autor"}</TableCell>
                  <TableCell>{series.totalBooks || 0}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                  Nenhuma série encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}