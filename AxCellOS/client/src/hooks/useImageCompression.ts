import { useState, useCallback } from 'react';

export interface CompressionResult {
  file: File;
  base64: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
  originalSizeKB: string;
  compressedSizeKB: string;
}

/**
 * Hook para comprimir imagens no cliente antes do upload
 * Aceita imagens até 50MB e comprime para Kilobytes em WebP mantendo qualidade
 * Retorna BASE64 apenas para preview local
 */
export function useImageCompression() {
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const compressImage = useCallback(
    async (
      file: File,
      options: {
        maxWidth?: number;
        maxHeight?: number;
        targetSizeKB?: number; // Tamanho alvo em KB
      } = {}
    ): Promise<CompressionResult | null> => {
      const { maxWidth = 2048, maxHeight = 2048, targetSizeKB = 500 } = options;

      // Validar tamanho máximo (50MB)
      const MAX_SIZE = 50 * 1024 * 1024; // 50MB
      if (file.size > MAX_SIZE) {
        setError(`Arquivo muito grande. Máximo: 50MB. Seu arquivo: ${formatFileSize(file.size)}`);
        return null;
      }

      setIsCompressing(true);
      setError(null);
      setProgress(0);

      try {
        // Validar se é imagem
        if (!file.type.startsWith('image/')) {
          throw new Error('O arquivo deve ser uma imagem');
        }

        setProgress(10);

        // Ler arquivo
        const arrayBuffer = await file.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: file.type });

        setProgress(20);

        // Criar canvas para redimensionar
        const img = new Image();
        const url = URL.createObjectURL(blob);

        return new Promise((resolve, reject) => {
          img.onload = async () => {
            try {
              URL.revokeObjectURL(url);
              setProgress(30);

              // Calcular novas dimensões (redimensionar agressivamente)
              let width = img.width;
              let height = img.height;

              if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
              }

              setProgress(40);

              // Criar canvas e desenhar imagem
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;

              const ctx = canvas.getContext('2d');
              if (!ctx) throw new Error('Não foi possível obter contexto do canvas');

              ctx.drawImage(img, 0, 0, width, height);

              setProgress(50);

              // Função para converter com qualidade adaptativa
              let quality = 85; // Começar com qualidade alta
              let compressedBlob: Blob | null = null;
              let attempts = 0;
              const maxAttempts = 5;

              while (attempts < maxAttempts) {
                compressedBlob = await new Promise((resolve) => {
                  canvas.toBlob(
                    (blob) => resolve(blob),
                    'image/webp',
                    quality / 100
                  );
                });

                if (!compressedBlob) {
                  reject(new Error('Falha ao converter imagem'));
                  return;
                }

                const sizeKB = compressedBlob.size / 1024;

                // Se atingiu o tamanho alvo ou qualidade mínima, parar
                if (sizeKB <= targetSizeKB || quality <= 40) {
                  break;
                }

                // Reduzir qualidade para próxima tentativa
                quality -= 10;
                attempts++;
              }

              if (!compressedBlob) {
                reject(new Error('Falha ao comprimir imagem'));
                return;
              }

              setProgress(80);

              // Converter para BASE64
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = reader.result as string;
                setProgress(100);

                const compressionRatio = Math.round(
                  ((file.size - compressedBlob!.size) / file.size) * 100
                );

                const compressedFile = new File(
                  [compressedBlob!],
                  file.name.replace(/\.[^/.]+$/, '.webp'),
                  { type: 'image/webp' }
                );

                resolve({
                  file: compressedFile,
                  base64,
                  originalSize: file.size,
                  compressedSize: compressedBlob!.size,
                  compressionRatio,
                  format: 'webp',
                  originalSizeKB: formatFileSize(file.size),
                  compressedSizeKB: formatFileSize(compressedBlob!.size),
                });
              };

              reader.onerror = () => {
                reject(new Error('Falha ao converter para BASE64'));
              };

              reader.readAsDataURL(compressedBlob);
            } catch (err) {
              reject(err);
            }
          };

          img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Falha ao carregar imagem'));
          };

          img.src = url;
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao comprimir imagem';
        setError(errorMessage);
        return null;
      } finally {
        setIsCompressing(false);
        setProgress(0);
      }
    },
    []
  );

  return {
    compressImage,
    isCompressing,
    error,
    progress,
  };
}
