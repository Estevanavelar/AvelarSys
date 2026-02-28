import { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useImageCompression } from '@/hooks/useImageCompression';
import { Progress } from '@/components/ui/progress';

interface ImageUploadFieldProps {
  onImageSelected?: (file: File, result: any) => void;
  label?: string;
  maxSizeMB?: number;
}

export default function ImageUploadField({
  onImageSelected,
  label = 'Foto do Produto',
  maxSizeMB = 50,
}: ImageUploadFieldProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [compressionResult, setCompressionResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { compressImage, isCompressing, error, progress } = useImageCompression();

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida');
      return;
    }

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Comprimir imagem
    const result = await compressImage(file, {
      maxWidth: 2048,
      maxHeight: 2048,
      targetSizeKB: 500,
    });

    if (result) {
      setSelectedFile(result.file);
      setCompressionResult(result);
      onImageSelected?.(result.file, result);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setCompressionResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-semibold text-foreground">{label}</label>

      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:bg-muted transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />

          <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="font-semibold text-foreground mb-1">Arraste a imagem aqui</p>
          <p className="text-sm text-muted-foreground">
            ou clique para selecionar (máx: {maxSizeMB}MB)
          </p>

          {isCompressing && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Comprimindo... {progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Preview */}
          <div className="relative rounded-2xl overflow-hidden bg-muted">
            <img
              src={preview || ''}
              alt="Preview"
              className="w-full h-48 object-cover"
            />
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Compression Stats */}
          {compressionResult && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="font-semibold text-green-900 dark:text-green-100">
                  Imagem comprimida com sucesso!
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Tamanho Original</p>
                  <p className="font-semibold text-foreground">
                    {compressionResult.originalSizeKB}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tamanho Comprimido</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    {compressionResult.compressedSizeKB}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Redução</p>
                  <p className="font-semibold text-foreground">
                    {compressionResult.compressionRatio}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Formato</p>
                  <p className="font-semibold text-foreground uppercase">
                    {compressionResult.format}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-100">Erro na compressão</p>
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Change button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-2 border border-border rounded-xl hover:bg-muted transition-colors font-semibold text-foreground"
          >
            Alterar Imagem
          </button>
        </div>
      )}
    </div>
  );
}
