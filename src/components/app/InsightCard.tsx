import { useState } from 'react';
import { Sparkles, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AIInsight, CATEGORY_INFO } from '@/types/session';

interface InsightCardProps {
  insight: AIInsight;
  onUpdate: (content: string) => void;
}

export function InsightCard({ insight, onUpdate }: InsightCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(insight.content);

  const handleSave = () => {
    onUpdate(editContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(insight.content);
    setIsEditing(false);
  };

  const categoryInfo = insight.category ? CATEGORY_INFO[insight.category] : null;

  return (
    <div className="group relative p-6 rounded-2xl gradient-card border border-border/50 shadow-soft hover:shadow-card transition-all duration-300">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          {categoryInfo && (
            <span 
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${categoryInfo.color}15`,
                color: categoryInfo.color 
              }}
            >
              {categoryInfo.label}
            </span>
          )}
          {insight.isEdited && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
        </div>

        {!isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="w-4 h-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-foreground/90 leading-relaxed italic font-display text-lg">
          "{insight.content}"
        </p>
      )}
    </div>
  );
}
