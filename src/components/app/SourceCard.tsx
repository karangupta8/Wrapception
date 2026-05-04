import { Music, Heart, BookOpen, Film, Code, Zap, Layers, Trash2, Image, FileText, Type, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadedSource, Category, CATEGORY_INFO } from '@/types/session';

const categoryIcons: Record<Category, React.ComponentType<{ className?: string }>> = {
  music: Music,
  fitness: Heart,
  reading: BookOpen,
  movies: Film,
  work: Code,
  productivity: Zap,
  other: Layers,
};

const inputTypeIcons = {
  image: Image,
  pdf: FileText,
  text: Type,
};

interface SourceCardProps {
  source: UploadedSource;
  onRemove: () => void;
}

export function SourceCard({ source, onRemove }: SourceCardProps) {
  const CategoryIcon = categoryIcons[source.category];
  const InputIcon = inputTypeIcons[source.inputType];
  const categoryInfo = CATEGORY_INFO[source.category];

  return (
    <div className="group relative p-5 rounded-2xl bg-card shadow-card hover:shadow-elevated transition-all duration-300">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <div className="flex items-start gap-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${categoryInfo.color}20`, color: categoryInfo.color }}
        >
          <CategoryIcon className="w-6 h-6 text-current" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium capitalize truncate">{source.platformName}</h3>
          <p className="text-sm text-muted-foreground">{categoryInfo.label}</p>
          
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs">
              <InputIcon className="w-3 h-3" />
              <span className="capitalize">{source.inputType}</span>
            </div>

            {source.status === 'processing' && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-600 text-xs">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analysing…
              </div>
            )}
            {source.status === 'processed' && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs">
                <CheckCircle2 className="w-3 h-3" />
                Done
              </div>
            )}
            {source.status === 'failed' && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 text-red-600 text-xs">
                <XCircle className="w-3 h-3" />
                Failed
              </div>
            )}
            {source.status === 'uploaded' && (
              <div className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs">
                Ready
              </div>
            )}
          </div>

          {source.status === 'failed' && source.extractionError && (
            <p className="mt-2 text-xs text-red-600 line-clamp-2" title={source.extractionError}>
              {source.extractionError}
            </p>
          )}

          {source.notes && (
            <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{source.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}
