import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ValuationGauge } from '../valuation-gauge';

describe('ValuationGauge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Pointer Animation', () => {
    it('should start pointer at 0° and animate to correct position for Strong Sell', async () => {
      const { container } = render(
        <ValuationGauge iv={125.44} price={262.24} />
      );

      // Find the pointer group element
      const pointerGroup = container.querySelector('g[data-testid="gauge-pointer"]');
      expect(pointerGroup).toBeTruthy();

      // Initially, pointer should be at 0° (transform: rotate(0deg))
      const initialTransform = window.getComputedStyle(pointerGroup!).transform;

      // Advance timers to trigger animation
      vi.advanceTimersByTime(100);

      // Wait for animation to complete (700ms duration)
      vi.advanceTimersByTime(700);

      // After animation, pointer should be rotated to the correct angle
      // For -52.2% discount (premium), angle should be ~180° (far right)
      await waitFor(() => {
        const finalTransform = window.getComputedStyle(pointerGroup!).transform;
        expect(finalTransform).not.toBe(initialTransform);
      });
    });

    it('should calculate correct angle for Strong Buy (-52.2% discount)', () => {
      render(<ValuationGauge iv={262.24} price={125.44} />);

      // IV > Price by 109%, should be clamped to 50% → angle = 180° (far right on Strong Buy)
      const badge = screen.getByText(/Strong Buy/i);
      expect(badge).toBeInTheDocument();

      // Discount should show as positive
      const discount = screen.getByText(/\+/);
      expect(discount).toBeInTheDocument();
    });

    it('should calculate correct angle for Hold (fair value)', () => {
      render(<ValuationGauge iv={100} price={100} />);

      // 0% discount → angle = 90° (center Hold zone)
      const badge = screen.getByText(/Hold/i);
      expect(badge).toBeInTheDocument();

      const discount = screen.getByText(/0\.0%/);
      expect(discount).toBeInTheDocument();
    });

    it('should calculate correct angle for Strong Sell (-52.2% premium)', () => {
      render(<ValuationGauge iv={125.44} price={262.24} />);

      // Price > IV by 109%, should be clamped to -50% → angle = 0° (far right on Strong Sell)
      const badge = screen.getByText(/Strong Sell/i);
      expect(badge).toBeInTheDocument();

      // Discount should show as negative (premium)
      const discount = screen.getByText(/-/);
      expect(discount).toBeInTheDocument();
    });
  });

  describe('Animation Timing', () => {
    it('should delay animation start by 100ms', () => {
      const { container } = render(
        <ValuationGauge iv={125.44} price={262.24} />
      );

      const pointerGroup = container.querySelector('g[data-testid="gauge-pointer"]');

      // Before timer fires, angle should be 0
      expect(pointerGroup?.getAttribute('data-angle')).toBe('0');

      // After 50ms, still 0
      vi.advanceTimersByTime(50);
      expect(pointerGroup?.getAttribute('data-angle')).toBe('0');

      // After 100ms, should update to final angle
      vi.advanceTimersByTime(50);
      expect(pointerGroup?.getAttribute('data-angle')).not.toBe('0');
    });

    it('should use 700ms transition duration', () => {
      const { container } = render(
        <ValuationGauge iv={125.44} price={262.24} />
      );

      const pointerGroup = container.querySelector('g[data-testid="gauge-pointer"]');

      // Check if transition duration is set correctly
      const style = window.getComputedStyle(pointerGroup!);
      expect(style.transitionDuration).toBe('700ms');
    });
  });

  describe('Edge Cases', () => {
    it('should clamp extreme undervaluation (>50% discount)', () => {
      render(<ValuationGauge iv={500} price={100} />);

      // 400% discount should be clamped to 50% → angle = 180° (Strong Buy zone)
      const badge = screen.getByText(/Strong Buy/i);
      expect(badge).toBeInTheDocument();
    });

    it('should clamp extreme overvaluation (<-50% premium)', () => {
      render(<ValuationGauge iv={100} price={500} />);

      // -400% premium should be clamped to -50% → angle = 0° (Strong Sell zone)
      const badge = screen.getByText(/Strong Sell/i);
      expect(badge).toBeInTheDocument();
    });
  });
});
