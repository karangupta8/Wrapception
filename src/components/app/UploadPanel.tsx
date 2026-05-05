import { useState, useCallback, useRef } from 'react';
import { Upload, Check, FileImage, FileText, Trash2, ChevronDown, AlignLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/context/SessionContext';
import { Category, CATEGORY_INFO, InputType } from '@/types/session';

interface FileEntry {
    id: string;
    file?: File;
    name: string;
    type: InputType;
    content: string;
    category: Category | null;
    platform: string;
    notes?: string;
    status: 'pending' | 'processing' | 'done' | 'error';
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

export function UploadPanel() {
    const { addSource } = useSession();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [files, setFiles] = useState<FileEntry[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [bulkCategory, setBulkCategory] = useState<Category | null>(null);
    
    // Text snippet mode
    const [isTextMode, setIsTextMode] = useState(false);
    const [textSnippet, setTextSnippet] = useState('');

    const processFile = useCallback((file: File): Promise<FileEntry> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                const type: InputType = file.type.startsWith('image/') ? 'image' : 'pdf';
                const detected = detectPlatform(file.name);
                resolve({
                    id: crypto.randomUUID(),
                    file,
                    name: file.name,
                    type,
                    content: reader.result as string,
                    category: detected?.category || null,
                    platform: detected?.platform || '',
                    status: 'pending',
                });
            };
            reader.readAsDataURL(file);
        });
    }, []);

    const handleFiles = useCallback(async (fileList: FileList) => {
        const validFiles = Array.from(fileList).filter(
            f => f.type.startsWith('image/') || f.type === 'application/pdf'
        );

        const processed = await Promise.all(validFiles.map(processFile));
        setFiles(prev => [...prev, ...processed]);
    }, [processFile]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleFiles(e.target.files);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [handleFiles]);

    const addTextSnippet = useCallback(() => {
        if (!textSnippet.trim()) return;
        
        const newEntry: FileEntry = {
            id: crypto.randomUUID(),
            name: `Text snippet (${files.length + 1})`,
            type: 'text',
            content: textSnippet,
            category: null,
            platform: '',
            status: 'pending',
        };
        
        setFiles(prev => [...prev, newEntry]);
        setTextSnippet('');
        setIsTextMode(false);
    }, [textSnippet, files.length]);

    const removeFile = useCallback((id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    }, []);

    const updateFile = useCallback((id: string, updates: Partial<FileEntry>) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    }, []);

    const applyToAll = useCallback(() => {
        if (bulkCategory) {
            setFiles(prev => prev.map(f => ({
                ...f,
                category: bulkCategory || f.category,
            })));
        }
    }, [bulkCategory]);

    const handleSubmit = useCallback(async () => {
        const validFiles = files.filter(f => f.category && f.content);
        if (validFiles.length === 0) return;

        setIsUploading(true);

        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            setUploadProgress(((i + 1) / validFiles.length) * 100);

            updateFile(file.id, { status: 'processing' });

            try {
                addSource({
                    category: file.category!,
                    platformName: file.platform || 'Unknown',
                    inputType: file.type,
                    rawContent: file.content,
                    fileName: file.name,
                    notes: file.notes,
                });
                updateFile(file.id, { status: 'done' });
            } catch {
                updateFile(file.id, { status: 'error' });
            }

            await new Promise(r => setTimeout(r, 150));
        }

        setIsUploading(false);

        setTimeout(() => {
            setFiles([]);
            setUploadProgress(0);
            setBulkCategory(null);
        }, 500);
    }, [files, addSource, updateFile]);

    const canSubmit = files.length > 0 && files.every(f => f.category);

    return (
        <div className="bg-card rounded-2xl shadow-card p-6 border border-border">
            <h2 className="font-display text-2xl mb-4">Upload Wrap</h2>

            <div className="space-y-4">
                {/* Input Area (Drop zone or Text) */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-sm font-medium text-muted-foreground">Add Content</span>
                        <button
                            onClick={() => setIsTextMode(!isTextMode)}
                            className="text-xs text-primary hover:underline font-medium"
                        >
                            {isTextMode ? 'Upload files instead' : 'Paste text instead'}
                        </button>
                    </div>
                    
                    {isTextMode ? (
                        <div className="space-y-2">
                            <Textarea
                                placeholder="Paste your Wrapped text or data here..."
                                value={textSnippet}
                                onChange={(e) => setTextSnippet(e.target.value)}
                                rows={5}
                                className="resize-none"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => { setIsTextMode(false); setTextSnippet(''); }}>Cancel</Button>
                                <Button size="sm" onClick={addTextSnippet} disabled={!textSnippet.trim()}>Add Text Snippet</Button>
                            </div>
                        </div>
                    ) : (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                              ${isDragging
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/30 hover:bg-secondary/30'
                              }
                            `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,application/pdf"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                            <p className="font-medium">Drop files here or click to browse</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Supports images and PDFs. You can select multiple files.
                            </p>
                        </div>
                    )}
                </div>

                {/* Bulk Actions */}
                {files.length > 1 && (
                    <div className="p-4 rounded-xl bg-secondary/50 space-y-3 mt-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <ChevronDown className="w-4 h-4" />
                            Apply to all {files.length} items
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Select
                                value={bulkCategory || ''}
                                onValueChange={(v) => setBulkCategory(v as Category)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(Object.keys(CATEGORY_INFO) as Category[]).map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                            {CATEGORY_INFO[cat].label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={applyToAll}
                            disabled={!bulkCategory}
                        >
                            Apply to All
                        </Button>
                    </div>
                )}

                {/* File List */}
                {files.length > 0 && (
                    <div className="space-y-3 mt-4">
                        <h4 className="text-sm font-medium text-muted-foreground">Items to Upload</h4>
                        {files.map((file) => (
                            <div
                                key={file.id}
                                className={`
                                  p-3 rounded-xl border transition-all flex flex-col gap-3
                                  ${file.status === 'done' ? 'bg-primary/5 border-primary/30' :
                                    file.status === 'error' ? 'bg-destructive/5 border-destructive/30' :
                                    'bg-card border-border'}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    {/* File Icon / Thumbnail */}
                                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                                        {file.type === 'image' && file.content ? (
                                            <img src={file.content} alt={file.name} className="w-full h-full object-cover" />
                                        ) : file.type === 'pdf' ? (
                                            <FileText className="w-5 h-5 text-muted-foreground" />
                                        ) : (
                                            <AlignLeft className="w-5 h-5 text-muted-foreground" />
                                        )}
                                    </div>

                                    {/* File Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate" title={file.name}>{file.name}</p>
                                    </div>

                                    {/* Status / Actions */}
                                    <div className="shrink-0">
                                        {file.status === 'done' ? (
                                            <Check className="w-5 h-5 text-primary" />
                                        ) : file.status === 'processing' ? (
                                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <button
                                                onClick={() => removeFile(file.id)}
                                                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                                title="Remove item"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                    <div className="flex-1 mt-1">
                                        <Select
                                            value={file.category || ''}
                                            onValueChange={(v) => {
                                                updateFile(file.id, { category: v as Category });
                                            }}
                                            disabled={isUploading}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(Object.keys(CATEGORY_INFO) as Category[]).map((cat) => (
                                                    <SelectItem key={cat} value={cat}>
                                                        {CATEGORY_INFO[cat].label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                {/* Optional Notes */}
                                <Input
                                    placeholder="Notes (optional)..."
                                    value={file.notes || ''}
                                    onChange={(e) => updateFile(file.id, { notes: e.target.value })}
                                    className="h-8 text-xs mt-1 bg-secondary/30"
                                    disabled={isUploading}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Progress */}
                {isUploading && (
                    <div className="space-y-2 mt-4">
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-sm text-center text-muted-foreground">
                            Uploading... {Math.round(uploadProgress)}%
                        </p>
                    </div>
                )}

                {files.length > 0 && (
                    <div className="pt-4 mt-4 border-t flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setFiles([])} disabled={isUploading}>
                            Clear All
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!canSubmit || isUploading}
                            className="gradient-hero border-0"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload {files.length} {files.length === 1 ? 'item' : 'items'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
