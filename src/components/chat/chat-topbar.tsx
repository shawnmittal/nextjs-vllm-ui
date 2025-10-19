"use client";

import React, { useEffect } from "react";

import {
  CheckCircledIcon,
  CrossCircledIcon,
  DotFilledIcon,
  HamburgerMenuIcon,
  InfoCircledIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { Message } from "ai/react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { encodeChat, getTokenLimit } from "@/lib/token-counter";
import { basePath, useHasMounted } from "@/lib/utils";
import { Sidebar } from "../sidebar";
import { ChatOptions } from "./chat-options";

interface ChatTopbarProps {
  chatOptions: ChatOptions;
  setChatOptions: React.Dispatch<React.SetStateAction<ChatOptions>>;
  isLoading: boolean;
  chatId?: string;
  setChatId: React.Dispatch<React.SetStateAction<string>>;
  messages: Message[];
}

export default function ChatTopbar({
  chatOptions,
  setChatOptions,
  isLoading,
  chatId,
  setChatId,
  messages,
}: ChatTopbarProps) {
  const hasMounted = useHasMounted();

  const currentModel = chatOptions && chatOptions.selectedModel;
  const [tokenLimit, setTokenLimit] = React.useState<number>(4096);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [connectionStatus, setConnectionStatus] = React.useState<
    "checking" | "connected" | "failed" | "not-configured"
  >("checking");

  const fetchData = async () => {
    if (!hasMounted) {
      return null;
    }

    // Check if API is configured
    if (!chatOptions.apiUrl) {
      setConnectionStatus("not-configured");
      // Don't try to fetch models if no API URL is configured
      return;
    }

    try {
      setConnectionStatus("checking");
      
      // Pass API configuration to the models endpoint
      const res = await fetch(basePath + "/api/models", {
        method: "POST", // Change to POST to send config
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiUrl: chatOptions.apiUrl,
          apiKey: chatOptions.apiKey,
        }),
      });

      if (!res.ok) {
        const errorResponse = await res.json().catch(() => ({ error: "Unknown error" }));
        const errorMessage = `Connection to vLLM server failed: ${errorResponse.error} [${res.status} ${res.statusText}]`;
        setError(errorMessage);
        setConnectionStatus("failed");
        
        // Only show toast if it's a new error (not on every re-render)
        if (connectionStatus !== "failed") {
          toast.error(errorMessage);
        }
        
        setChatOptions({ ...chatOptions, selectedModel: undefined });
        return;
      }

      const data = await res.json();
      // Extract the "name" field from each model object and store them in the state
      const modelNames = data.data.map((model: any) => model.id);
      
      if (modelNames.length > 0) {
        setConnectionStatus("connected");
        setError(undefined);
        
        // Only update selectedModel if it's not already set
        if (!chatOptions.selectedModel || !modelNames.includes(chatOptions.selectedModel)) {
          setChatOptions({ ...chatOptions, selectedModel: modelNames[0] });
        }
      } else {
        setConnectionStatus("failed");
        setError("No models available");
        setChatOptions({ ...chatOptions, selectedModel: undefined });
      }
    } catch (error: any) {
      setConnectionStatus("failed");
      const errorMsg = error?.message || "Failed to fetch models";
      setError(errorMsg);
      setChatOptions({ ...chatOptions, selectedModel: undefined });
      
      // Only show toast for unexpected errors
      if (!errorMsg.includes("not configured")) {
        toast.error(errorMsg);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [hasMounted, chatOptions.apiUrl, chatOptions.apiKey]); // Re-fetch when API settings change

  useEffect(() => {
    // Get token limit from chatOptions or fetch from API
    if (chatOptions.maxTokens) {
      setTokenLimit(chatOptions.maxTokens);
    } else {
      getTokenLimit(basePath).then((limit) => setTokenLimit(limit));
    }
  }, [hasMounted, chatOptions.maxTokens]);

  if (!hasMounted) {
    return (
      <div className="md:w-full flex px-4 py-6 items-center gap-1 md:justify-center">
        <DotFilledIcon className="w-4 h-4 text-blue-500" />
        <span className="text-xs">Booting up..</span>
      </div>
    );
  }

  const chatTokens = messages.length > 0 ? encodeChat(messages) : 0;

  // Render connection status indicators
  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case "checking":
        return (
          <>
            <DotFilledIcon className="w-4 h-4 text-blue-500" />
            <span className="text-xs">Connecting...</span>
          </>
        );
      case "not-configured":
        return (
          <>
            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
            <span className="text-xs">API not configured</span>
          </>
        );
      case "connected":
        if (currentModel) {
          return (
            <>
              {isLoading ? (
                <DotFilledIcon className="w-4 h-4 text-blue-500" />
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="cursor-help">
                        <CheckCircledIcon className="w-4 h-4 text-green-500" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      sideOffset={4}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2 rounded-sm text-xs"
                    >
                      <p className="font-bold">Current Model</p>
                      <p className="text-gray-500">{currentModel}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <span className="text-xs">
                {isLoading ? "Generating.." : "Ready"}
              </span>
            </>
          );
        }
        return null;
      case "failed":
        return (
          <>
            <CrossCircledIcon className="w-4 h-4 text-red-500" />
            <span className="text-xs">Connection failed</span>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="md:w-full flex px-4 py-4 items-center justify-between md:justify-center">
      <Sheet>
        <SheetTrigger>
          <div className="flex items-center gap-2">
            <HamburgerMenuIcon className="md:hidden w-5 h-5" />
          </div>
        </SheetTrigger>
        <SheetContent side="left">
          <div>
            <Sidebar
              chatId={chatId || ""}
              setChatId={setChatId}
              isCollapsed={false}
              isMobile={false}
              chatOptions={chatOptions}
              setChatOptions={setChatOptions}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex justify-center md:justify-between gap-4 w-full">
        <div className="gap-1 flex items-center">
          {renderConnectionStatus()}
        </div>
        <div className="flex items-end gap-2">
          {chatTokens > tokenLimit && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <span>
                    <InfoCircledIcon className="w-4 h-4 text-blue-500" />
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  sideOffset={4}
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-sm text-xs"
                >
                  <p className="text-gray-500">
                    Token limit exceeded. Truncating middle messages.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {messages.length > 0 && (
            <span className="text-xs text-gray-500">
              {chatTokens} / {tokenLimit} token{chatTokens > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
