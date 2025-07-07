/**
 * ALFALYZER - ADMIN TRANSCRIPTS TESTS
 * Testes unitários para o sistema de gerenciamento de transcripts
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminTranscripts from '../admin-transcripts';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/simple-auth-offline';
import '@testing-library/jest-dom';

// Mock das dependências
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/contexts/simple-auth-offline', () => ({
  useAuth: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/admin/transcripts', vi.fn()],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock de dados
const mockTranscripts = [
  {
    id: 1,
    ticker: 'AAPL',
    company_name: 'Apple Inc.',
    quarter: 'Q4',
    year: 2023,
    call_date: '2023-10-26',
    raw_transcript: 'Good afternoon, everyone...',
    ai_summary: {
      summary: 'Apple reported record Q4 revenue...',
      highlights: ['Record iPhone sales', 'Services growth'],
      sentiment: 'positive',
    },
    status: 'published',
    created_at: '2023-10-27T10:00:00Z',
    published_at: '2023-10-27T14:00:00Z',
    view_count: 1250,
  },
  {
    id: 2,
    ticker: 'MSFT',
    company_name: 'Microsoft Corporation',
    quarter: 'Q3',
    year: 2023,
    call_date: '2023-07-25',
    raw_transcript: 'Welcome to Microsoft earnings call...',
    ai_summary: null,
    status: 'pending',
    created_at: '2023-07-26T09:00:00Z',
    published_at: null,
    view_count: 0,
  },
];

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

describe('AdminTranscripts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth como admin
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'admin-1', email: 'admin@alfalyzer.com', role: 'admin' },
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    } as any);
  });

  describe('Lista de Transcripts', () => {
    it('deve carregar e exibir lista de transcripts', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockTranscripts });

      renderWithProviders(<AdminTranscripts />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
        expect(screen.getByText('Q4 2023')).toBeInTheDocument();
        expect(screen.getByText('Published')).toBeInTheDocument();
      });

      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByText('Microsoft Corporation')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('deve mostrar estado de carregamento', () => {
      vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<AdminTranscripts />);

      expect(screen.getByTestId('transcripts-skeleton')).toBeInTheDocument();
    });

    it('deve mostrar mensagem quando não há transcripts', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: [] });

      renderWithProviders(<AdminTranscripts />);

      await waitFor(() => {
        expect(screen.getByText(/no transcripts found/i)).toBeInTheDocument();
      });
    });

    it('deve filtrar transcripts por status', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockTranscripts });

      renderWithProviders(<AdminTranscripts />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      // Filtrar por pending
      const statusFilter = screen.getByLabelText(/filter by status/i);
      fireEvent.change(statusFilter, { target: { value: 'pending' } });

      expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
    });

    it('deve buscar transcripts por ticker', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockTranscripts });

      renderWithProviders(<AdminTranscripts />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by ticker/i);
      fireEvent.change(searchInput, { target: { value: 'MSFT' } });

      expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
    });
  });

  describe('Upload de Transcript', () => {
    it('deve abrir modal de upload ao clicar no botão', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: [] });

      renderWithProviders(<AdminTranscripts />);

      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /upload transcript/i });
        fireEvent.click(uploadButton);
      });

      expect(screen.getByText(/upload new transcript/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ticker symbol/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    });

    it('deve validar campos obrigatórios', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: [] });

      renderWithProviders(<AdminTranscripts />);

      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /upload transcript/i });
        fireEvent.click(uploadButton);
      });

      const submitButton = screen.getByRole('button', { name: /save transcript/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/ticker is required/i)).toBeInTheDocument();
        expect(screen.getByText(/company name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/transcript text is required/i)).toBeInTheDocument();
      });
    });

    it('deve fazer upload de transcript com sucesso', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: [] });
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { id: 3, ticker: 'GOOGL', status: 'pending' },
      });

      renderWithProviders(<AdminTranscripts />);

      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /upload transcript/i });
        fireEvent.click(uploadButton);
      });

      // Preencher formulário
      fireEvent.change(screen.getByLabelText(/ticker symbol/i), {
        target: { value: 'GOOGL' },
      });
      fireEvent.change(screen.getByLabelText(/company name/i), {
        target: { value: 'Alphabet Inc.' },
      });
      fireEvent.change(screen.getByLabelText(/quarter/i), {
        target: { value: 'Q1' },
      });
      fireEvent.change(screen.getByLabelText(/year/i), {
        target: { value: '2024' },
      });
      fireEvent.change(screen.getByLabelText(/transcript text/i), {
        target: { value: 'This is the earnings call transcript...' },
      });

      const submitButton = screen.getByRole('button', { name: /save transcript/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/transcripts', {
          ticker: 'GOOGL',
          company_name: 'Alphabet Inc.',
          quarter: 'Q1',
          year: 2024,
          raw_transcript: 'This is the earnings call transcript...',
          status: 'pending',
        });
      });

      expect(screen.getByText(/transcript uploaded successfully/i)).toBeInTheDocument();
    });

    it('deve permitir pré-visualização do transcript', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: [] });

      renderWithProviders(<AdminTranscripts />);

      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /upload transcript/i });
        fireEvent.click(uploadButton);
      });

      const transcriptText = 'CEO: Good afternoon everyone...';
      fireEvent.change(screen.getByLabelText(/transcript text/i), {
        target: { value: transcriptText },
      });

      const previewButton = screen.getByRole('button', { name: /preview/i });
      fireEvent.click(previewButton);

      expect(screen.getByText(transcriptText)).toBeInTheDocument();
    });
  });

  describe('Geração de Resumo AI', () => {
    it('deve abrir modal de resumo AI para transcript sem resumo', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockTranscripts });

      renderWithProviders(<AdminTranscripts />);

      await waitFor(() => {
        const msftRow = screen.getByText('MSFT').closest('tr');
        const generateButton = msftRow?.querySelector('button[aria-label*="generate summary"]');
        if (generateButton) fireEvent.click(generateButton);
      });

      expect(screen.getByText(/generate ai summary/i)).toBeInTheDocument();
      expect(screen.getByText(/paste the chatgpt summary/i)).toBeInTheDocument();
    });

    it('deve salvar resumo AI', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockTranscripts });
      vi.mocked(api.put).mockResolvedValueOnce({ data: { success: true } });

      renderWithProviders(<AdminTranscripts />);

      await waitFor(() => {
        const msftRow = screen.getByText('MSFT').closest('tr');
        const generateButton = msftRow?.querySelector('button[aria-label*="generate summary"]');
        if (generateButton) fireEvent.click(generateButton);
      });

      const summaryText = 'Microsoft reported strong cloud growth...';
      const highlightsText = '- Azure revenue up 30%\n- Office 365 subscribers increased';

      fireEvent.change(screen.getByLabelText(/summary text/i), {
        target: { value: summaryText },
      });
      fireEvent.change(screen.getByLabelText(/key highlights/i), {
        target: { value: highlightsText },
      });
      fireEvent.change(screen.getByLabelText(/sentiment/i), {
        target: { value: 'positive' },
      });

      const saveButton = screen.getByRole('button', { name: /save summary/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith('/transcripts/2/summary', {
          ai_summary: {
            summary: summaryText,
            highlights: ['Azure revenue up 30%', 'Office 365 subscribers increased'],
            sentiment: 'positive',
          },
        });
      });
    });

    it('deve mostrar instruções para gerar resumo com ChatGPT', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockTranscripts });

      renderWithProviders(<AdminTranscripts />);

      await waitFor(() => {
        const msftRow = screen.getByText('MSFT').closest('tr');
        const generateButton = msftRow?.querySelector('button[aria-label*="generate summary"]');
        if (generateButton) fireEvent.click(generateButton);
      });

      expect(screen.getByText(/copy the transcript text/i)).toBeInTheDocument();
      expect(screen.getByText(/paste into chatgpt/i)).toBeInTheDocument();
      expect(screen.getByText(/copy the generated summary/i)).toBeInTheDocument();
    });
  });

  describe('Publicação de Transcript', () => {
    it('deve publicar transcript pendente', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockTranscripts });
      vi.mocked(api.put).mockResolvedValueOnce({ data: { status: 'published' } });

      renderWithProviders(<AdminTranscripts />);

      await waitFor(() => {
        const msftRow = screen.getByText('MSFT').closest('tr');
        const publishButton = msftRow?.querySelector('button[aria-label*="publish"]');
        if (publishButton) fireEvent.click(publishButton);
      });

      // Confirmar publicação
      const confirmButton = await screen.findByRole('button', { name: /confirm publish/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith('/transcripts/2/status', {
          status: 'published',
        });
      });
    });

    it('deve exigir resumo AI antes de publicar', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockTranscripts });

      renderWithProviders(<AdminTranscripts />);

      await waitFor(() => {
        const msftRow = screen.getByText('MSFT').closest('tr');
        const publishButton = msftRow?.querySelector('button[aria-label*="publish"]');
        expect(publishButton).toBeDisabled();
      });

      // Hover para ver tooltip
      const msftRow = screen.getByText('MSFT').closest('tr');
      const publishButton = msftRow?.querySelector('button[aria-label*="publish"]');
      if (publishButton) fireEvent.mouseOver(publishButton);

      expect(screen.getByText(/ai summary required/i)).toBeInTheDocument();
    });
  });

  describe('Edição e Exclusão', () => {
    it('deve editar transcript existente', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockTranscripts });
      vi.mocked(api.put).mockResolvedValueOnce({ data: { success: true } });

      renderWithProviders(<AdminTranscripts />);

      await waitFor(() => {
        const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
        fireEvent.click(editButton);
      });

      // Editar texto
      const transcriptTextarea = screen.getByLabelText(/transcript text/i);
      fireEvent.change(transcriptTextarea, {
        target: { value: 'Updated transcript text...' },
      });

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith('/transcripts/1', expect.objectContaining({
          raw_transcript: 'Updated transcript text...',
        }));
      });
    });

    it('deve deletar transcript com confirmação', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockTranscripts });
      vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true } });

      renderWithProviders(<AdminTranscripts />);

      await waitFor(() => {
        const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
        fireEvent.click(deleteButton);
      });

      // Confirmar exclusão
      const confirmButton = await screen.findByRole('button', { name: /confirm delete/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith('/transcripts/1');
      });
    });
  });

  describe('Estatísticas', () => {
    it('deve mostrar estatísticas de transcripts', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockTranscripts });

      renderWithProviders(<AdminTranscripts />);

      await waitFor(() => {
        expect(screen.getByText(/total transcripts: 2/i)).toBeInTheDocument();
        expect(screen.getByText(/published: 1/i)).toBeInTheDocument();
        expect(screen.getByText(/pending: 1/i)).toBeInTheDocument();
        expect(screen.getByText(/total views: 1,250/i)).toBeInTheDocument();
      });
    });
  });
});