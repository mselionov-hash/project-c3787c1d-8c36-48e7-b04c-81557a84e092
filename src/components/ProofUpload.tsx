import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, Loader2, X, Image, FileText } from 'lucide-react';

interface ProofUploadProps {
  entityType: 'tranche' | 'repayment';
  entityId?: string;
  userId: string;
  onUploaded?: (url: string) => void;
  /** For use before entity is saved — returns file URLs to parent */
  pendingFiles?: string[];
  onPendingChange?: (files: string[]) => void;
  compact?: boolean;
}

export const ProofUpload = ({
  entityType,
  entityId,
  userId,
  onUploaded,
  pendingFiles = [],
  onPendingChange,
  compact = false,
}: ProofUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${userId}/${entityType}/${entityId || 'pending'}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from('transfer-proofs')
          .upload(path, file, { upsert: false });
        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('transfer-proofs')
          .getPublicUrl(path);

        const url = urlData.publicUrl;
        onUploaded?.(url);
        if (onPendingChange) {
          onPendingChange([...pendingFiles, url]);
        }
      }
      toast.success('Файл загружен');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeFile = (url: string) => {
    onPendingChange?.(pendingFiles.filter(f => f !== url));
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className="hidden"
        onChange={handleUpload}
      />
      <Button
        type="button"
        variant="outline"
        size={compact ? 'sm' : 'default'}
        className={`rounded-xl gap-2 ${compact ? 'text-xs' : 'text-sm'}`}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {compact ? 'Прикрепить' : 'Прикрепить подтверждение перевода'}
      </Button>

      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {pendingFiles.map((url, i) => (
            <div key={i} className="relative group">
              {isImage(url) ? (
                <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-border/50" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <button
                onClick={() => removeFile(url)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
