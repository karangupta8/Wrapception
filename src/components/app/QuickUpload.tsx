import { useState, useCallback, useRef } from 'react';
import { Upload, Image, FileText, X, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/context/SessionContext';
import { Category, CATEGORY_INFO, PLATFORM_SUGGESTIONS, InputType } from '@/types/session';

interface QuickUploadProps {
    onClose?: () => void;
    className?: string;
}

// Platform detection patterns from filename
const PLATFORM_PATTERNS: { pattern: RegExp; platform: string; category: Category }[] = [
    { pattern: /spotify/i, platform: 'spotify', category: 'music' },
    { pattern: /apple.?music/i, platform: 'apple music', category: 'music' },
    { pattern: /youtube.?music/i, platform: 'youtube music', category: 'music' },
    { pattern: /strava/i, platform: 'strava', category: 'fitness' },
    { pattern: /garmin/i, platform: 'garmin', category: 'fitness' },
    { pattern: /peloton/i, platform: 'peloton', category: 'fitness' },
    { pattern: /goodreads/i, platform: 'goodreads', category: 'reading' },
    { pattern: /kindle/i, platform: 'kindle', category: 'reading' },
    { pattern: /audible/i, platform: 'audible', category: 'reading' },
    { pattern: /letterboxd/i, platform: 'letterboxd', category: 'movies' },
    { pattern: /netflix/i, platform: 'netflix', category: 'movies' },
    { pattern: /github/i, platform: 'github', category: 'work' },
    { pattern: /notion/i, platform: 'notion', category: 'productivity' },
    { pattern: /todoist/i, platform: 'todoist', category: 'productivity' },
];

function detectPlatform(filename: string): { platform: string; category: Category } | null {
    for (const { pattern, platform, category } of PLATFORM_PATTERNS) {
        if (pattern.test(filename)) {
            return { platform, category };
        }
    }
    return null;
}

export function QuickUpload({ onClose, className = '' }: QuickUploadProps) {
    const { addSource } = useSession();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [category, setCategory] = useState<Category | null>(null);
    const [platform, setPlatform] = useState('');
    const [inputType, setInputType] = useState<InputType | null>(null);
    const [rawContent, setRawContent] = useState('');
    const [fileName, setFileName] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isTextMode, setIsTextMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileProcess = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            setRawContent(reader.result as string);
            setFileName(file.name);

            if (file.type.startsWith('image/')) {
                setInputType('image');
            } else if (file.type === 'application/pdf') {
                setInputType('pdf');
            }

            // Auto-detect platform
            const detected = detectPlatform(file.name);
            if (detected) {
                setPlatform(detected.platform);
                if (!category) {
                    setCategory(detected.category);
                }
            }
        };
        reader.readAsDataURL(file);
    }, [category]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileProcess(file);
        }
    }, [handleFileProcess]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileProcess(file);
        }
    }, [handleFileProcess]);

    const handleSubmit = useCallback(() => {
        if (!category || !rawContent) return;

        setIsSubmitting(true);

        addSource({
            category,
            platformName: platform || 'Unknown',
            inputType: inputType || 'text',
            rawContent,
            fileName: fileName || undefined,
        });

        // Reset and close
        setTimeout(() => {
            setIsSubmitting(false);
            setCategory(null);
            setPlatform('');
            setInputType(null);
            setRawContent('');
            setFileName('');
            setIsTextMode(false);
            onClose?.();
        }, 300);
    }, [category, platform, inputType, rawContent, fileName, addSource, onClose]);

    const canSubmit = category && rawContent;

    const suggestedPlatforms = category ? PLATFORM_SUGGESTIONS[category] : [];

    return (
        <div className={`bg-card rounded-2xl shadow-card overflow-hidden ${className}`}>
            <div className="p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent" />
                    <h3 className="font-medium">Quick Add</h3>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className="p-5 space-y-5">
                {/* Category Selection - Chips */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <div className="flex flex-wrap gap-2">
                        {(Object.keys(CATEGORY_INFO) as Category[]).map((cat) => {
                            const info = CATEGORY_INFO[cat];
                            const isSelected = category === cat;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(cat)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isSelected
                                            ? 'text-white shadow-sm'
                                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                        }`}
                                    style={isSelected ? { backgroundColor: info.color } : undefined}
                                >
                                    {info.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* File Drop Zone or Text Input */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-muted-foreground">Content</label>
                        <button
                            onClick={() => {
                                setIsTextMode(!isTextMode);
                                if (!isTextMode) {
                                    setRawContent('');
                                    setFileName('');
                                    setInputType('text');
                                } else {
                                    setRawContent('');
                                    setInputType(null);
                                }
                            }}
                            className="text-xs text-primary hover:underline"
                        >
                            {isTextMode ? 'Upload file instead' : 'Paste text instead'}
                        </button>
                    </div>

                    {isTextMode ? (
                        <Textarea
                            placeholder="Paste your Wrapped data or stats here..."
                            value={rawContent}
                            onChange={(e) => {
                                setRawContent(e.target.value);
                                setInputType('text');
                            }}
                            rows={5}
                            className="resize-none"
                        />
                    ) : (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                ${isDragging
                                    ? 'border-primary bg-primary/5'
                                    : rawContent
                                        ? 'border-primary/50 bg-primary/5'
                                        : 'border-border hover:border-primary/30 hover:bg-secondary/30'
                                }
              `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            {rawContent ? (
                                <div className="space-y-2">
                                    <Check className="w-8 h-8 mx-auto text-primary" />
                                    <p className="font-medium text-sm truncate">{fileName}</p>
                                    <p className="text-xs text-muted-foreground">Click or drop to replace</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex justify-center gap-2">
                                        <Image className="w-6 h-6 text-muted-foreground" />
                                        <FileText className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Drop an image or PDF, or click to browse
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Platform - Quick select or custom */}
                {category && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Platform</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {suggestedPlatforms.slice(0, 5).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPlatform(p.toLowerCase())}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${platform === p.toLowerCase()
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <Input
                            placeholder="Or type platform name..."
                            value={platform}
                            onChange={(e) => setPlatform(e.target.value)}
                            className="text-sm"
                        />
                    </div>
                )}

                {/* Submit */}
                <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit || isSubmitting}
                    className="w-full gradient-hero border-0"
                >
                    {isSubmitting ? (
                        <>
                            <Check className="w-4 h-4 mr-2" />
                            Added!
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4 mr-2" />
                            Add to Collection
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
