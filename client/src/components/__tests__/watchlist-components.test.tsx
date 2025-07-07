/**
 * ALFALYZER - WATCHLIST COMPONENTS TESTS
 * Testes unitários para componentes de watchlist
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WatchlistCard } from '../watchlist/watchlist-card';
import { WatchlistForm } from '../watchlist/watchlist-form';
import { WatchlistManager } from '../watchlist/watchlist-manager';
import { WatchlistItem } from '../watchlist/watchlist-item';
import { WatchlistQuickAdd } from '../watchlist/watchlist-quick-add';
import '@testing-library/jest-dom';

// Mock dos hooks e serviços
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/services/real-data-integration', () => ({
  realDataService: {
    getQuote: vi.fn(),
    getBatchQuotes: vi.fn(),
  },
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Dados mock para testes
const mockWatchlist = {
  id: 'watchlist-1',
  name: 'Tech Giants',
  description: 'Major technology companies',
  stocks: [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 175.50,
      change: 2.34,
      changePercent: 1.35,
      addedAt: '2024-01-15',
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      price: 142.80,
      change: -1.20,
      changePercent: -0.83,
      addedAt: '2024-01-20',
    },
  ],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-03-15'),
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('WatchlistCard', () => {
  it('deve renderizar informações da watchlist', () => {
    renderWithProviders(
      <WatchlistCard watchlist={mockWatchlist} />
    );

    expect(screen.getByText('Tech Giants')).toBeInTheDocument();
    expect(screen.getByText('Major technology companies')).toBeInTheDocument();
    expect(screen.getByText('2 stocks')).toBeInTheDocument();
  });

  it('deve mostrar preview dos stocks', () => {
    renderWithProviders(
      <WatchlistCard watchlist={mockWatchlist} showPreview />
    );

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('GOOGL')).toBeInTheDocument();
  });

  it('deve navegar para detalhes ao clicar', () => {
    const onClickMock = vi.fn();
    
    renderWithProviders(
      <WatchlistCard watchlist={mockWatchlist} onClick={onClickMock} />
    );

    const card = screen.getByText('Tech Giants').closest('.watchlist-card');
    if (card) fireEvent.click(card);

    expect(onClickMock).toHaveBeenCalledWith(mockWatchlist);
  });

  it('deve chamar onEdit quando botão editar é clicado', () => {
    const onEditMock = vi.fn();
    
    renderWithProviders(
      <WatchlistCard watchlist={mockWatchlist} onEdit={onEditMock} />
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    expect(onEditMock).toHaveBeenCalledWith(mockWatchlist);
  });

  it('deve chamar onDelete quando botão deletar é clicado', async () => {
    const onDeleteMock = vi.fn();
    
    renderWithProviders(
      <WatchlistCard watchlist={mockWatchlist} onDelete={onDeleteMock} />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    // Confirmar no dialog
    const confirmButton = await screen.findByRole('button', { name: /confirm delete/i });
    fireEvent.click(confirmButton);

    expect(onDeleteMock).toHaveBeenCalledWith(mockWatchlist.id);
  });
});

describe('WatchlistForm', () => {
  it('deve renderizar formulário vazio para nova watchlist', () => {
    renderWithProviders(
      <WatchlistForm onSubmit={vi.fn()} />
    );

    expect(screen.getByLabelText(/watchlist name/i)).toHaveValue('');
    expect(screen.getByLabelText(/description/i)).toHaveValue('');
    expect(screen.getByText(/create watchlist/i)).toBeInTheDocument();
  });

  it('deve preencher formulário com dados existentes', () => {
    renderWithProviders(
      <WatchlistForm 
        watchlist={mockWatchlist} 
        onSubmit={vi.fn()} 
      />
    );

    expect(screen.getByLabelText(/watchlist name/i)).toHaveValue('Tech Giants');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Major technology companies');
    expect(screen.getByText(/update watchlist/i)).toBeInTheDocument();
  });

  it('deve validar nome obrigatório', async () => {
    const onSubmitMock = vi.fn();
    
    renderWithProviders(
      <WatchlistForm onSubmit={onSubmitMock} />
    );

    const submitButton = screen.getByRole('button', { name: /create watchlist/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    expect(onSubmitMock).not.toHaveBeenCalled();
  });

  it('deve submeter com dados válidos', async () => {
    const onSubmitMock = vi.fn();
    
    renderWithProviders(
      <WatchlistForm onSubmit={onSubmitMock} />
    );

    fireEvent.change(screen.getByLabelText(/watchlist name/i), {
      target: { value: 'My Watchlist' },
    });
    
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Test description' },
    });

    const submitButton = screen.getByRole('button', { name: /create watchlist/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalledWith({
        name: 'My Watchlist',
        description: 'Test description',
      });
    });
  });

  it('deve cancelar formulário', () => {
    const onCancelMock = vi.fn();
    
    renderWithProviders(
      <WatchlistForm onSubmit={vi.fn()} onCancel={onCancelMock} />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(onCancelMock).toHaveBeenCalled();
  });
});

describe('WatchlistItem', () => {
  const mockStock = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 175.50,
    change: 2.34,
    changePercent: 1.35,
    dayHigh: 176.80,
    dayLow: 173.20,
    volume: 45000000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar informações do stock', () => {
    renderWithProviders(
      <WatchlistItem stock={mockStock} />
    );

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('$175.50')).toBeInTheDocument();
    expect(screen.getByText('+$2.34')).toBeInTheDocument();
    expect(screen.getByText('+1.35%')).toBeInTheDocument();
  });

  it('deve mostrar cor verde para ganhos', () => {
    renderWithProviders(
      <WatchlistItem stock={mockStock} />
    );

    const changeElement = screen.getByText('+1.35%');
    expect(changeElement).toHaveClass('text-green-600');
  });

  it('deve mostrar cor vermelha para perdas', () => {
    const lossStock = {
      ...mockStock,
      change: -2.34,
      changePercent: -1.35,
    };

    renderWithProviders(
      <WatchlistItem stock={lossStock} />
    );

    const changeElement = screen.getByText('-1.35%');
    expect(changeElement).toHaveClass('text-red-600');
  });

  it('deve mostrar detalhes expandidos ao clicar', () => {
    renderWithProviders(
      <WatchlistItem stock={mockStock} expandable />
    );

    const item = screen.getByText('AAPL').closest('.watchlist-item');
    if (item) fireEvent.click(item);

    expect(screen.getByText(/day range/i)).toBeInTheDocument();
    expect(screen.getByText('$173.20 - $176.80')).toBeInTheDocument();
    expect(screen.getByText(/volume/i)).toBeInTheDocument();
  });

  it('deve chamar onRemove quando botão remover é clicado', () => {
    const onRemoveMock = vi.fn();
    
    renderWithProviders(
      <WatchlistItem stock={mockStock} onRemove={onRemoveMock} />
    );

    const removeButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeButton);

    expect(onRemoveMock).toHaveBeenCalledWith('AAPL');
  });

  it('deve navegar para página de detalhes ao clicar no símbolo', () => {
    renderWithProviders(
      <WatchlistItem stock={mockStock} />
    );

    const symbolLink = screen.getByText('AAPL').closest('a');
    expect(symbolLink).toHaveAttribute('href', '/stock/AAPL');
  });
});

describe('WatchlistManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { api } = require('@/lib/api');
    
    vi.mocked(api.get).mockResolvedValue({
      data: [mockWatchlist],
    });
  });

  it('deve carregar e exibir watchlists', async () => {
    renderWithProviders(<WatchlistManager />);

    await waitFor(() => {
      expect(screen.getByText('Tech Giants')).toBeInTheDocument();
    });
  });

  it('deve mostrar estado vazio quando não há watchlists', async () => {
    const { api } = require('@/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] });

    renderWithProviders(<WatchlistManager />);

    await waitFor(() => {
      expect(screen.getByText(/no watchlists yet/i)).toBeInTheDocument();
    });
  });

  it('deve criar nova watchlist', async () => {
    const { api } = require('@/lib/api');
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { id: 'new-watchlist', name: 'New List' },
    });

    renderWithProviders(<WatchlistManager />);

    const createButton = screen.getByRole('button', { name: /create watchlist/i });
    fireEvent.click(createButton);

    // Preencher formulário
    fireEvent.change(screen.getByLabelText(/watchlist name/i), {
      target: { value: 'New List' },
    });

    const submitButton = screen.getByRole('button', { name: /create watchlist/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/watchlists', {
        name: 'New List',
        description: '',
      });
    });
  });

  it('deve deletar watchlist', async () => {
    const { api } = require('@/lib/api');
    vi.mocked(api.delete).mockResolvedValueOnce({});

    renderWithProviders(<WatchlistManager />);

    await waitFor(() => {
      expect(screen.getByText('Tech Giants')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    const confirmButton = await screen.findByRole('button', { name: /confirm delete/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/watchlists/watchlist-1');
    });
  });

  it('deve atualizar preços em tempo real', async () => {
    const { realDataService } = require('@/services/real-data-integration');
    vi.mocked(realDataService.getBatchQuotes).mockResolvedValueOnce({
      AAPL: { price: 180.00, change: 4.50, changePercent: 2.57 },
      GOOGL: { price: 145.00, change: 2.20, changePercent: 1.54 },
    });

    renderWithProviders(<WatchlistManager />);

    await waitFor(() => {
      expect(screen.getByText('Tech Giants')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh prices/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText('$180.00')).toBeInTheDocument();
      expect(screen.getByText('$145.00')).toBeInTheDocument();
    });
  });
});

describe('WatchlistQuickAdd', () => {
  it('deve renderizar botão de adicionar rápido', () => {
    renderWithProviders(
      <WatchlistQuickAdd symbol="AAPL" />
    );

    expect(screen.getByRole('button', { name: /add to watchlist/i })).toBeInTheDocument();
  });

  it('deve mostrar lista de watchlists ao clicar', async () => {
    const { api } = require('@/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [mockWatchlist, { ...mockWatchlist, id: 'watchlist-2', name: 'Favorites' }],
    });

    renderWithProviders(
      <WatchlistQuickAdd symbol="TSLA" />
    );

    const addButton = screen.getByRole('button', { name: /add to watchlist/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Tech Giants')).toBeInTheDocument();
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });
  });

  it('deve adicionar stock à watchlist selecionada', async () => {
    const { api } = require('@/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [mockWatchlist],
    });
    vi.mocked(api.post).mockResolvedValueOnce({});

    renderWithProviders(
      <WatchlistQuickAdd symbol="TSLA" />
    );

    const addButton = screen.getByRole('button', { name: /add to watchlist/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Tech Giants')).toBeInTheDocument();
    });

    const watchlistOption = screen.getByText('Tech Giants');
    fireEvent.click(watchlistOption);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/watchlists/watchlist-1/stocks', {
        symbol: 'TSLA',
      });
    });
  });

  it('deve mostrar feedback de sucesso após adicionar', async () => {
    const { api } = require('@/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce({ data: [mockWatchlist] });
    vi.mocked(api.post).mockResolvedValueOnce({});

    renderWithProviders(
      <WatchlistQuickAdd symbol="TSLA" />
    );

    const addButton = screen.getByRole('button', { name: /add to watchlist/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      const watchlistOption = screen.getByText('Tech Giants');
      fireEvent.click(watchlistOption);
    });

    await waitFor(() => {
      expect(screen.getByText(/added to watchlist/i)).toBeInTheDocument();
    });
  });
});