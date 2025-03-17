import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function TesteLivros() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const data = await apiRequest("GET", "/api/books");
        console.log("Livros carregados:", data);
        setBooks(data);
        setError(null);
      } catch (err: any) {
        console.error("Erro ao carregar livros:", err);
        setError(err.message || "Erro ao carregar livros");
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Teste de Visualização de Livros</h1>
      
      {loading && <p>Carregando livros...</p>}
      {error && <p className="text-red-500">Erro: {error}</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {books.map((book) => (
          <Card key={book.id} className="overflow-hidden">
            <CardHeader className="bg-slate-100 pb-0">
              <CardTitle className="text-xl truncate">{book.title}</CardTitle>
              <p className="text-sm text-gray-500">ID: {book.id}</p>
              <p className="text-sm text-gray-500">Formatos: {book.format}</p>
              {book.epubUrl && <p className="text-xs text-gray-400 truncate">EPUB: {book.epubUrl}</p>}
              {book.pdfUrl && <p className="text-xs text-gray-400 truncate">PDF: {book.pdfUrl}</p>}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex space-x-2">
                {book.epubUrl && (
                  <Link href={`/ler/${book.id}/epub`}>
                    <Button size="sm" variant="outline">
                      Ler EPUB
                    </Button>
                  </Link>
                )}
                {book.pdfUrl && (
                  <Link href={`/ler/${book.id}/pdf`}>
                    <Button size="sm" variant="outline">
                      Ler PDF
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}