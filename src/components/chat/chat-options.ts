export interface ChatOptions {
  selectedModel?: string;
  systemPrompt?: string;
  temperature?: number;
  // API Configuration
  apiUrl?: string;
  apiKey?: string;
  maxTokens?: number;
  topP?: number;
  omitMaxTokens?: boolean; // Option to exclude maxTokens from API request
  omitTopP?: boolean; // Option to exclude topP from API request
}

// Default values with environment variable fallbacks
export const DEFAULT_CHAT_OPTIONS: ChatOptions = {
  selectedModel: '',
  systemPrompt: '',
  temperature: 0.9,
  apiUrl: '',
  apiKey: '',
  maxTokens: 4096,
  topP: 0.95,
  omitMaxTokens: false, // Include maxTokens by default
  omitTopP: false, // Include topP by default
};
