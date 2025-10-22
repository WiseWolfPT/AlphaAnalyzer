/**
 * Auto-Translator - Tradução automática EN→PT-PT em runtime
 *
 * Usa DeepL API para traduzir texto automaticamente
 * Cache local para evitar chamadas repetidas
 * Fallback para texto original se API falhar
 */

interface TranslationCache {
  [key: string]: string;
}

class AutoTranslator {
  private cache: TranslationCache = {};
  private pendingTranslations = new Map<string, Promise<string>>();
  private apiKey: string | null = null;
  private enabled = false;

  constructor() {
    // Carregar cache do localStorage
    this.loadCache();

    // DeepL API key (free tier: 500,000 chars/month)
    // Obter de variável de ambiente
    this.apiKey = import.meta.env.VITE_DEEPL_API_KEY || null;

    // Ativar apenas se tiver API key
    this.enabled = !!this.apiKey;
  }

  private loadCache() {
    try {
      const cached = localStorage.getItem('auto-translate-cache');
      if (cached) {
        this.cache = JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to load translation cache:', e);
    }
  }

  private saveCache() {
    try {
      localStorage.setItem('auto-translate-cache', JSON.stringify(this.cache));
    } catch (e) {
      console.warn('Failed to save translation cache:', e);
    }
  }

  /**
   * Deteta se texto é inglês (heurística simples)
   */
  private isEnglish(text: string): boolean {
    // Palavras comuns em inglês que não existem em português
    const englishWords = ['the', 'and', 'for', 'with', 'are', 'this', 'that', 'from'];
    const lowerText = text.toLowerCase();

    // Se contém pelo menos 1 palavra inglesa comum, assume que é inglês
    return englishWords.some(word =>
      lowerText.includes(` ${word} `) ||
      lowerText.startsWith(`${word} `) ||
      lowerText.endsWith(` ${word}`)
    );
  }

  /**
   * Traduz texto usando DeepL API
   */
  private async translateWithDeepL(text: string): Promise<string> {
    if (!this.apiKey) {
      return text; // Fallback para original
    }

    try {
      const response = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          auth_key: this.apiKey,
          text: text,
          source_lang: 'EN',
          target_lang: 'PT', // Português (DeepL usa PT para PT-PT)
          formality: 'default',
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepL API error: ${response.status}`);
      }

      const data = await response.json();
      return data.translations[0]?.text || text;
    } catch (error) {
      console.warn('Translation failed, using original text:', error);
      return text;
    }
  }

  /**
   * Traduz texto automaticamente (com cache)
   */
  async translate(text: string): Promise<string> {
    // Se desativado ou texto vazio, retorna original
    if (!this.enabled || !text || text.trim().length === 0) {
      return text;
    }

    // Se não é inglês, retorna original
    if (!this.isEnglish(text)) {
      return text;
    }

    // Cache hit
    const cacheKey = text.toLowerCase().trim();
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    // Se já está a traduzir este texto, reutiliza a promise
    if (this.pendingTranslations.has(cacheKey)) {
      return this.pendingTranslations.get(cacheKey)!;
    }

    // Nova tradução
    const translationPromise = this.translateWithDeepL(text).then(translated => {
      this.cache[cacheKey] = translated;
      this.saveCache();
      this.pendingTranslations.delete(cacheKey);
      return translated;
    });

    this.pendingTranslations.set(cacheKey, translationPromise);
    return translationPromise;
  }

  /**
   * Traduz de forma síncrona (retorna cache ou original)
   * Dispara tradução assíncrona em background
   */
  translateSync(text: string): string {
    if (!this.enabled || !text || !this.isEnglish(text)) {
      return text;
    }

    const cacheKey = text.toLowerCase().trim();

    // Retorna cache se existir
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    // Dispara tradução em background (não bloqueia)
    this.translate(text).catch(console.warn);

    // Retorna original enquanto traduz
    return text;
  }

  /**
   * Limpa cache de traduções
   */
  clearCache() {
    this.cache = {};
    localStorage.removeItem('auto-translate-cache');
  }

  /**
   * Verifica se tradutor está ativo
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Instância singleton
export const autoTranslator = new AutoTranslator();

// Hook React para usar tradutor
export function useAutoTranslate(text: string): string {
  const [translated, setTranslated] = React.useState(
    autoTranslator.translateSync(text)
  );

  React.useEffect(() => {
    let cancelled = false;

    autoTranslator.translate(text).then(result => {
      if (!cancelled) {
        setTranslated(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [text]);

  return translated;
}
