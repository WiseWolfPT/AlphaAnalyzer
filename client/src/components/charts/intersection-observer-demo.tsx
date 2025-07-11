/**
 * INTERSECTION OBSERVER DEMO
 * Demonstra lazy loading extremo com Intersection Observer
 */

import React, { useEffect, useRef, useState } from 'react';
import LazyChart from '../LazyChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Activity, TrendingUp, BarChart3, PieChart } from 'lucide-react';

// Dados de exemplo para os charts
const generateChartData = (type: string) => {
  const baseData = Array.from({ length: 20 }, (_, i) => ({
    name: `Point ${i + 1}`,
    value: Math.floor(Math.random() * 1000) + 100,
    month: `2024-${String(i + 1).padStart(2, '0')}`,
    category: ['Tech', 'Finance', 'Healthcare', 'Energy'][i % 4]
  }));

  return baseData;
};

interface LazyChartCardProps {
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  icon: React.ComponentType<{ className?: string }>;
  data: any[];
  delay?: number;
}

const LazyChartCard: React.FC<LazyChartCardProps> = ({ 
  title, 
  type, 
  icon: Icon, 
  data, 
  delay = 0 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = cardRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !isVisible) {
            const start = performance.now();
            
            // Simular delay se necessário
            setTimeout(() => {
              setIsVisible(true);
              setLoadTime(performance.now() - start);
            }, delay);
            
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    observer.observe(currentRef);

    return () => observer.disconnect();
  }, [isVisible, delay]);

  return (
    <Card ref={cardRef} className="h-[500px] overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5" />
          {title}
          <Badge variant={isVisible ? "default" : "secondary"} className="ml-auto">
            {isVisible ? (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Loaded
                {loadTime && (
                  <span className="text-xs">({loadTime.toFixed(0)}ms)</span>
                )}
              </span>
            ) : (
              "Waiting..."
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isVisible ? (
          <LazyChart
            data={data}
            type={type}
            height={350}
            className="w-full"
            threshold={0.1}
            rootMargin="50px"
          />
        ) : (
          <div className="w-full h-[350px] bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="animate-pulse">
                <div className="w-12 h-12 bg-muted-foreground/20 rounded-full mx-auto mb-3"></div>
                <p className="text-sm">Scroll down to load {type} chart</p>
                <p className="text-xs mt-1">Intersection Observer waiting...</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const IntersectionObserverDemo: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  const [visibleCharts, setVisibleCharts] = useState<string[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const charts = [
    {
      id: 'line-chart',
      title: 'Revenue Trend (Line Chart)',
      type: 'line' as const,
      icon: TrendingUp,
      data: generateChartData('line'),
      delay: 0
    },
    {
      id: 'bar-chart',
      title: 'Quarterly Performance (Bar Chart)',
      type: 'bar' as const,
      icon: BarChart3,
      data: generateChartData('bar'),
      delay: 200
    },
    {
      id: 'pie-chart',
      title: 'Market Share (Pie Chart)',
      type: 'pie' as const,
      icon: PieChart,
      data: generateChartData('pie'),
      delay: 400
    },
    {
      id: 'area-chart',
      title: 'User Growth (Area Chart)',
      type: 'area' as const,
      icon: Activity,
      data: generateChartData('area'),
      delay: 600
    }
  ];

  const scrollToChart = (index: number) => {
    const chartElement = document.getElementById(`chart-${index}`);
    if (chartElement) {
      chartElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Intersection Observer Demo</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Scroll down to see charts loading automatically when they enter the viewport. 
          Each chart loads only when needed, optimizing performance.
        </p>
        
        {/* Scroll indicator */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Scroll Position: {scrollY}px</span>
          <span>•</span>
          <span>Visible Charts: {visibleCharts.length}/4</span>
        </div>
      </div>

      {/* Quick navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
        {charts.map((chart, index) => (
          <Button
            key={chart.id}
            variant="outline"
            size="sm"
            onClick={() => scrollToChart(index)}
            className="flex items-center gap-2"
          >
            <chart.icon className="h-4 w-4" />
            {chart.title.split(' ')[0]}
          </Button>
        ))}
      </div>

      {/* Performance metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-green-600 font-semibold">Lazy Loading</div>
              <div className="text-green-800">Charts load only when visible</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-blue-600 font-semibold">Intersection Observer</div>
              <div className="text-blue-800">Efficient viewport detection</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-purple-600 font-semibold">Bundle Splitting</div>
              <div className="text-purple-800">Each chart type in separate chunk</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="space-y-12">
        {charts.map((chart, index) => (
          <div key={chart.id} id={`chart-${index}`} className="scroll-mt-8">
            <LazyChartCard
              title={chart.title}
              type={chart.type}
              icon={chart.icon}
              data={chart.data}
              delay={chart.delay}
            />
          </div>
        ))}
      </div>

      {/* Spacer para demonstrar scroll */}
      <div className="h-[50vh] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">End of Demo</p>
          <p className="text-sm mt-2">
            Scroll up to see the charts load as they enter the viewport
          </p>
        </div>
      </div>
    </div>
  );
};

export default IntersectionObserverDemo;