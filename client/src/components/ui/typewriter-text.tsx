import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
  cursor?: boolean;
  delay?: number;
}

export function TypewriterText({
  text,
  speed = 30,
  onComplete,
  className = '',
  cursor = true,
  delay = 0
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(cursor);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(timer);
    } else {
      setStarted(true);
    }
  }, [delay]);

  useEffect(() => {
    if (!started || !text) return;

    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      setShowCursor(false);
      onComplete?.();
    }
  }, [currentIndex, text, speed, onComplete, started]);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setShowCursor(cursor);
  }, [text, cursor]);

  useEffect(() => {
    if (!cursor || !showCursor) return;

    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [cursor, showCursor]);

  return (
    <span className={className}>
      {displayedText.split('\n').map((line, i, arr) => (
        <React.Fragment key={i}>
          {line}
          {i < arr.length - 1 && <br />}
        </React.Fragment>
      ))}
      {showCursor && currentIndex < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  );
}