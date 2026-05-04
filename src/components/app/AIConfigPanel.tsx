import { useState } from 'react';
import { Settings, ChevronDown, ChevronUp, AlertTriangle, Info, Save, Check, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSession } from '@/context/SessionContext';
import { DEFAULT_AI_CONFIGS } from '@/types/session';

export function AIConfigPanel() {
  const { session, updateAIConfig, saveSession } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { aiConfig } = session;

  const handleProviderChange = (provider: string) => {
    const preset = DEFAULT_AI_CONFIGS[provider];
    if (preset) {
      updateAIConfig({
        ...preset,
        apiKey: aiConfig.apiKey, // Keep existing API key
        headers: aiConfig.headers, // Keep existing headers
      });
    }
  };

  const handleHeadersChange = (value: string) => {
    try {
      const headers = JSON.parse(value);
      updateAIConfig({ headers });
    } catch {
      // Invalid JSON, ignore
    }
  };

  return (
    <div className="bg-card rounded-2xl shadow-card overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <div className="text-left">
            <h3 className="font-medium">AI Configuration</h3>
            <p className="text-sm text-muted-foreground">
              {aiConfig.enabled ? `${aiConfig.provider} • ${aiConfig.model}` : 'Disabled (using mock insights)'}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="p-5 border-t border-border space-y-6">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable AI Processing</Label>
              <p className="text-sm text-muted-foreground">Use your own AI provider for insights</p>
            </div>
            <Switch
              checked={aiConfig.enabled}
              onCheckedChange={(enabled) => updateAIConfig({ enabled })}
            />
          </div>

          {aiConfig.enabled && (
            <>
              {/* Cost warning */}
              <div className="flex gap-3 p-4 rounded-xl bg-accent/10 border border-accent/20">
                <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">API costs apply</p>
                  <p className="text-muted-foreground">
                    Using AI will make API calls to your configured provider.
                    Standard API pricing applies.
                  </p>
                </div>
              </div>

              {/* Vision capability warning */}
              {!aiConfig.visionSupported && (
                <div className="flex gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <EyeOff className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Images not supported by this provider</p>
                    <p className="text-muted-foreground">
                      <strong>{aiConfig.provider}</strong> ({aiConfig.model}) cannot analyse screenshots or images.
                      Switch to <strong>OpenAI GPT-4o</strong>, <strong>Google Gemini</strong>, or <strong>Anthropic Claude 3+</strong>
                      {' '}to upload wrap screenshots. Text pastes will still work.
                    </p>
                  </div>
                </div>
              )}

              {/* Provider selection */}
              <div className="space-y-2">
                <Label>Provider Template</Label>
                <Select value={aiConfig.provider} onValueChange={handleProviderChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="grok">Grok (xAI)</SelectItem>
                    <SelectItem value="groq">Groq</SelectItem>
                    <SelectItem value="custom">Custom Endpoint</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Endpoint */}
              <div className="space-y-2">
                <Label>API Endpoint</Label>
                <Input
                  value={aiConfig.endpoint}
                  onChange={(e) => updateAIConfig({ endpoint: e.target.value })}
                  placeholder="https://api.openai.com/v1/chat/completions"
                />
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={aiConfig.model}
                  onChange={(e) => updateAIConfig({ model: e.target.value })}
                  placeholder="gpt-4o-mini"
                />
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={aiConfig.apiKey}
                  onChange={(e) => updateAIConfig({ apiKey: e.target.value })}
                  placeholder="Enter your API key"
                />
              </div>

              {/* Save Button */}
              <Button
                onClick={() => {
                  saveSession();
                  setIsSaved(true);
                  setTimeout(() => setIsSaved(false), 2000);
                }}
                className="w-full"
                variant={isSaved ? "outline" : "default"}
              >
                {isSaved ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>

              <div className="flex gap-2 p-3 rounded-lg bg-secondary/50">
                <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Configuration saved in this browser (IndexedDB + localStorage). API key is stored in session storage and cleared when you close the tab.
                </p>
              </div>

              {/* Headers (JSON) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Headers (JSON)</Label>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Optional</span>
                </div>
                <Textarea
                  value={JSON.stringify(aiConfig.headers, null, 2)}
                  onChange={(e) => handleHeadersChange(e.target.value)}
                  placeholder='{"Authorization": "Bearer YOUR_API_KEY"}'
                  rows={4}
                  className="font-mono text-sm"
                />
                <div className="flex gap-2 p-3 rounded-lg bg-secondary/50">
                  <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Custom headers for authentication (e.g., API key). Only stored in this browser session.
                  </p>
                </div>
              </div>

              {/* Vision support toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Vision Support</Label>
                  <p className="text-sm text-muted-foreground">Enable image analysis</p>
                </div>
                <Switch
                  checked={aiConfig.visionSupported}
                  onCheckedChange={(visionSupported) => updateAIConfig({ visionSupported })}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
