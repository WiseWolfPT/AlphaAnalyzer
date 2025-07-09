import React from 'react';
import { motion } from 'framer-motion';

interface HeroAnimationProps {
  className?: string;
  style?: React.CSSProperties;
}

// Pure CSS + Framer Motion Animation (replaces 315KB Lottie)
const PureCSSAnimation: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ 
  className, 
  style 
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.8 }}
    className={`relative flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl ${className}`}
    style={style}
  >
    {/* Floating particles */}
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white/30 rounded-full"
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -40, 20, 0],
            scale: [1, 1.5, 0.8, 1],
            opacity: [0.3, 0.8, 0.4, 0.3]
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.3
          }}
          style={{
            left: `${10 + i * 12}%`,
            top: `${20 + (i % 3) * 20}%`
          }}
        />
      ))}
    </div>
    
    {/* Main content */}
    <div className="relative z-10 text-center text-white">
      <motion.div
        animate={{ 
          rotate: [0, 360],
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="text-6xl mb-4"
      >
        📈
      </motion.div>
      <motion.div 
        className="text-2xl font-bold tracking-wide"
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Alfalyzer
      </motion.div>
      <div className="text-sm opacity-80 mt-2">
        Financial Analysis Platform
      </div>
    </div>
    
    {/* Animated border rings */}
    <motion.div 
      className="absolute inset-0 rounded-2xl border-2 border-white/20"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    <motion.div 
      className="absolute inset-2 rounded-xl border border-white/10"
      animate={{ scale: [1, 0.95, 1] }}
      transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
    />
  </motion.div>
);


export const HeroAnimation: React.FC<HeroAnimationProps> = ({ 
  className = "", 
  style = {} 
}) => {
  // Default styling
  const defaultStyle = {
    height: 'clamp(400px, 50vw, 600px)',
    width: 'clamp(400px, 50vw, 600px)',
    maxHeight: '600px',
    maxWidth: '600px',
    ...style
  };

  return (
    <PureCSSAnimation 
      className={className} 
      style={defaultStyle} 
    />
  );
};

export default HeroAnimation;