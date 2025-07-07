import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({ 
  value, 
  duration = 1000, 
  decimals = 0,
  prefix = "",
  suffix = "",
  className 
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startValue = 0;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [value, duration, isVisible]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}{count.toFixed(decimals)}{suffix}
    </span>
  );
}

interface StaggeredListProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  className?: string;
  itemClassName?: string;
}

export function StaggeredList({ 
  children, 
  staggerDelay = 100,
  className,
  itemClassName 
}: StaggeredListProps) {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
          
          children.forEach((_, index) => {
            setTimeout(() => {
              setVisibleItems(prev => new Set([...prev, index]));
            }, index * staggerDelay);
          });
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [children.length, staggerDelay, hasStarted]);

  return (
    <div ref={ref} className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className={cn(
            "transition-all duration-500 ease-out",
            visibleItems.has(index) 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-8",
            itemClassName
          )}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

interface PulseDotProps {
  variant?: "success" | "warning" | "error" | "info" | "chartreuse";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PulseDot({ variant = "chartreuse", size = "md", className }: PulseDotProps) {
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4"
  };

  const colorClasses = {
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    chartreuse: "bg-chartreuse"
  };

  return (
    <div className={cn("relative", className)}>
      <div className={cn(
        "rounded-full animate-ping absolute",
        colorClasses[variant],
        sizeClasses[size]
      )} />
      <div className={cn(
        "rounded-full relative",
        colorClasses[variant],
        sizeClasses[size]
      )} />
    </div>
  );
}

interface FadeInViewProps {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  className?: string;
}

export function FadeInView({ 
  children, 
  direction = "up", 
  delay = 0,
  className 
}: FadeInViewProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  const directionClasses = {
    up: isVisible ? "translate-y-0" : "translate-y-8",
    down: isVisible ? "translate-y-0" : "-translate-y-8",
    left: isVisible ? "translate-x-0" : "translate-x-8",
    right: isVisible ? "translate-x-0" : "-translate-x-8"
  };

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        isVisible ? "opacity-100" : "opacity-0",
        directionClasses[direction],
        className
      )}
    >
      {children}
    </div>
  );
}

interface ScaleOnHoverProps {
  children: React.ReactNode;
  scale?: number;
  className?: string;
}

export function ScaleOnHover({ children, scale = 1.05, className }: ScaleOnHoverProps) {
  return (
    <div 
      className={cn(
        "transition-transform duration-200 ease-out cursor-pointer",
        className
      )}
      style={{
        '--scale': scale.toString()
      } as React.CSSProperties}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = `scale(${scale})`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {children}
    </div>
  );
}

interface FloatingElementProps {
  children: React.ReactNode;
  duration?: number;
  distance?: number;
  className?: string;
}

export function FloatingElement({ 
  children, 
  duration = 3000,
  distance = 6,
  className 
}: FloatingElementProps) {
  return (
    <div 
      className={cn("animate-float", className)}
      style={{
        '--float-duration': `${duration}ms`,
        '--float-distance': `${distance}px`,
        animation: `float ${duration}ms ease-in-out infinite`
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

// Glow effect on hover
interface GlowOnHoverProps {
  children: React.ReactNode;
  color?: string;
  intensity?: "low" | "medium" | "high";
  className?: string;
}

export function GlowOnHover({ 
  children, 
  color = "#D8F22D", 
  intensity = "medium",
  className 
}: GlowOnHoverProps) {
  const intensityValues = {
    low: "0.1",
    medium: "0.2",
    high: "0.3"
  };

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out",
        className
      )}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 0 20px ${color}${intensityValues[intensity]}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {children}
    </div>
  );
}

// Typewriter effect
interface TypewriterProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export function Typewriter({ text, speed = 50, className, onComplete }: TypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <span className={className}>
      {displayText}
      {currentIndex < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  );
}