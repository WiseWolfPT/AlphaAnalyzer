/**
 * ALFALYZER - PORTFOLIO COMPONENTS TESTS
 * Testes unitários para componentes de portfolio
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PortfolioCard } from '../portfolio/portfolio-card';
import { PortfolioForm } from '../portfolio/portfolio-form';
import { PortfolioList } from '../portfolio/portfolio-list';
import { PortfolioSummary } from '../portfolio/portfolio-summary';
import { usePortfolio } from '@/hooks/use-portfolio';
import '@testing-library/jest-dom';

// Mock dos hooks
vi.mock('@/hooks/use-portfolio', () => ({
  usePortfolio: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Dados mock para testes
const mockPortfolio = {
  id: 'portfolio-1',
  name: 'My Main Portfolio',
  description: 'Long-term investments',
  value: 125000,
  cost: 100000,
  gain: 25000,
  gainPercent: 25,
  holdings: [
    {
      id: 'holding-1',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      quantity: 100,
      avgCost: 150,
      currentPrice: 175,
      value: 17500,
      gain: 2500,
      gainPercent: 16.67,
    },
    {
      id: 'holding-2',
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      quantity: 50,
      avgCost: 300,
      currentPrice: 380,
      value: 19000,
      gain: 4000,
      gainPercent: 26.67,
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

describe('PortfolioCard', () => {
  it('deve renderizar informações do portfolio', () => {
    renderWithProviders(
      <PortfolioCard portfolio={mockPortfolio} />
    );

    expect(screen.getByText('My Main Portfolio')).toBeInTheDocument();
    expect(screen.getByText('Long-term investments')).toBeInTheDocument();
    expect(screen.getByText('$125,000.00')).toBeInTheDocument();
    expect(screen.getByText('+$25,000.00')).toBeInTheDocument();
    expect(screen.getByText('+25.00%')).toBeInTheDocument();
  });

  it('deve mostrar cor verde para ganhos positivos', () => {
    renderWithProviders(
      <PortfolioCard portfolio={mockPortfolio} />
    );

    const gainElement = screen.getByText('+25.00%');
    expect(gainElement).toHaveClass('text-green-600');
  });

  it('deve mostrar cor vermelha para perdas', () => {
    const lossPortfolio = {
      ...mockPortfolio,
      gain: -5000,
      gainPercent: -5,
    };

    renderWithProviders(
      <PortfolioCard portfolio={lossPortfolio} />
    );

    const lossElement = screen.getByText('-5.00%');
    expect(lossElement).toHaveClass('text-red-600');
  });

  it('deve chamar onEdit quando botão editar é clicado', () => {
    const onEditMock = vi.fn();
    
    renderWithProviders(
      <PortfolioCard portfolio={mockPortfolio} onEdit={onEditMock} />
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    expect(onEditMock).toHaveBeenCalledWith(mockPortfolio);
  });

  it('deve chamar onDelete quando botão deletar é clicado', async () => {
    const onDeleteMock = vi.fn();
    
    renderWithProviders(
      <PortfolioCard portfolio={mockPortfolio} onDelete={onDeleteMock} />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    // Confirmar deleção no modal
    const confirmButton = await screen.findByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    expect(onDeleteMock).toHaveBeenCalledWith(mockPortfolio.id);
  });
});

describe('PortfolioForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar formulário vazio para novo portfolio', () => {
    renderWithProviders(
      <PortfolioForm onSubmit={vi.fn()} />
    );

    expect(screen.getByLabelText(/portfolio name/i)).toHaveValue('');
    expect(screen.getByLabelText(/description/i)).toHaveValue('');
    expect(screen.getByText(/create portfolio/i)).toBeInTheDocument();
  });

  it('deve preencher formulário com dados existentes para edição', () => {
    renderWithProviders(
      <PortfolioForm 
        portfolio={mockPortfolio} 
        onSubmit={vi.fn()} 
      />
    );

    expect(screen.getByLabelText(/portfolio name/i)).toHaveValue('My Main Portfolio');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Long-term investments');
    expect(screen.getByText(/update portfolio/i)).toBeInTheDocument();
  });

  it('deve validar campos obrigatórios', async () => {
    const onSubmitMock = vi.fn();
    
    renderWithProviders(
      <PortfolioForm onSubmit={onSubmitMock} />
    );

    const submitButton = screen.getByRole('button', { name: /create portfolio/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    expect(onSubmitMock).not.toHaveBeenCalled();
  });

  it('deve submeter formulário com dados válidos', async () => {
    const onSubmitMock = vi.fn();
    
    renderWithProviders(
      <PortfolioForm onSubmit={onSubmitMock} />
    );

    fireEvent.change(screen.getByLabelText(/portfolio name/i), {
      target: { value: 'New Portfolio' },
    });
    
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Test portfolio' },
    });

    const submitButton = screen.getByRole('button', { name: /create portfolio/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalledWith({
        name: 'New Portfolio',
        description: 'Test portfolio',
      });
    });
  });

  it('deve permitir adicionar holdings ao portfolio', async () => {
    renderWithProviders(
      <PortfolioForm onSubmit={vi.fn()} />
    );

    const addHoldingButton = screen.getByRole('button', { name: /add holding/i });
    fireEvent.click(addHoldingButton);

    // Preencher dados da holding
    fireEvent.change(screen.getByLabelText(/symbol/i), {
      target: { value: 'AAPL' },
    });
    
    fireEvent.change(screen.getByLabelText(/quantity/i), {
      target: { value: '100' },
    });
    
    fireEvent.change(screen.getByLabelText(/average cost/i), {
      target: { value: '150' },
    });

    const confirmAddButton = screen.getByRole('button', { name: /add to portfolio/i });
    fireEvent.click(confirmAddButton);

    await waitFor(() => {
      expect(screen.getByText(/aapl/i)).toBeInTheDocument();
      expect(screen.getByText(/100 shares/i)).toBeInTheDocument();
    });
  });
});

describe('PortfolioList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar lista de portfolios', () => {
    vi.mocked(usePortfolio).mockReturnValue({
      portfolios: [mockPortfolio],
      isLoading: false,
      error: null,
      createPortfolio: vi.fn(),
      updatePortfolio: vi.fn(),
      deletePortfolio: vi.fn(),
    });

    renderWithProviders(<PortfolioList />);

    expect(screen.getByText('My Main Portfolio')).toBeInTheDocument();
    expect(screen.getByText('$125,000.00')).toBeInTheDocument();
  });

  it('deve mostrar estado de carregamento', () => {
    vi.mocked(usePortfolio).mockReturnValue({
      portfolios: [],
      isLoading: true,
      error: null,
      createPortfolio: vi.fn(),
      updatePortfolio: vi.fn(),
      deletePortfolio: vi.fn(),
    });

    renderWithProviders(<PortfolioList />);

    expect(screen.getByTestId('portfolio-skeleton')).toBeInTheDocument();
  });

  it('deve mostrar mensagem quando não há portfolios', () => {
    vi.mocked(usePortfolio).mockReturnValue({
      portfolios: [],
      isLoading: false,
      error: null,
      createPortfolio: vi.fn(),
      updatePortfolio: vi.fn(),
      deletePortfolio: vi.fn(),
    });

    renderWithProviders(<PortfolioList />);

    expect(screen.getByText(/no portfolios yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create your first portfolio/i })).toBeInTheDocument();
  });

  it('deve abrir formulário ao clicar em criar portfolio', () => {
    vi.mocked(usePortfolio).mockReturnValue({
      portfolios: [],
      isLoading: false,
      error: null,
      createPortfolio: vi.fn(),
      updatePortfolio: vi.fn(),
      deletePortfolio: vi.fn(),
    });

    renderWithProviders(<PortfolioList />);

    const createButton = screen.getByRole('button', { name: /create portfolio/i });
    fireEvent.click(createButton);

    expect(screen.getByText(/new portfolio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/portfolio name/i)).toBeInTheDocument();
  });

  it('deve permitir filtrar portfolios', () => {
    vi.mocked(usePortfolio).mockReturnValue({
      portfolios: [
        mockPortfolio,
        { ...mockPortfolio, id: 'portfolio-2', name: 'Retirement Fund' },
      ],
      isLoading: false,
      error: null,
      createPortfolio: vi.fn(),
      updatePortfolio: vi.fn(),
      deletePortfolio: vi.fn(),
    });

    renderWithProviders(<PortfolioList />);

    const searchInput = screen.getByPlaceholderText(/search portfolios/i);
    fireEvent.change(searchInput, { target: { value: 'retirement' } });

    expect(screen.queryByText('My Main Portfolio')).not.toBeInTheDocument();
    expect(screen.getByText('Retirement Fund')).toBeInTheDocument();
  });
});

describe('PortfolioSummary', () => {
  const mockSummaryData = {
    totalValue: 250000,
    totalCost: 200000,
    totalGain: 50000,
    totalGainPercent: 25,
    portfolioCount: 3,
    holdingCount: 15,
    topPerformer: {
      symbol: 'NVDA',
      gainPercent: 150,
    },
    worstPerformer: {
      symbol: 'INTC',
      gainPercent: -20,
    },
  };

  it('deve renderizar resumo do portfolio', () => {
    renderWithProviders(
      <PortfolioSummary data={mockSummaryData} />
    );

    expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
    expect(screen.getByText('$250,000.00')).toBeInTheDocument();
    expect(screen.getByText('+$50,000.00')).toBeInTheDocument();
    expect(screen.getByText('+25.00%')).toBeInTheDocument();
  });

  it('deve mostrar estatísticas do portfolio', () => {
    renderWithProviders(
      <PortfolioSummary data={mockSummaryData} />
    );

    expect(screen.getByText('3')).toBeInTheDocument(); // portfolios
    expect(screen.getByText('15')).toBeInTheDocument(); // holdings
  });

  it('deve destacar melhor e pior performance', () => {
    renderWithProviders(
      <PortfolioSummary data={mockSummaryData} />
    );

    expect(screen.getByText('NVDA')).toBeInTheDocument();
    expect(screen.getByText('+150.00%')).toBeInTheDocument();
    expect(screen.getByText('INTC')).toBeInTheDocument();
    expect(screen.getByText('-20.00%')).toBeInTheDocument();
  });

  it('deve mostrar gráfico de alocação', () => {
    renderWithProviders(
      <PortfolioSummary 
        data={mockSummaryData}
        showAllocation={true}
      />
    );

    expect(screen.getByTestId('allocation-chart')).toBeInTheDocument();
  });

  it('deve permitir exportar dados', () => {
    const onExportMock = vi.fn();
    
    renderWithProviders(
      <PortfolioSummary 
        data={mockSummaryData}
        onExport={onExportMock}
      />
    );

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    expect(onExportMock).toHaveBeenCalled();
  });
});