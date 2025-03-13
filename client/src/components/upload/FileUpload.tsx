import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FileUploadProps {
  endpoint: string;
  fileType: "cover" | "epub" | "pdf";
  allowedTypes: string[];
  maxSizeMB: number;
  onSuccess?: (url: string) => void;
  className?: string;
}

export default function FileUpload({
  endpoint,
  fileType,
  allowedTypes,
  maxSizeMB,
  onSuccess,
  className
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    setSuccess(false);

    // Validar tipo de arquivo
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    const isValidType = allowedTypes.some(type => {
      if (type.startsWith(".")) {
        return fileExtension === type.substring(1);
      }
      return selectedFile.type.includes(type);
    });

    if (!isValidType) {
      setError(`Tipo de arquivo inválido. Tipos permitidos: ${allowedTypes.join(", ")}`);
      return;
    }

    // Validar tamanho
    if (selectedFile.size > maxSizeBytes) {
      setError(`Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`);
      return;
    }

    setFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append(fileType, file);

      // Simulação de progresso para feedback visual
      const progressInterval = setInterval(() => {
        setProgress(prevProgress => {
          const newProgress = prevProgress + 5;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 100);

      const response = await apiRequest(endpoint, {
        method: "POST",
        body: formData,
        // Não definimos Content-Type pois o browser vai adicionar com o boundary correto
      });

      clearInterval(progressInterval);
      setProgress(100);
      setSuccess(true);

      if (onSuccess && response) {
        let url = "";
        if (fileType === "cover") url = response.coverUrl;
        if (fileType === "epub") url = response.epubUrl;
        if (fileType === "pdf") url = response.pdfUrl;
        
        onSuccess(url);
      }

      toast({
        title: "Upload realizado com sucesso",
        description: `Arquivo ${file.name} enviado com sucesso`,
      });

      // Resetar após 2 segundos para permitir vizualizar o sucesso
      setTimeout(() => {
        setFile(null);
        setProgress(0);
        setUploading(false);
      }, 2000);
    } catch (error) {
      setProgress(0);
      setUploading(false);
      if (error instanceof Error) {
        setError(`Erro no upload: ${error.message}`);
      } else {
        setError("Erro desconhecido no upload");
      }
      toast({
        title: "Erro no upload",
        description: "Não foi possível completar o upload do arquivo",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setFile(null);
    setError(null);
    setSuccess(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const fileTypeName = fileType === "cover" 
    ? "capa" 
    : fileType === "epub" 
      ? "EPUB" 
      : "PDF";

  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor={`file-${fileType}`} className="text-lg font-semibold">
            Upload de {fileTypeName}
          </Label>
          {file && !uploading && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleCancel}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!file ? (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragging 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/20 hover:border-primary/50",
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">
                Arraste um arquivo ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground">
                {allowedTypes.join(", ")} (Máx: {maxSizeMB}MB)
              </p>
            </div>

            <Input
              id={`file-${fileType}`}
              ref={inputRef}
              type="file"
              accept={allowedTypes.join(",")}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-2 border rounded-md bg-background">
              <div className="p-2 rounded-md bg-primary/10">
                <CheckCircle className={cn(
                  "h-5 w-5",
                  success ? "text-green-500" : "text-primary"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>

            {uploading && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2 w-full" />
                <p className="text-xs text-center text-muted-foreground">
                  {progress === 100 ? "Processando..." : `${progress}%`}
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded">
                <AlertCircle className="h-4 w-4" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-2 text-sm text-green-500 bg-green-50 dark:bg-green-950/30 rounded">
                <CheckCircle className="h-4 w-4" />
                <p>Upload concluído com sucesso!</p>
              </div>
            )}

            {!uploading && !success && (
              <Button 
                onClick={handleUpload} 
                className="w-full"
                disabled={!!error}
              >
                Enviar arquivo
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}