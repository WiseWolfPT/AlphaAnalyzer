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

  async chatWithStockAssistant(
    message: string,
    context?: {
      symbol?: string;
      conversation?: Array<{ role: 'user' | 'assistant'; content: string }>;
    }
  ): Promise<{ content: string; outputTokens?: number }> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Detect language from message content
    const isPortuguese = /[àáâãäçéêëíïóôõöúüñ]/.test(message.toLowerCase()) ||
                        /(o que|como|quando|onde|por que|qual|quais|você|voce|análise|ação|ações|mercado|bolsa|investimento)/i.test(message);

    // Build system prompt for stock assistant
    let systemPrompt = isPortuguese ? 
    `Você é um Assistente de IA especialista em ações para a Alfalyzer, uma plataforma de análise financeira. Seu papel é ajudar os usuários com:

1. **Análise de Ações**: Forneça insights sobre fundamentos da empresa, análise técnica e tendências do mercado
2. **Estratégia de Investimento**: Ofereça orientação sobre gestão de portfólio, avaliação de risco e decisões de investimento
3. **Educação de Mercado**: Explique conceitos financeiros, mecânicas do mercado e princípios de investimento
4. **Avaliação**: Ajude com cálculos de valor intrínseco, modelos DCF e análise comparativa

Diretrizes:
- Seja útil, preciso e educativo
- Sempre inclua isenções de responsabilidade apropriadas sobre não ser aconselhamento financeiro
- Use linguagem clara e acessível mantendo precisão profissional
- Incentive os usuários a fazer suas próprias pesquisas e consultar profissionais
- Foque em conteúdo educativo em vez de recomendações específicas de compra/venda
- Ao discutir ações específicas, forneça análise equilibrada incluindo riscos

Contexto Atual:
- Plataforma: Alfalyzer - Plataforma de Análise Financeira
- Interface do Usuário: Dashboard web com dados em tempo real
- Ferramentas Disponíveis: Rastreador de ações, listas de observação, gráficos, análise fundamental` :
    `You are an expert AI Stock Assistant for Alfalyzer, a financial analysis platform. Your role is to help users with:

1. **Stock Analysis**: Provide insights on company fundamentals, technical analysis, and market trends
2. **Investment Strategy**: Offer guidance on portfolio management, risk assessment, and investment decisions
3. **Market Education**: Explain financial concepts, market mechanics, and investment principles
4. **Valuation**: Help with intrinsic value calculations, DCF models, and comparative analysis

Guidelines:
- Be helpful, accurate, and educational
- Always include appropriate disclaimers about not being financial advice
- Use clear, accessible language while maintaining professional accuracy
- Encourage users to do their own research and consult professionals
- Focus on educational content rather than specific buy/sell recommendations
- When discussing specific stocks, provide balanced analysis including risks

Current Context:
- Platform: Alfalyzer Financial Analysis Platform
- User Interface: Web-based dashboard with real-time data
- Available Tools: Stock screener, watchlists, charts, fundamental analysis`;

    if (context?.symbol) {
      systemPrompt += `\n- Currently viewing: ${context.symbol} stock page`;
    }

    // Build message history
    const messages: Message[] = [];
    
    // Add conversation history if provided
    if (context?.conversation && context.conversation.length > 0) {
      // Only include last 10 messages to avoid token limits
      const recentHistory = context.conversation.slice(-10);
      messages.push(...recentHistory);
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message,
    });

    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: 'claude-3-sonnet-20240229', // Use Sonnet for faster responses
          system: systemPrompt,
          messages,
          max_tokens: 1000,
          temperature: 0.7, // Slightly creative but still focused
        },
        {
          headers: {
            'anthropic-version': '2023-06-01',
            'x-api-key': this.apiKey,
            'content-type': 'application/json',
          },
        }
      );

      return {
        content: response.data.content[0].text,
        outputTokens: response.data.usage?.output_tokens,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Anthropic API error:', error.response?.data);
        throw new Error(
          `Chat failed: ${error.response?.data?.error?.message || error.message}`
        );
      }
      throw error;
    }
  }
}

export const anthropicService = new AnthropicService();