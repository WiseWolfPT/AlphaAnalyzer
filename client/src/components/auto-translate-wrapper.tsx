import { useAutoTranslate } from '@/lib/auto-translate';
import { useTranslation } from 'react-i18next';

/**
 * Componente que traduz automaticamente o conteúdo filho se for inglês
 *
 * Uso:
 * <AutoTranslate>Search Stocks</AutoTranslate>
 * → Renderiza "Pesquisar Ações" automaticamente
 */
interface AutoTranslateProps {
  children: string;
  disabled?: boolean;
}

export function AutoTranslate({ children, disabled = false }: AutoTranslateProps) {
  const { i18n } = useTranslation();
  const translated = useAutoTranslate(children);

  // Se idioma for EN ou tradutor desativado, mostra original
  if (disabled || i18n.language === 'en') {
    return <>{children}</>;
  }

  // Se idioma for PT, mostra tradução automática
  return <>{translated}</>;
}

/**
 * HOC para componentes de texto que precisam de tradução automática
 */
export function withAutoTranslate<P extends { children?: React.ReactNode }>(
  Component: React.ComponentType<P>
) {
  return function AutoTranslatedComponent(props: P) {
    const { children, ...rest } = props;

    // Se children é string, traduz
    if (typeof children === 'string') {
      return (
        <Component {...(rest as P)}>
          <AutoTranslate>{children}</AutoTranslate>
        </Component>
      );
    }

    // Caso contrário, renderiza normalmente
    return <Component {...props} />;
  };
}
