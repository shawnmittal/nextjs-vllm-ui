"use client";

import { useState, useEffect } from "react";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Loader2, TestTube2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { ChatOptions } from "./chat/chat-options";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { basePath } from "@/lib/utils";

interface ApiSettingsProps {
  chatOptions: ChatOptions;
  setChatOptions: React.Dispatch<React.SetStateAction<ChatOptions>>;
}

interface Model {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
}

export default function ApiSettings({
  chatOptions,
  setChatOptions,
}: ApiSettingsProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  
  // Model selection states
  const [models, setModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const handleApiUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatOptions({ ...chatOptions, apiUrl: e.target.value });
    setTestResult(null); // Clear test result when URL changes
    // Clear models when URL changes
    setModels([]);
    setModelsError(null);
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatOptions({ ...chatOptions, apiKey: e.target.value });
    setTestResult(null);
  };

  const handleMaxTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 4096;
    setChatOptions({ ...chatOptions, maxTokens: Math.max(1, Math.min(100000, value)) });
  };

  const handleOmitMaxTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatOptions({ ...chatOptions, omitMaxTokens: e.target.checked });
  };

  const handleTopPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0.95;
    setChatOptions({ ...chatOptions, topP: Math.min(1, Math.max(0, value)) });
  };

  const handleOmitTopPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatOptions({ ...chatOptions, omitTopP: e.target.checked });
  };

  const handleModelChange = (value: string) => {
    setChatOptions({ ...chatOptions, selectedModel: value });
  };

  const handleBypassModelsCheckChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setChatOptions({ ...chatOptions, bypassModelsCheck: checked });
    // Clear test result when toggling bypass mode
    setTestResult(null);
    // Clear models error when enabling bypass
    if (checked) {
      setModelsError(null);
    }
  };

  const handleManualModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatOptions({ ...chatOptions, selectedModel: e.target.value });
  };

  // Fetch models function
  const fetchModels = async (showToast: boolean = true) => {
    if (!chatOptions.apiUrl) {
      setModelsError("Please configure API URL first");
      return;
    }

    setIsLoadingModels(true);
    setModelsError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(basePath + "/api/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiUrl: chatOptions.apiUrl,
          apiKey: chatOptions.apiKey,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const modelList = data.data || [];
        setModels(modelList);
        
        if (modelList.length > 0) {
          // If no model is selected, or selected model is not in list, select the first one
          if (!chatOptions.selectedModel || !modelList.find((m: Model) => m.id === chatOptions.selectedModel)) {
            setChatOptions({ ...chatOptions, selectedModel: modelList[0].id });
          }
          if (showToast) {
            toast.success(`Found ${modelList.length} model${modelList.length !== 1 ? 's' : ''}`);
          }
        } else {
          setModelsError("No models available");
          if (showToast) {
            toast.warning("No models found");
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        setModelsError(errorData.error || "Failed to fetch models");
        if (showToast) {
          toast.error("Failed to fetch models");
        }
      }
    } catch (error: any) {
      const message = error.name === "AbortError" 
        ? "Request timeout" 
        : "Failed to fetch models";
      setModelsError(message);
      if (showToast) {
        toast.error(message);
      }
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Auto-fetch models when connection test succeeds (unless bypass mode is enabled)
  useEffect(() => {
    if (chatOptions.apiUrl && testResult?.success && !chatOptions.bypassModelsCheck) {
      fetchModels(false); // Don't show toast on auto-fetch
    }
  }, [testResult?.success, chatOptions.bypassModelsCheck]);

  const testConnection = async () => {
    if (!chatOptions.apiUrl) {
      toast.error("Please enter an API URL");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    // If bypass mode is enabled, test the chat completion endpoint instead
    if (chatOptions.bypassModelsCheck) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        // Test with a simple completion request
        const response = await fetch(`${chatOptions.apiUrl}/v1/chat/completions`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(chatOptions.apiKey ? { Authorization: `Bearer ${chatOptions.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: chatOptions.selectedModel || 'test',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1,
            stream: false,
          }),
        });

        clearTimeout(timeoutId);

        // For bypass mode, we consider any response (even errors) as a successful connection
        // as long as the server responds
        if (response.status === 404) {
          setTestResult({
            success: false,
            message: "Chat completions endpoint not found",
          });
          toast.error("Chat completions endpoint not found");
        } else if (response.status === 401 || response.status === 403) {
          setTestResult({
            success: true,
            message: "Connected! (Authentication may be required)",
          });
          toast.success("Connection successful!");
        } else if (response.status >= 200 && response.status < 500) {
          // Any client or success response means the server is reachable
          setTestResult({
            success: true,
            message: "Connected to chat completions endpoint!",
          });
          toast.success("Connection successful!");
        } else {
          setTestResult({
            success: false,
            message: `Server error: HTTP ${response.status}`,
          });
          toast.error(`Server error: HTTP ${response.status}`);
        }
      } catch (error: any) {
        let message = "Connection failed: ";
        if (error.name === "AbortError") {
          message += "Request timeout (5s)";
        } else if (error.message?.includes("Failed to fetch")) {
          message += "Could not reach server. Check if it's running.";
        } else {
          message += error.message || "Unknown error";
        }
        setTestResult({ success: false, message });
        toast.error(message);
      } finally {
        setIsTesting(false);
      }
      return;
    }

    // Original models endpoint test for non-bypass mode
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${chatOptions.apiUrl}/v1/models`, {
        signal: controller.signal,
        headers: chatOptions.apiKey
          ? { Authorization: `Bearer ${chatOptions.apiKey}` }
          : {},
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const modelCount = data.data?.length || 0;
        setTestResult({
          success: true,
          message: `Connected successfully! Found ${modelCount} model${
            modelCount !== 1 ? "s" : ""
          }`,
        });
        toast.success("Connection successful!");
        // Models will be fetched automatically via useEffect
      } else if (response.status === 404) {
        // Some APIs might not have a /models endpoint
        setTestResult({
          success: true,
          message: "Connected! (Models endpoint not found, but server responded)",
        });
        toast.success("Connection successful!");
      } else {
        setTestResult({
          success: false,
          message: `Connection failed: HTTP ${response.status}`,
        });
        toast.error(`Connection failed: HTTP ${response.status}`);
      }
    } catch (error: any) {
      let message = "Connection failed: ";
      if (error.name === "AbortError") {
        message += "Request timeout (5s)";
      } else if (error.message?.includes("Failed to fetch")) {
        message += "Could not reach server. Check if it's running.";
      } else {
        message += error.message || "Unknown error";
      }
      setTestResult({ success: false, message });
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="api-settings">
        <AccordionTrigger className="text-sm font-medium">
          API Configuration
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 pt-2">
            {/* API URL */}
            <div className="space-y-2">
              <Label htmlFor="api-url" className="text-xs">
                API URL
              </Label>
              <Input
                id="api-url"
                type="url"
                placeholder="http://localhost:8000"
                value={chatOptions.apiUrl || ""}
                onChange={handleApiUrlChange}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                vLLM or OpenAI-compatible API endpoint (without /v1)
              </p>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-xs">
                API Key (Optional)
              </Label>
              <Input
                id="api-key"
                type="password"
                placeholder="sk-..."
                value={chatOptions.apiKey || ""}
                onChange={handleApiKeyChange}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Only if your API requires authentication
              </p>
            </div>

            {/* Test Connection Button */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={isTesting || !chatOptions.apiUrl}
                className="flex items-center gap-2"
              >
                {isTesting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <TestTube2 className="h-3 w-3" />
                )}
                Test Connection
              </Button>
              {testResult && (
                <span
                  className={`text-xs ${
                    testResult.success ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {testResult.success ? "✓" : "✗"} {testResult.message}
                </span>
              )}
            </div>

            {/* Bypass Models Check Option */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="bypass-models-check"
                  checked={chatOptions.bypassModelsCheck || false}
                  onChange={handleBypassModelsCheckChange}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                />
                <Label htmlFor="bypass-models-check" className="text-xs font-normal cursor-pointer">
                  Bypass models endpoint check (manual model entry)
                </Label>
              </div>
              {chatOptions.bypassModelsCheck && (
                <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                  <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Bypass mode enabled. Enter model name manually. The models endpoint will not be checked.
                  </p>
                </div>
              )}
            </div>

            {/* Model Selection - Different UI based on bypass mode */}
            {chatOptions.bypassModelsCheck ? (
              // Manual model entry when bypass is enabled
              <div className="space-y-2">
                <Label htmlFor="manual-model" className="text-xs">
                  Model Name (Manual Entry)
                </Label>
                <Input
                  id="manual-model"
                  type="text"
                  placeholder="e.g., gpt-3.5-turbo, llama-2-7b"
                  value={chatOptions.selectedModel || ""}
                  onChange={handleManualModelChange}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the exact model name your API expects
                </p>
              </div>
            ) : (
              // Original model selection dropdown when bypass is disabled
              (models.length > 0 || isLoadingModels || modelsError) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="model-select" className="text-xs">
                      Model Selection
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchModels(true)}
                      disabled={isLoadingModels || !chatOptions.apiUrl}
                      className="h-6 px-2"
                    >
                      <RefreshCw className={`h-3 w-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  
                  {isLoadingModels ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading models...
                    </div>
                  ) : modelsError ? (
                    <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                      <p className="text-xs text-red-600 dark:text-red-400">{modelsError}</p>
                    </div>
                  ) : models.length > 0 ? (
                    <>
                      <Select value={chatOptions.selectedModel || ""} onValueChange={handleModelChange}>
                        <SelectTrigger className="w-full text-sm">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((model) => (
                            <SelectItem key={model.id} value={model.id} className="text-sm">
                              <div className="flex flex-col">
                                <span>{model.id}</span>
                                {model.owned_by && (
                                  <span className="text-xs text-muted-foreground">
                                    by {model.owned_by}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {chatOptions.selectedModel && (
                        <p className="text-xs text-muted-foreground">
                          Current: {chatOptions.selectedModel}
                        </p>
                      )}
                    </>
                  ) : null}
                </div>
              )
            )}

            {/* Advanced Settings */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-xs font-medium">Generation Settings</h4>
              
              {/* Max Tokens */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="max-tokens" className="text-xs">
                    Max Tokens
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {chatOptions.maxTokens || 4096}
                  </span>
                </div>
                <Input
                  id="max-tokens"
                  type="number"
                  min="1"
                  max="100000"
                  value={chatOptions.maxTokens || 4096}
                  onChange={handleMaxTokensChange}
                  className="text-sm"
                  disabled={chatOptions.omitMaxTokens}
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="omit-max-tokens"
                    checked={chatOptions.omitMaxTokens || false}
                    onChange={handleOmitMaxTokensChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <Label htmlFor="omit-max-tokens" className="text-xs font-normal cursor-pointer">
                    Omit max_tokens parameter (for newer models)
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {chatOptions.omitMaxTokens 
                    ? "Max tokens parameter will not be sent to the API" 
                    : "Maximum number of tokens to generate"}
                </p>
              </div>

              {/* Top P */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="top-p" className="text-xs">
                    Top P
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {(chatOptions.topP || 0.95).toFixed(2)}
                  </span>
                </div>
                <input
                  id="top-p"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={chatOptions.topP || 0.95}
                  onChange={handleTopPChange}
                  className="w-full h-1 bg-gray-200 rounded-sm appearance-none cursor-pointer range-sm dark:bg-gray-700"
                  disabled={chatOptions.omitTopP}
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="omit-top-p"
                    checked={chatOptions.omitTopP || false}
                    onChange={handleOmitTopPChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <Label htmlFor="omit-top-p" className="text-xs font-normal cursor-pointer">
                    Omit top_p parameter
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {chatOptions.omitTopP 
                    ? "Top P parameter will not be sent to the API" 
                    : "Nucleus sampling (0.0 to 1.0)"}
                </p>
              </div>
            </div>

            {/* Warning if not configured */}
            {!chatOptions.apiUrl && (
              <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  API URL is required for chat functionality
                </p>
              </div>
            )}
            {chatOptions.apiUrl && !chatOptions.selectedModel && (
              <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  {chatOptions.bypassModelsCheck 
                    ? "Please enter a model name to use for chat"
                    : "Please select a model or test connection to fetch available models"}
                </p>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
