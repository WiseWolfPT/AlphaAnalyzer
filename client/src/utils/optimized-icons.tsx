// Sistema de ícones otimizado para reduzir bundle size
// Importando apenas os ícones mais utilizados do lucide-react
import React from 'react';

// Top 20 ícones mais usados (baseado na análise)
export {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Activity,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  X,
  Plus,
  Star,
  Eye,
  Calendar,
  Zap,
  Info,
  DollarSign,
  ChevronRight,
  Check,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Clock,
  
  // Ícones essenciais de UI
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ArrowLeft,
  Menu,
  Settings,
  User,
  Home,
  Search,
  Bell,
  
  // Ícones de navegação
  Download,
  Upload,
  Share2,
  Copy,
  Edit,
  Trash2,
  Save,
  FileText,
  
  // Ícones de status
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Lock,
  Unlock,
  
  // Ícones específicos do domínio financeiro
  LineChart,
  PieChart,
  BarChart,
  TrendingUp as Growth,
  CreditCard,
  Banknote,
  Calculator,
  Percent,
  
  // Ícones de loading e estado
  Loader2,
  Spinner,
  
  // Ícones de mídia
  Play,
  Pause,
  Stop,
  
  // Ícones de comunicação
  Mail,
  Phone,
  MessageSquare,
  
  // Ícones básicos sempre necessários
  MoreHorizontal,
  MoreVertical,
  Dot,
  Circle,
  Square,
  
} from 'lucide-react';

// Ícones raramente usados - importação sob demanda
export const importRareIcon = async (iconName: string) => {
  const iconModule = await import('lucide-react');
  return iconModule[iconName as keyof typeof iconModule];
};

// Helper para ícones condicionais
export const ConditionalIcon = ({ 
  name, 
  fallback = Activity, 
  ...props 
}: { 
  name: string; 
  fallback?: any; 
  [key: string]: any; 
}) => {
  const iconMap: Record<string, any> = {
    'trending-up': TrendingUp,
    'trending-down': TrendingDown,
    'target': Target,
    'bar-chart-3': BarChart3,
    'activity': Activity,
    'refresh-cw': RefreshCw,
    'external-link': ExternalLink,
    'alert-circle': AlertCircle,
    'x': X,
    'plus': Plus,
    'star': Star,
    'eye': Eye,
    'calendar': Calendar,
    'zap': Zap,
    'info': Info,
    'dollar-sign': DollarSign,
    'chevron-right': ChevronRight,
    'check': Check,
    'arrow-right': ArrowRight,
    'clock': Clock,
  };
  
  const IconComponent = iconMap[name] || fallback;
  return <IconComponent {...props} />;
};