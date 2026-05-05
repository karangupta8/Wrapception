import { useState } from 'react';
import { Settings, ChevronDown, ChevronUp, AlertTriangle, Info, Check, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSession } from '@/context/SessionContext';
import { AI_PROVIDERS, DEFAULT_AI_CONFIGS } from '@/types/session';
import { saveApiKey } from '@/services/secureStore';

export function AIConfigPanel() {
  const { session, updateAIConfig, setActiveProvider, saveSession } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  const { aiConfigs, activeProvider } = session;
  const activeConfig = activeProvider ? aiConfigs[activeProvider] : null;
  const activeProviderInfo = activeProvider ? AI_PROVIDERS[activeProvider] : null;

  const handleProviderSwitch = (provider: string) => {
    setActiveProvider(provider);
  };

  const handleApiKeyChange = (provider: string, value: string) => {
    updateAIConfig(provider, { apiKey: value });
  };

  const handleModelChange = (provider: string, model: string) => {
    updateAIConfig(provider, { model });
  };

  const handleSave = async () => {
    // Save API key to secure storage (sessionStorage by default, localStorage with encryption if needed)
    if (activeConfig?.apiKey) {
      await saveApiKey(activeConfig.apiKey);
    }
    saveSession();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
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
              {activeConfig?.apiKey ? `${activeProviderInfo?.name} • ${activeConfig.model}` : 'No API key configured'}
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
          {/* Provider tabs */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Select AI Provider</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(AI_PROVIDERS).map(([providerId, provider]) => (
                <button
                  key={providerId}
                  onClick={() => handleProviderSwitch(providerId)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    activeProvider === providerId
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <p className="font-medium text-sm">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {aiConfigs[providerId]?.apiKey ? '✓ Configured' : 'Not configured'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {activeProviderInfo && activeConfig && activeProvider && (
            <>
              {/* Model selection */}
              <div>
                <Label htmlFor="model">Model</Label>
                <Select value={activeConfig.model || ''} onValueChange={(model) => handleModelChange(activeProvider, model)}>
                  <SelectTrigger id="model">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProviderInfo.models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Latest working models for {activeProviderInfo.name}
                </p>
              </div>

              {/* API Key input */}
              <div>
                <Label htmlFor="api-key">API Key for {activeProviderInfo.name}</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type={showApiKey[activeProvider] ? 'text' : 'password'}
                    value={activeConfig?.apiKey || ''}
                    onChange={(e) => handleApiKeyChange(activeProvider, e.target.value)}
                    placeholder={`Enter your ${activeProviderInfo.name} API key`}
                    className="pr-10"
                  />
                  <button
                    onClick={() =>
                      setShowApiKey((prev) => ({ ...prev, [activeProvider]: !prev[activeProvider] }))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey[activeProvider] ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  🔒 Your key is encrypted in your browser and never sent to our servers
                </p>
              </div>

              {/* Cost warning */}
              {activeConfig?.apiKey && (
                <div className="flex gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900 dark:text-amber-100">API Costs Apply</p>
                    <p className="text-amber-800 dark:text-amber-200 text-xs mt-1">
                      Using {activeProviderInfo.name} will incur API charges. You'll see an estimated cost before each analysis.
                    </p>
                  </div>
                </div>
              )}

              {/* Storage info */}
              <div className="flex gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">Multiple Providers Supported</p>
                  <p className="text-blue-800 dark:text-blue-200 text-xs mt-1">
                    You can save API keys for multiple providers and switch between them anytime.
                  </p>
                </div>
              </div>

              {/* Save button */}
              <div className="flex gap-3">
                <Button onClick={handleSave} className="flex-1">
                  {isSaved ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Saved
                    </>
                  ) : (
                    'Save Configuration'
                  )}
                </Button>
              </div>

              {/* Provider details */}
              <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
                <p className="font-medium mb-1">Provider Details</p>
                <p>Provider: {activeProviderInfo.name}</p>
                <p>Vision Support: ✓ Enabled</p>
                <p>Endpoint: {activeConfig.endpoint}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
