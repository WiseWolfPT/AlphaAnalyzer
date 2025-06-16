import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export function ScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const updateScrollProgress = () => {
      const scrolled = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrolled / maxScroll) * 100;
      setScrollProgress(Math.min(progress, 100));
    };

    window.addEventListener("scroll", updateScrollProgress);
    return () => window.removeEventListener("scroll", updateScrollProgress);
  }, []);

  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: scrollProgress / 100 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-chartreuse-dark via-chartreuse to-chartreuse-dark z-50 origin-left"
      style={{
        boxShadow: "0 0 10px rgba(216, 242, 45, 0.3)"
      }}
    />
  );
}