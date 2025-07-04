import axios from 'axios';

interface TokenCountRequest {
  model: string;
  messages: Message[];
  system?: string;
  tools?: Tool[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string | Content[];
}

interface Content {
  type: 'text' | 'image' | 'document';
  text?: string;
  source?: {
    type: string;
    media_type?: string;
    data?: string;
  };
}

interface Tool {
  name: string;
  description: string;
  input_schema: object;
}

interface TokenCountResponse {
  input_tokens: number;
}

export class AnthropicService {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ Anthropic API key not configured');
    }
  }

  async countTokens(request: TokenCountRequest): Promise<TokenCountResponse> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/messages/count_tokens`,
        request,
        {
          headers: {
            'anthropic-version': '2023-06-01',
            'x-api-key': this.apiKey,
            'content-type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Anthropic API error:', error.response?.data);
        throw new Error(
          `Token counting failed: ${error.response?.data?.error?.message || error.message}`
        );
      }
      throw error;
    }
  }

  async countTextTokens(text: string, model: string = 'claude-3-opus-20240229'): Promise<number> {
    const request: TokenCountRequest = {
      model,
      messages: [
        {
          role: 'user',
          content: text,
        },
      ],
    };

    const response = await this.countTokens(request);
    return response.input_tokens;
  }

  async countMessagesTokens(
    messages: Message[],
    model: string = 'claude-3-opus-20240229',
    system?: string
  ): Promise<number> {
    const request: TokenCountRequest = {
      model,
      messages,
      system,
    };

    const response = await this.countTokens(request);
    return response.input_tokens;
  }

  estimateTokens(text: string): number {
    const words = text.split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }

  async generateTranscriptSummary(
    transcript: string,
    ticker: string,
    quarter: string,
    year: number
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const prompt = `Analyze this earnings call transcript for ${ticker} (Q${quarter} ${year}) and provide a comprehensive summary with the following sections:

1. **Key Highlights** (3-5 bullet points)
2. **Financial Performance**
3. **Business Updates**
4. **Guidance & Outlook**
5. **Management Commentary**
6. **Risks & Concerns**
7. **Analyst Q&A Highlights**

Keep the summary concise but informative, focusing on material information for investors.

Transcript:
${transcript}`;

    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: 'claude-3-opus-20240229',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 2000,
        },
        {
          headers: {
            'anthropic-version': '2023-06-01',
            'x-api-key': this.apiKey,
            'content-type': 'application/json',
          },
        }
      );

      return response.data.content[0].text;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Anthropic API error:', error.response?.data);
        throw new Error(
          `Summary generation failed: ${error.response?.data?.error?.message || error.message}`
        );
      }
      throw error;
    }
  }
}

export const anthropicService = new AnthropicService();