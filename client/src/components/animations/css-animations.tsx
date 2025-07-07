import { ReactNode, useEffect, useState, useRef } from 'react';
import './animations.css';

// Enhanced CSS-based animations with performance optimizations

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  triggerOnce?: boolean;
}

export function FadeIn({ 
  children, 
  delay = 0, 
  duration = 0.5, 
  className = '',
  triggerOnce = true
}: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!triggerOnce || !hasTriggered)) {
          const timer = setTimeout(() => {
            setIsVisible(true);
            setHasTriggered(true);
          }, delay * 1000);
          
          return () => clearTimeout(timer);
        } else if (!triggerOnce && !entry.isIntersecting) {
          setIsVisible(false);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay, triggerOnce, hasTriggered]);

  return (
    <div
      ref={ref}
      className={`fade-in ${isVisible ? 'fade-in-active' : ''} ${className}`}
      style={{ 
        '--animation-duration': `${duration}s`,
        '--animation-delay': `${delay}s`
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

interface ScaleInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function ScaleIn({ children, delay = 0, duration = 0.4, className = '' }: ScaleInProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`scale-in ${isVisible ? 'scale-in-active' : ''} ${className}`}
      style={{ 
        '--animation-duration': `${duration}s`,
        '--animation-delay': `${delay}s`
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

interface SlideInProps {
  children: ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
  duration?: number;
  className?: string;
}

export function SlideIn({ 
  children, 
  direction = 'up', 
  delay = 0, 
  duration = 0.4, 
  className = '' 
}: SlideInProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`slide-in slide-in-${direction} ${isVisible ? 'slide-in-active' : ''} ${className}`}
      style={{ 
        '--animation-duration': `${duration}s`,
        '--animation-delay': `${delay}s`
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

interface StaggerListProps {
  children: ReactNode[];
  delay?: number;
  staggerDelay?: number;
  className?: string;
}

export function StaggerList({ 
  children, 
  delay = 0, 
  staggerDelay = 0.1, 
  className = '' 
}: StaggerListProps) {
  const [visibleItems, setVisibleItems] = useState<boolean[]>(new Array(children.length).fill(false));

  useEffect(() => {
    children.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleItems(prev => {
          const newArray = [...prev];
          newArray[index] = true;
          return newArray;
        });
      }, (delay + index * staggerDelay) * 1000);
    });
  }, [children.length, delay, staggerDelay]);

  return (
    <div className={`stagger-container ${className}`}>
      {children.map((child, index) => (
        <div
          key={index}
          className={`stagger-item ${visibleItems[index] ? 'stagger-item-active' : ''}`}
          style={{ 
            '--animation-delay': `${delay + index * staggerDelay}s`
          } as React.CSSProperties}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

// Page transition wrapper
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, []);

  return (
    <div className={`page-transition ${isVisible ? 'page-transition-active' : ''} ${className}`}>
      {children}
    </div>
  );
}

// Modal animation wrapper
interface ModalTransitionProps {
  children: ReactNode;
  isOpen: boolean;
  className?: string;
}

export function ModalTransition({ children, isOpen, className = '' }: ModalTransitionProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <>
      <div className={`modal-backdrop ${isOpen ? 'modal-backdrop-active' : ''}`} />
      <div className={`modal-container ${isOpen ? 'modal-container-active' : ''} ${className}`}>
        {children}
      </div>
    </>
  );
}

// Loading spinner with CSS animation
export function LoadingSpinner({ size = 40 }: { size?: number }) {
  return (
    <div 
      className="loading-spinner"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="40 20"
        />
      </svg>
    </div>
  );
}

// Skeleton loading animation
export function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <div className={`skeleton-pulse bg-gray-200 dark:bg-gray-800 rounded ${className}`} />
  );
}

// Hover effects (using CSS classes)
export const hoverScale = "hover:scale-105 active:scale-95 transition-transform duration-200 ease-out";
export const hoverBrightness = "hover:brightness-110 transition-all duration-200";

// Animation variants for CSS classes
export const fadeInUp = "fade-in-up";
export const fadeInScale = "fade-in-scale";
export const slideInFromRight = "slide-in-right";
export const slideInFromLeft = "slide-in-left";
export const staggerContainer = "stagger-container";
export const staggerItem = "stagger-item";