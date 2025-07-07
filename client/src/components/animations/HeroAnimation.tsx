import React, { useState, useEffect } from 'react';
import { FadeIn, ScaleIn, SlideIn } from "@/components/animations/css-animations";

// Lazy import Lottie to reduce initial bundle size
const Lottie = React.lazy(() => import('lottie-react'));

interface HeroAnimationProps {
  className?: string;
  style?: React.CSSProperties;
}

// Fallback visual elegante
const AnimationFallback: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ 
  className, 
  style 
}) => (
  <div
    className={`relative flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl animate-fade-in ${className}`}
    style={style}
  >
    {/* Animated background */}
    <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-500/20 to-indigo-600/20 rounded-2xl animate-pulse" />
    
    {/* Content */}
    <div className="relative z-10 text-center text-white">
      <div className="text-6xl mb-4 animate-spin-slow">
        🚀
      </div>
      <div className="text-2xl font-bold tracking-wide">
        Alfalyzer
      </div>
      <div className="text-sm opacity-80 mt-2">
        Financial Analysis Platform
      </div>
    </div>
    
    {/* Animated border */}
    <div className="absolute inset-0 rounded-2xl border-2 border-white/20 animate-pulse" />
  </div>
);


export const HeroAnimation: React.FC<HeroAnimationProps> = ({ 
  className = "", 
  style = {} 
}) => {
  const [hasError, setHasError] = useState(false);
  const [animationData, setAnimationData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load animation data from public folder
  useEffect(() => {
    const loadAnimation = async () => {
      try {
        const response = await fetch('/hero-animation.json');
        if (!response.ok) {
          throw new Error(`Failed to load animation: ${response.status}`);
        }
        const data = await response.json();
        setAnimationData(data);
        console.log('✅ Lottie animation data loaded successfully');
      } catch (error) {
        console.error('❌ Error loading Lottie animation:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnimation();
  }, []);

  // Default styling
  const defaultStyle = {
    height: 'clamp(400px, 50vw, 600px)',
    width: 'clamp(400px, 50vw, 600px)',
    maxHeight: '600px',
    maxWidth: '600px',
    ...style
  };

  // If still loading, show loading state
  if (isLoading) {
    return (
      <div
        className={`relative flex items-center justify-center animate-fade-in ${className}`}
        style={defaultStyle}
      >
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If error occurred or no animation data, show fallback
  if (hasError || !animationData) {
    console.log('🎬 HeroAnimation: Using fallback animation');
    return (
      <AnimationFallback 
        className={className} 
        style={defaultStyle} 
      />
    );
  }

  // Try to use Lottie animation
  try {
    console.log('🎬 HeroAnimation: Rendering Lottie animation');
    return (
      <div
        className={`relative animate-fade-in ${className}`}
        style={defaultStyle}
      >
        <React.Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
          </div>
        }>
          <Lottie
            animationData={animationData}
            loop={true}
            autoplay={true}
            style={{ 
              width: '100%', 
              height: '100%',
              maxWidth: '100%',
              maxHeight: '100%'
            }}
            onLoadedData={() => console.log('✅ Lottie animation rendered successfully')}
            onError={(error) => {
              console.error('❌ Lottie animation render error:', error);
              setHasError(true);
            }}
          />
        </React.Suspense>
      </div>
    );
  } catch (error) {
    console.error('❌ Error rendering Lottie animation:', error);
    setHasError(true);
    return (
      <AnimationFallback 
        className={className} 
        style={defaultStyle} 
      />
    );
  }
};

export default HeroAnimation;