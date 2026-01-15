// =============================================================================
// Settings Panel Component
// =============================================================================
// This component allows users to configure their LLM provider, API keys,
// and F5 Guardrails settings. It's displayed as a slide-out panel from the
// right side of the screen.
//
// Key features:
// - LLM Provider selection (Anthropic, OpenAI, Local)
// - API key input with show/hide toggle
// - Model selection dropdown
// - Temperature and max tokens controls
// - F5 Guardrails toggle and configuration
// - Connection testing
// =============================================================================

"use client";

import React, { useState } from "react";
import {
  X,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  Settings,
  Shield,
  Bot,
  Key,
  RotateCcw,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Label, 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  Switch,
  Slider
} from "@/components/ui/form-components";
import { useCTFStore } from "@/lib/store";
import { AVAILABLE_MODELS, LLMProvider } from "@/types";
import { testConnection } from "@/lib/llm-service";
import { testGuardrailsConnection } from "@/lib/guardrails-service";
import { cn, maskApiKey } from "@/lib/utils";
import { useSession } from "@/lib/auth-context";

// -----------------------------------------------------------------------------
// Settings Panel Component
// -----------------------------------------------------------------------------

export function SettingsPanel() {
  // Get state and actions from our global store
  const {
    llmConfig,
    setLLMConfig,
    guardrailsConfig,
    setGuardrailsConfig,
    isSettingsOpen,
    setSettingsOpen,
    llmConnectionStatus,
    setLLMConnectionStatus,
    guardrailsConnectionStatus,
    setGuardrailsConnectionStatus,
    resetProgress,
  } = useCTFStore();

  // Get session for user info
  const { data: session } = useSession();

  // Local state for UI
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGuardrailsKey, setShowGuardrailsKey] = useState(false);

  // Check if admin has provided system-wide API keys
  const [adminKeysEnabled, setAdminKeysEnabled] = useState(false);
  const [adminProvider, setAdminProvider] = useState<string>('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [passwordChangeError, setPasswordChangeError] = useState('');

  // Reset progress state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resetError, setResetError] = useState('');

  // Fetch system config from API
  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config');
        const config = await res.json();
        setAdminKeysEnabled(config.enabled && (config.hasAnthropicKey || config.hasOpenaiKey));
        setAdminProvider(config.defaultProvider || '');
      } catch (error) {
        console.error('Failed to fetch system config:', error);
      }
    };

    if (isSettingsOpen) {
      fetchConfig();
    }
  }, [isSettingsOpen]);

  // Handle LLM provider change
  const handleProviderChange = (provider: LLMProvider) => {
    // Reset model to first available for new provider
    const defaultModel = AVAILABLE_MODELS[provider][0];
    setLLMConfig({ provider, model: defaultModel, apiKey: '' });
  };

  // Test LLM connection
  const handleTestLLMConnection = async () => {
    setLLMConnectionStatus('testing');
    const success = await testConnection(llmConfig);
    setLLMConnectionStatus(success ? 'connected' : 'error');
  };

  // Test Guardrails connection
  const handleTestGuardrailsConnection = async () => {
    setGuardrailsConnectionStatus('testing');
    const success = await testGuardrailsConnection(guardrailsConfig);
    setGuardrailsConnectionStatus(success ? 'connected' : 'error');
  };

  // Handle reset progress
  const handleResetProgress = async () => {
    setResetStatus('loading');
    setResetError('');

    try {
      const res = await fetch('/api/user/reset-progress', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setResetStatus('error');
        setResetError(data.error || 'Failed to reset progress');
        return;
      }

      // Reset local store state
      resetProgress();
      setResetStatus('success');
      setShowResetConfirm(false);

      // Reset status after 3 seconds
      setTimeout(() => setResetStatus('idle'), 3000);
    } catch (error) {
      setResetStatus('error');
      setResetError('Failed to reset progress');
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    setPasswordChangeError('');

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordChangeError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordChangeError('New password must be at least 8 characters');
      return;
    }

    setPasswordChangeStatus('loading');

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordChangeStatus('error');
        setPasswordChangeError(data.error || 'Failed to change password');
        return;
      }

      setPasswordChangeStatus('success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Reset status after 3 seconds
      setTimeout(() => setPasswordChangeStatus('idle'), 3000);
    } catch (error) {
      setPasswordChangeStatus('error');
      setPasswordChangeError('Failed to change password');
    }
  };

  // Don't render if panel is closed
  if (!isSettingsOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setSettingsOpen(false)}
      />
      
      {/* Settings panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l shadow-xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSettingsOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 space-y-6">
          {/* =================================================================
              LLM Configuration Section
              ================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Bot className="h-4 w-4" />
              <span>LLM Configuration</span>
            </div>

            {/* Show message when admin keys are configured */}
            {adminKeysEnabled ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <Check className="h-4 w-4" />
                  <span className="font-medium">System API Keys Active</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  API keys are managed by the administrator. You're using {adminProvider === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI (GPT)'}.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  No additional configuration needed - just start playing!
                </p>
              </div>
            ) : (
              <>
                {/* Provider Selection */}
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Select
                    value={llmConfig.provider}
                    onValueChange={(value) => handleProviderChange(value as LLMProvider)}
                  >
                    <SelectTrigger id="provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                      <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                      <SelectItem value="local">Local LLM (Ollama)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* API Key Input (not shown for local) */}
                {llmConfig.provider !== 'local' && (
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <div className="relative">
                      <Input
                        id="apiKey"
                        type={showApiKey ? "text" : "password"}
                        value={llmConfig.apiKey}
                        onChange={(e) => setLLMConfig({ apiKey: e.target.value })}
                        placeholder={
                          llmConfig.provider === 'anthropic'
                            ? "sk-ant-..."
                            : "sk-..."
                        }
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your API key is stored in your browser session only.
                    </p>
                  </div>
                )}

                {/* Local Endpoint (only for local provider) */}
                {llmConfig.provider === 'local' && (
                  <div className="space-y-2">
                    <Label htmlFor="localEndpoint">Endpoint URL</Label>
                    <Input
                      id="localEndpoint"
                      type="text"
                      value={llmConfig.localEndpoint || ''}
                      onChange={(e) => setLLMConfig({ localEndpoint: e.target.value })}
                      placeholder="http://localhost:11434"
                    />
                  </div>
                )}

                {/* Model Selection */}
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select
                    value={llmConfig.model}
                    onValueChange={(value) => setLLMConfig({ model: value })}
                  >
                    <SelectTrigger id="model">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_MODELS[llmConfig.provider].map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Temperature Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Temperature</Label>
                    <span className="text-sm text-muted-foreground">
                      {llmConfig.temperature.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    value={[llmConfig.temperature]}
                    onValueChange={([value]) => setLLMConfig({ temperature: value })}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher = more creative, Lower = more focused
                  </p>
                </div>

                {/* Max Tokens */}
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={llmConfig.maxTokens}
                    onChange={(e) => setLLMConfig({ maxTokens: parseInt(e.target.value) || 1024 })}
                    min={100}
                    max={4096}
                  />
                </div>

                {/* Test Connection Button */}
                <Button
                  onClick={handleTestLLMConnection}
                  disabled={
                    llmConnectionStatus === 'testing' ||
                    (llmConfig.provider !== 'local' && !llmConfig.apiKey)
                  }
                  className="w-full"
                  variant={
                    llmConnectionStatus === 'connected' ? 'success' :
                    llmConnectionStatus === 'error' ? 'destructive' : 'default'
                  }
                >
                  {llmConnectionStatus === 'testing' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : llmConnectionStatus === 'connected' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Connected
                    </>
                  ) : llmConnectionStatus === 'error' ? (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Connection Failed
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
              </>
            )}
          </section>

          {/* Divider */}
          <div className="border-t" />

          {/* =================================================================
              Change Password Section
              ================================================================= */}
          {session?.user && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Key className="h-4 w-4" />
                <span>Change Password</span>
              </div>

              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              {/* Error Message */}
              {passwordChangeError && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <span>{passwordChangeError}</span>
                </div>
              )}

              {/* Change Password Button */}
              <Button
                onClick={handlePasswordChange}
                disabled={passwordChangeStatus === 'loading'}
                className="w-full"
                variant={
                  passwordChangeStatus === 'success' ? 'success' :
                  passwordChangeStatus === 'error' ? 'destructive' : 'default'
                }
              >
                {passwordChangeStatus === 'loading' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Changing Password...
                  </>
                ) : passwordChangeStatus === 'success' ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Password Changed
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </section>
          )}

          {/* Divider */}
          <div className="border-t" />

          {/* =================================================================
              Reset Progress Section
              ================================================================= */}
          {session?.user && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <RotateCcw className="h-4 w-4" />
                <span>Game Progress</span>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-500 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Reset Progress</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  This will reset all your game progress including scores, completed levels, and attempt history. This action cannot be undone.
                </p>

                {resetStatus === 'success' ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="h-4 w-4" />
                    <span>Progress reset successfully!</span>
                  </div>
                ) : showResetConfirm ? (
                  <div className="space-y-3">
                    <p className="text-sm text-yellow-500 font-medium">
                      Are you sure you want to reset all your progress?
                    </p>
                    {resetError && (
                      <div className="flex items-center gap-2 text-sm text-red-500">
                        <AlertCircle className="h-4 w-4" />
                        <span>{resetError}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleResetProgress}
                        disabled={resetStatus === 'loading'}
                        variant="destructive"
                        size="sm"
                      >
                        {resetStatus === 'loading' ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Resetting...
                          </>
                        ) : (
                          'Yes, Reset Everything'
                        )}
                      </Button>
                      <Button
                        onClick={() => setShowResetConfirm(false)}
                        disabled={resetStatus === 'loading'}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowResetConfirm(true)}
                    variant="outline"
                    className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset My Progress
                  </Button>
                )}
              </div>
            </section>
          )}

          {/* F5 Guardrails Section - only shown when admin keys NOT enabled */}
          {!adminKeysEnabled && (
            <>
              {/* Divider */}
              <div className="border-t" />

              {/* =================================================================
                  F5 Guardrails Configuration Section
                  ================================================================= */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>F5 AI Guardrails (Level 6)</span>
                </div>

                {/* Enable Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="guardrails-toggle">Enable Guardrails</Label>
                    <p className="text-xs text-muted-foreground">
                      Required for Level 6 challenge
                    </p>
                  </div>
                  <Switch
                    id="guardrails-toggle"
                    checked={guardrailsConfig.enabled}
                    onCheckedChange={(checked) =>
                      setGuardrailsConfig({ enabled: checked })
                    }
                  />
                </div>

                {/* Guardrails settings (only shown when enabled) */}
                {guardrailsConfig.enabled && (
                  <>
                    {/* Guardrails API Key */}
                    <div className="space-y-2">
                      <Label htmlFor="guardrailsKey">F5 Guardrails API Key</Label>
                      <div className="relative">
                        <Input
                          id="guardrailsKey"
                          type={showGuardrailsKey ? "text" : "password"}
                          value={guardrailsConfig.apiKey}
                          onChange={(e) =>
                            setGuardrailsConfig({ apiKey: e.target.value })
                          }
                          placeholder="Enter your F5/CalypsoAI API key"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowGuardrailsKey(!showGuardrailsKey)}
                        >
                          {showGuardrailsKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Custom Endpoint (optional) */}
                    <div className="space-y-2">
                      <Label htmlFor="guardrailsEndpoint">
                        Custom Endpoint <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="guardrailsEndpoint"
                        type="text"
                        value={guardrailsConfig.endpoint || ''}
                        onChange={(e) =>
                          setGuardrailsConfig({ endpoint: e.target.value })
                        }
                        placeholder="https://api.calypsoai.com/v1/guardrails"
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave blank to use default F5 Guardrails endpoint
                      </p>
                    </div>

                    {/* Test Guardrails Connection */}
                    <Button
                      onClick={handleTestGuardrailsConnection}
                      disabled={
                        guardrailsConnectionStatus === 'testing' ||
                        !guardrailsConfig.apiKey
                      }
                      className="w-full"
                      variant={
                        guardrailsConnectionStatus === 'connected' ? 'success' :
                        guardrailsConnectionStatus === 'error' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {guardrailsConnectionStatus === 'testing' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : guardrailsConnectionStatus === 'connected' ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Guardrails Connected
                        </>
                      ) : guardrailsConnectionStatus === 'error' ? (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Connection Failed
                        </>
                      ) : (
                        'Test Guardrails Connection'
                      )}
                    </Button>
                  </>
                )}
              </section>
            </>
          )}

          {/* Info box - different content based on admin keys */}
          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            {adminKeysEnabled ? (
              <>
                <h4 className="font-medium mb-2">System Configuration</h4>
                <ul className="space-y-1 text-muted-foreground text-xs">
                  <li>• API keys are managed by the administrator</li>
                  <li>• No additional configuration required</li>
                  <li>• Just start playing and have fun!</li>
                </ul>
              </>
            ) : (
              <>
                <h4 className="font-medium mb-2">About API Keys</h4>
                <ul className="space-y-1 text-muted-foreground text-xs">
                  <li>• Your API keys are stored in your browser session only</li>
                  <li>• Keys are sent directly to the provider (not our servers)</li>
                  <li>• Closing the browser tab will clear your keys</li>
                  <li>• You are responsible for your own API usage costs</li>
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
