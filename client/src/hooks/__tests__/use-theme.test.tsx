import { renderHook, act } from '@testing-library/react';
import { useTheme, ThemeProvider } from '../use-theme';
import React from 'react';

describe('useTheme', () => {
  // Helper to render hook with provider
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );
  
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear();
    // Reset document root classes
    document.documentElement.className = '';
  });
  
  it('should initialize with system theme by default', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    
    expect(result.current.theme).toBe('system');
  });
  
  it('should change theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    
    act(() => {
      result.current.setTheme('dark');
    });
    
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
  
  it('should persist theme to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    
    act(() => {
      result.current.setTheme('light');
    });
    
    expect(window.localStorage.getItem('theme')).toBe('light');
  });
  
  it('should load theme from localStorage on mount', () => {
    window.localStorage.setItem('theme', 'dark');
    
    const { result } = renderHook(() => useTheme(), { wrapper });
    
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
  
  it('should handle system theme changes', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    
    // Mock matchMedia
    const mockMatchMedia = jest.fn((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    
    window.matchMedia = mockMatchMedia as any;
    
    act(() => {
      result.current.setTheme('system');
    });
    
    // System prefers dark mode
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
  
  it('should toggle between light and dark themes', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    
    // Start with light theme
    act(() => {
      result.current.setTheme('light');
    });
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    
    // Toggle to dark
    act(() => {
      result.current.setTheme('dark');
    });
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
  
  it('should handle invalid theme values gracefully', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    
    // Try to set invalid theme
    act(() => {
      (result.current.setTheme as any)('invalid-theme');
    });
    
    // Should default to system
    expect(result.current.theme).toBe('system');
  });
  
  it('should provide correct theme value in nested components', () => {
    let outerTheme: string | undefined;
    let innerTheme: string | undefined;
    
    const OuterComponent = () => {
      const { theme } = useTheme();
      outerTheme = theme;
      return <InnerComponent />;
    };
    
    const InnerComponent = () => {
      const { theme } = useTheme();
      innerTheme = theme;
      return null;
    };
    
    renderHook(() => {}, {
      wrapper: ({ children }) => (
        <ThemeProvider>
          <OuterComponent />
          {children}
        </ThemeProvider>
      ),
    });
    
    expect(outerTheme).toBe(innerTheme);
  });
});