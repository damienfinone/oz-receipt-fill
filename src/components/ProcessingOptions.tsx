import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, Zap, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProcessingOptionsProps {
  useAI: boolean;
  onUseAIChange: (enabled: boolean) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onSaveApiKey: () => void;
  isApiKeyValid: boolean;
}

export function ProcessingOptions({
  useAI,
  onUseAIChange,
  apiKey,
  onApiKeyChange,
  onSaveApiKey,
  isApiKeyValid
}: ProcessingOptionsProps) {
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Settings className="h-5 w-5" />
        <h3 className="font-semibold">Processing Options</h3>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="ai-processing" className="text-sm font-medium">
              AI-Enhanced Parsing
            </Label>
            <p className="text-xs text-muted-foreground">
              Use GPT-4 for more accurate data extraction (~95% accuracy)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="ai-processing"
              checked={useAI && isApiKeyValid}
              onCheckedChange={(checked) => {
                if (checked && !isApiKeyValid) {
                  setShowApiKeyInput(true);
                } else {
                  onUseAIChange(checked);
                }
              }}
              disabled={useAI && !isApiKeyValid}
            />
            <Zap className="h-4 w-4 text-yellow-500" />
          </div>
        </div>

        {(showApiKeyInput || (useAI && !isApiKeyValid)) && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <Label htmlFor="api-key" className="text-sm">
              OpenAI API Key
            </Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                className="font-mono text-sm"
              />
              <Button 
                onClick={() => {
                  onSaveApiKey();
                  setShowApiKeyInput(false);
                }}
                disabled={!apiKey.startsWith('sk-')}
                size="sm"
              >
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your API key will be stored locally and used for processing. Cost: ~$0.01-0.03 per invoice.
            </p>
          </div>
        )}

        {!useAI && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Using local OCR with regex parsing (~60% accuracy). Enable AI processing for better results.
            </AlertDescription>
          </Alert>
        )}

        {useAI && isApiKeyValid && (
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription className="text-sm">
              AI processing enabled. This will provide more accurate results but uses your OpenAI credits.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
}