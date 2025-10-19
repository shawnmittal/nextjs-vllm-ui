import {
  streamText,
  CoreMessage,
  CoreUserMessage,
  CoreSystemMessage,
  CoreAssistantMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";

import { encodeChat } from "@/lib/token-counter";

const addSystemMessage = (messages: CoreMessage[], systemPrompt?: string) => {
  // early exit if system prompt is empty
  if (!systemPrompt || systemPrompt === "") {
    return messages;
  }

  // add system prompt to the chat (if it's not already there)
  // check first message in the chat
  if (!messages) {
    // if there are no messages, add the system prompt as the first message
    messages = [
      {
        content: systemPrompt,
        role: "system",
      },
    ];
  } else if (messages.length === 0) {
    // if there are no messages, add the system prompt as the first message
    messages.push({
      content: systemPrompt,
      role: "system",
    });
  } else {
    // if there are messages, check if the first message is a system prompt
    if (messages[0].role === "system") {
      // if the first message is a system prompt, update it
      messages[0].content = systemPrompt;
    } else {
      // if the first message is not a system prompt, add the system prompt as the first message
      messages.unshift({
        content: systemPrompt,
        role: "system",
      });
    }
  }
  return messages;
};

const formatMessages = (
  messages: CoreMessage[],
  tokenLimit: number = 4096
): CoreMessage[] => {
  let mappedMessages: CoreMessage[] = [];
  let messagesTokenCounts: number[] = [];
  const reservedResponseTokens = 512;

  const tokenLimitRemaining = tokenLimit - reservedResponseTokens;
  let tokenCount = 0;

  messages.forEach((m) => {
    if (m.role === "system") {
      mappedMessages.push({
        role: "system",
        content: m.content,
      } as CoreSystemMessage);
    } else if (m.role === "user") {
      mappedMessages.push({
        role: "user",
        content: m.content,
      } as CoreUserMessage);
    } else if (m.role === "assistant") {
      mappedMessages.push({
        role: "assistant",
        content: m.content,
      } as CoreAssistantMessage);
    } else {
      return;
    }

    // ignore typing
    // tslint:disable-next-line
    const messageTokens = encodeChat([m]);
    messagesTokenCounts.push(messageTokens);
    tokenCount += messageTokens;
  });

  if (tokenCount <= tokenLimitRemaining) {
    return mappedMessages;
  }

  // remove the middle messages until the token count is below the limit
  while (tokenCount > tokenLimitRemaining) {
    const middleMessageIndex = Math.floor(messages.length / 2);
    const middleMessageTokens = messagesTokenCounts[middleMessageIndex];
    mappedMessages.splice(middleMessageIndex, 1);
    messagesTokenCounts.splice(middleMessageIndex, 1);
    tokenCount -= middleMessageTokens;
  }
  return mappedMessages;
};

export async function POST(req: Request) {
  // export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { messages, chatOptions } = await req.json();
    
    // Extract API configuration from chatOptions or use env vars as fallback
    const apiUrl = chatOptions?.apiUrl || process.env.VLLM_URL;
    const apiKey = chatOptions?.apiKey || process.env.VLLM_API_KEY;
    const maxTokens = chatOptions?.maxTokens || 
                      (process.env.VLLM_TOKEN_LIMIT ? parseInt(process.env.VLLM_TOKEN_LIMIT) : 4096);
    
    // Validate configuration
    if (!apiUrl) {
      return NextResponse.json(
        { 
          error: "API URL not configured. Please set it in settings.", 
          code: "API_NOT_CONFIGURED" 
        },
        { status: 503 }
      );
    }
    
    if (!chatOptions.selectedModel || chatOptions.selectedModel === "") {
      return NextResponse.json(
        { 
          error: "No model selected. Please wait for connection or check settings.", 
          code: "NO_MODEL_SELECTED" 
        },
        { status: 400 }
      );
    }

    const formattedMessages = formatMessages(
      addSystemMessage(messages, chatOptions.systemPrompt),
      maxTokens
    );

    try {
      // Create OpenAI client with dynamic configuration
      const customOpenai = createOpenAI({
        baseUrl: apiUrl + "/v1",
        apiKey: apiKey ?? "",
      });

      const result = await streamText({
        model: customOpenai(chatOptions.selectedModel),
        messages: formattedMessages,
        temperature: chatOptions.temperature ?? 0.9,
        topP: chatOptions.topP ?? 0.95,
        maxTokens: maxTokens,
      });

      // Respond with the stream
      return result.toAIStreamResponse();
      
    } catch (apiError: any) {
      console.error("vLLM API error:", apiError);
      
      // Handle specific error types
      if (apiError.message?.includes("Failed to fetch") || 
          apiError.message?.includes("ECONNREFUSED")) {
        return NextResponse.json(
          { 
            error: "Cannot connect to API server. Please check your settings.", 
            code: "CONNECTION_FAILED" 
          },
          { status: 503 }
        );
      }
      
      if (apiError.status === 401) {
        return NextResponse.json(
          { 
            error: "Authentication failed. Please check your API key.", 
            code: "AUTH_FAILED" 
          },
          { status: 401 }
        );
      }
      
      throw apiError;
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
