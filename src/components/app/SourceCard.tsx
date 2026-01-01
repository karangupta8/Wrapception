import { Music, Heart, BookOpen, Film, Code, Zap, Layers, Trash2, Image, FileText, Type } from 'lucide-react';
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
          
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs">
              <InputIcon className="w-3 h-3" />
              <span className="capitalize">{source.inputType}</span>
            </div>
            <div className={`px-2 py-1 rounded-md text-xs ${
              source.status === 'processed' 
                ? 'bg-primary/10 text-primary' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {source.status}
            </div>
          </div>

          {source.notes && (
            <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{source.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}
