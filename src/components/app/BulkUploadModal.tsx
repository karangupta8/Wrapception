import { useState, useCallback, useRef } from 'react';
import { Upload, X, Check, FileImage, FileText, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useSession } from '@/context/SessionContext';
import { Category, CATEGORY_INFO, PLATFORM_SUGGESTIONS, InputType } from '@/types/session';

interface FileEntry {
    id: string;
    file: File;
    name: string;
    type: InputType;
    content: string;
    category: Category | null;
    platform: string;
    status: 'pending' | 'processing' | 'done' | 'error';
}

interface BulkUploadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function BulkUploadModal({ open, onOpenChange }: BulkUploadModalProps) {
    const { addSource } = useSession();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [files, setFiles] = useState<FileEntry[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [bulkCategory, setBulkCategory] = useState<Category | null>(null);
    const [bulkPlatform, setBulkPlatform] = useState('');

    const processFile = useCallback((file: File): Promise<FileEntry> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                const type: InputType = file.type.startsWith('image/') ? 'image' : 'pdf';
                resolve({
                    id: crypto.randomUUID(),
                    file,
                    name: file.name,
                    type,
                    content: reader.result as string,
                    category: null,
                    platform: '',
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
        }
    }, [handleFiles]);

    const removeFile = useCallback((id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    }, []);

    const updateFile = useCallback((id: string, updates: Partial<FileEntry>) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    }, []);

    const applyToAll = useCallback(() => {
        if (bulkCategory || bulkPlatform) {
            setFiles(prev => prev.map(f => ({
                ...f,
                category: bulkCategory || f.category,
                platform: bulkPlatform || f.platform,
            })));
        }
    }, [bulkCategory, bulkPlatform]);

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
                });
                updateFile(file.id, { status: 'done' });
            } catch {
                updateFile(file.id, { status: 'error' });
            }

            // Small delay for visual feedback
            await new Promise(r => setTimeout(r, 150));
        }

        setIsUploading(false);

        // Close after brief delay to show completion
        setTimeout(() => {
            onOpenChange(false);
            setFiles([]);
            setUploadProgress(0);
            setBulkCategory(null);
            setBulkPlatform('');
        }, 500);
    }, [files, addSource, updateFile, onOpenChange]);

    const canSubmit = files.length > 0 && files.every(f => f.category);
    const suggestedPlatforms = bulkCategory ? PLATFORM_SUGGESTIONS[bulkCategory] : [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl">Bulk Upload</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-4">
                    {/* Drop Zone */}
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
                            Supports images and PDFs
                        </p>
                    </div>

                    {/* Bulk Actions */}
                    {files.length > 0 && (
                        <div className="p-4 rounded-xl bg-secondary/50 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <ChevronDown className="w-4 h-4" />
                                Apply to all {files.length} files
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

                                <Select
                                    value={bulkPlatform}
                                    onValueChange={setBulkPlatform}
                                    disabled={!bulkCategory}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select platform" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suggestedPlatforms.map((p) => (
                                            <SelectItem key={p} value={p.toLowerCase()}>
                                                {p}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={applyToAll}
                                disabled={!bulkCategory && !bulkPlatform}
                            >
                                Apply to All
                            </Button>
                        </div>
                    )}

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="space-y-2">
                            {files.map((file) => (
                                <div
                                    key={file.id}
                                    className={`
                    p-3 rounded-xl border flex items-center gap-3 transition-all
                    ${file.status === 'done' ? 'bg-primary/5 border-primary/30' :
                                            file.status === 'error' ? 'bg-destructive/5 border-destructive/30' :
                                                'bg-card border-border'}
                  `}
                                >
                                    {/* File Icon */}
                                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                                        {file.type === 'image' ? (
                                            <FileImage className="w-5 h-5 text-muted-foreground" />
                                        ) : (
                                            <FileText className="w-5 h-5 text-muted-foreground" />
                                        )}
                                    </div>

                                    {/* File Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{file.name}</p>
                                        <div className="flex gap-2 mt-1">
                                            <Select
                                                value={file.category || ''}
                                                onValueChange={(v) => updateFile(file.id, { category: v as Category })}
                                                disabled={isUploading}
                                            >
                                                <SelectTrigger className="h-7 text-xs w-32">
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
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Progress */}
                    {isUploading && (
                        <div className="space-y-2">
                            <Progress value={uploadProgress} className="h-2" />
                            <p className="text-sm text-center text-muted-foreground">
                                Uploading... {Math.round(uploadProgress)}%
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!canSubmit || isUploading}
                        className="gradient-hero border-0"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload {files.length} {files.length === 1 ? 'file' : 'files'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
