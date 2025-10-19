"use client";

import React from "react";

import { ChatRequestOptions } from "ai";
import { useChat } from "ai/react";
import { toast } from "sonner";
import useLocalStorageState from "use-local-storage-state";
import { v4 as uuidv4 } from "uuid";

import { ChatLayout } from "@/components/chat/chat-layout";
import { ChatOptions, DEFAULT_CHAT_OPTIONS } from "@/components/chat/chat-options";
import { basePath } from "@/lib/utils";

interface ChatPageProps {
  chatId: string;
  setChatId: React.Dispatch<React.SetStateAction<string>>;
}
export default function ChatPage({ chatId, setChatId }: ChatPageProps) {
  const [chatOptions, setChatOptions] = useLocalStorageState<ChatOptions>(
    "chatOptions",
    {
      defaultValue: DEFAULT_CHAT_OPTIONS,
    }
  );

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    setMessages,
  } = useChat({
    api: basePath + "/api/chat",
    streamMode: "stream-data",
    onError: (error) => {
      // Parse error to provide better user feedback
      let errorMessage = "Something went wrong";
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.code === "NOT_CONFIGURED" || errorData.code === "API_NOT_CONFIGURED") {
          errorMessage = "Please configure API settings first";
        } else if (errorData.code === "NO_MODEL_SELECTED") {
          errorMessage = "Please wait for model to be selected or check your API connection";
        } else {
          errorMessage = errorData.error || error.message;
        }
      } catch {
        errorMessage = error.message || errorMessage;
      }
      toast.error(errorMessage);
    },
  });

  React.useEffect(() => {
    if (chatId) {
      const item = localStorage.getItem(`chat_${chatId}`);
      if (item) {
        setMessages(JSON.parse(item));
      }
    } else {
      setMessages([]);
    }
  }, [setMessages, chatId]);

  React.useEffect(() => {
    if (!isLoading && !error && chatId && messages.length > 0) {
      // Save messages to local storage
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(messages));
      // Trigger the storage event to update the sidebar component
      window.dispatchEvent(new Event("storage"));
    }
  }, [messages, chatId, isLoading, error]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check if API is configured before sending
    if (!chatOptions.apiUrl) {
      toast.error("Please configure the API URL in settings before sending messages");
      return;
    }

    // Check if model is selected
    if (!chatOptions.selectedModel) {
      toast.error("Please wait for model to be selected or check your API connection");
      return;
    }

    if (messages.length === 0) {
      // Generate a random id for the chat
      const id = uuidv4();
      setChatId(id);
    }

    setMessages([...messages]);

    // Prepare the options object with additional body data, including API configuration
    const requestOptions: ChatRequestOptions = {
      options: {
        body: {
          chatOptions: {
            ...chatOptions,
            // Ensure API configuration is included
            apiUrl: chatOptions.apiUrl,
            apiKey: chatOptions.apiKey,
            maxTokens: chatOptions.maxTokens,
            topP: chatOptions.topP,
          },
        },
      },
    };

    // Call the handleSubmit function with the options
    handleSubmit(e, requestOptions);
  };

  return (
    <main className="flex h-[calc(100dvh)] flex-col items-center ">
      <ChatLayout
        chatId={chatId}
        setChatId={setChatId}
        chatOptions={chatOptions}
        setChatOptions={setChatOptions}
        messages={messages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={onSubmit}
        isLoading={isLoading}
        error={error}
        stop={stop}
        navCollapsedSize={10}
        defaultLayout={[30, 160]}
      />
    </main>
  );
}
