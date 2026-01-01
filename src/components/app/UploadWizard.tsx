import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Upload, FileText, Image, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSession } from '@/context/SessionContext';
import { Category, CATEGORY_INFO, PLATFORM_SUGGESTIONS, InputType } from '@/types/session';

type Step = 'category' | 'platform' | 'upload' | 'preview';

interface UploadWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function UploadWizard({ onComplete, onCancel }: UploadWizardProps) {
  const { addSource } = useSession();
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<Category | null>(null);
  const [platform, setPlatform] = useState<string>('');
  const [customPlatform, setCustomPlatform] = useState('');
  const [inputType, setInputType] = useState<InputType | null>(null);
  const [rawContent, setRawContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');

  const steps: Step[] = ['category', 'platform', 'upload', 'preview'];
  const currentStepIndex = steps.indexOf(step);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setRawContent(reader.result as string);
      setFileName(file.name);
      
      if (file.type.startsWith('image/')) {
        setInputType('image');
      } else if (file.type === 'application/pdf') {
        setInputType('pdf');
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!category || !inputType || !rawContent) return;

    addSource({
      category,
      platformName: platform === 'custom' ? customPlatform : platform,
      inputType,
      rawContent,
      fileName,
      notes,
    });

    onComplete();
  }, [category, platform, customPlatform, inputType, rawContent, fileName, notes, addSource, onComplete]);

  const canProceed = () => {
    switch (step) {
      case 'category': return category !== null;
      case 'platform': return platform !== '' && (platform !== 'custom' || customPlatform !== '');
      case 'upload': return inputType !== null && rawContent !== '';
      case 'preview': return true;
      default: return false;
    }
  };

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    } else {
      handleSubmit();
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    } else {
      onCancel();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i < currentStepIndex 
                  ? 'bg-primary text-primary-foreground' 
                  : i === currentStepIndex 
                    ? 'bg-accent text-accent-foreground' 
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < currentStepIndex ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 h-0.5 ${i < currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-card rounded-2xl shadow-card p-8 min-h-[400px]">
        {step === 'category' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl mb-2">Choose a Category</h2>
              <p className="text-muted-foreground">What type of Wrapped are you uploading?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(CATEGORY_INFO) as Category[]).map((cat) => {
                const info = CATEGORY_INFO[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      category === cat 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <span className="font-medium">{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 'platform' && category && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl mb-2">Choose Platform</h2>
              <p className="text-muted-foreground">Where is this Wrapped from?</p>
            </div>
            <div className="space-y-4">
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_SUGGESTIONS[category].map((p) => (
                    <SelectItem key={p} value={p.toLowerCase()}>{p}</SelectItem>
                  ))}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              {platform === 'custom' && (
                <Input
                  placeholder="Enter platform name"
                  value={customPlatform}
                  onChange={(e) => setCustomPlatform(e.target.value)}
                />
              )}
            </div>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl mb-2">Upload Content</h2>
              <p className="text-muted-foreground">Add your Wrapped screenshot, PDF, or paste text</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                onClick={() => setInputType('image')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  inputType === 'image' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                }`}
              >
                <Image className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm">Image</span>
              </button>
              <button
                onClick={() => setInputType('pdf')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  inputType === 'pdf' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                }`}
              >
                <FileText className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm">PDF</span>
              </button>
              <button
                onClick={() => setInputType('text')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  inputType === 'text' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                }`}
              >
                <Upload className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm">Text</span>
              </button>
            </div>

            {inputType && inputType !== 'text' && (
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                <input
                  type="file"
                  accept={inputType === 'image' ? 'image/*' : 'application/pdf'}
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {rawContent ? (
                    <div className="space-y-2">
                      <Check className="w-8 h-8 mx-auto text-primary" />
                      <p className="font-medium">{fileName}</p>
                      <p className="text-sm text-muted-foreground">Click to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">Click to upload or drag and drop</p>
                    </div>
                  )}
                </label>
              </div>
            )}

            {inputType === 'text' && (
              <Textarea
                placeholder="Paste your Wrapped text or data here..."
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                rows={8}
              />
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl mb-2">Preview & Confirm</h2>
              <p className="text-muted-foreground">Review your upload before saving</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-secondary/50">
                <Label className="text-sm text-muted-foreground">Category</Label>
                <p className="font-medium">{category && CATEGORY_INFO[category].label}</p>
              </div>

              <div className="p-4 rounded-xl bg-secondary/50">
                <Label className="text-sm text-muted-foreground">Platform</Label>
                <p className="font-medium capitalize">{platform === 'custom' ? customPlatform : platform}</p>
              </div>

              <div className="p-4 rounded-xl bg-secondary/50">
                <Label className="text-sm text-muted-foreground">Content</Label>
                <p className="font-medium">
                  {inputType === 'text' 
                    ? `${rawContent.slice(0, 100)}${rawContent.length > 100 ? '...' : ''}`
                    : fileName
                  }
                </p>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Notes (optional)</Label>
                <Textarea
                  placeholder="Add any notes about this Wrapped..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="ghost" onClick={goBack}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          {currentStepIndex === 0 ? 'Cancel' : 'Back'}
        </Button>
        <Button onClick={goNext} disabled={!canProceed()}>
          {step === 'preview' ? 'Save Upload' : 'Continue'}
          {step !== 'preview' && <ChevronRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
}
