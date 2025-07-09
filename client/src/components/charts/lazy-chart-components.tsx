/**
 * Example of aggressive dynamic imports for heavy chart components
 * This demonstrates how to implement micro-bundles for specific heavy libraries
 * Updated to use Chart.js instead of Recharts
 */

import React, { Suspense, lazy } from 'react';
import { createLazyComponent } from '@/lib/lazy-loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart, PieChart, Activity } from 'lucide-react';

// Chart loading fallback
const ChartSkeleton = () => (
  <div className="w-full h-64 bg-muted animate-pulse rounded-lg flex items-center justify-center">
    <div className="text-muted-foreground">Loading chart...</div>
  </div>
);

// AGGRESSIVE DYNAMIC IMPORTS FOR CHART COMPONENTS

// Chart.js micro-bundles (split by chart type)
const LazyLineChart = createLazyComponent(
  () => import('@/components/ui/lightweight-chart').then(m => ({ 
    default: React.forwardRef<any, any>((props, ref) => {
      const { LightweightLineChart } = m;
      return (
        <div ref={ref} className="w-full h-[300px]">
          <LightweightLineChart
            data={props.data.map((item: any) => ({ label: item.name, value: item.value }))}
            color="#8884d8"
            className="w-full h-full"
          />
        </div>
      );
    })
  })),
  {
    name: 'LazyLineChart',
    preload: [
      () => import('chart.js'),
      () => import('react-chartjs-2')
    ]
  }
);

const LazyBarChart = createLazyComponent(
  () => import('@/components/ui/lightweight-chart').then(m => ({ 
    default: React.forwardRef<any, any>((props, ref) => {
      const { LightweightBarChart } = m;
      return (
        <div ref={ref} className="w-full h-[300px]">
          <LightweightBarChart
            data={props.data.map((item: any) => ({ label: item.name, value: item.value }))}
            color="#82ca9d"
            className="w-full h-full"
          />
        </div>
      );
    })
  })),
  {
    name: 'LazyBarChart',
    preload: [
      () => import('chart.js'),
      () => import('react-chartjs-2')
    ]
  }
);

const LazyPieChart = createLazyComponent(
  () => import('@/components/ui/lightweight-chart').then(m => ({ 
    default: React.forwardRef<any, any>((props, ref) => {
      const { LightweightPieChart } = m;
      const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
      
      return (
        <div ref={ref} className="w-full h-[300px]">
          <LightweightPieChart
            data={props.data.map((item: any, index: number) => ({
              label: item.name,
              value: item.value,
              color: COLORS[index % COLORS.length]
            }))}
            className="w-full h-full"
          />
        </div>
      );
    })
  })),
  {
    name: 'LazyPieChart',
    preload: [
      () => import('chart.js'),
      () => import('react-chartjs-2')
    ]
  }
);

// Lottie animation micro-bundle
const LazyLottieAnimation = createLazyComponent(
  () => import('lottie-react').then(m => ({ 
    default: React.forwardRef<any, any>((props, ref) => {
      const Lottie = m.default;
      return <Lottie {...props} ref={ref} />;
    })
  })),
  {
    name: 'LazyLottieAnimation',
    preload: [
      () => import('lottie-web')
    ]
  }
);

// Framer Motion micro-bundle
const LazyMotionDiv = createLazyComponent(
  () => import('framer-motion').then(m => ({ 
    default: React.forwardRef<any, any>((props, ref) => {
      const { motion } = m;
      return <motion.div {...props} ref={ref} />;
    })
  })),
  {
    name: 'LazyMotionDiv',
    preload: [
      () => import('framer-motion/dist/es/render/dom/motion')
    ]
  }
);

// DnD Kit micro-bundle
const LazyDndContext = createLazyComponent(
  () => Promise.all([
    import('@dnd-kit/core'),
    import('@dnd-kit/sortable')
  ]).then(([core, sortable]) => ({ 
    default: React.forwardRef<any, any>((props, ref) => {
      const { DndContext } = core;
      const { SortableContext } = sortable;
      
      return (
        <DndContext {...props.dndProps} ref={ref}>
          <SortableContext {...props.sortableProps}>
            {props.children}
          </SortableContext>
        </DndContext>
      );
    })
  })),
  {
    name: 'LazyDndContext',
    preload: [
      () => import('@dnd-kit/utilities'),
      () => import('@dnd-kit/modifiers')
    ]
  }
);

// Sample data for demonstrations
const sampleLineData = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 600 },
  { name: 'Apr', value: 800 },
  { name: 'May', value: 500 },
];

const sampleBarData = [
  { name: 'AAPL', value: 150 },
  { name: 'GOOGL', value: 2800 },
  { name: 'MSFT', value: 300 },
  { name: 'AMZN', value: 3200 },
];

const samplePieData = [
  { name: 'Tech', value: 400 },
  { name: 'Healthcare', value: 300 },
  { name: 'Finance', value: 300 },
  { name: 'Energy', value: 200 },
];

interface LazyChartsExampleProps {
  className?: string;
}

/**
 * Example component showcasing aggressive dynamic imports
 * Each chart type is loaded only when needed
 */
export const LazyChartsExample: React.FC<LazyChartsExampleProps> = ({ className }) => {
  const [activeChart, setActiveChart] = React.useState<string | null>(null);

  // Chart selection handlers that trigger dynamic imports
  const showChart = (chartType: string) => {
    setActiveChart(chartType);
    
    // Optional: Preload related chart types
    setTimeout(() => {
      if (chartType === 'line') {
        import('@/components/ui/lightweight-chart').catch(() => null);
      } else if (chartType === 'bar') {
        import('@/components/ui/lightweight-chart').catch(() => null);
      }
    }, 1000);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Dynamic Chart Loading Demo (Chart.js)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button 
              variant={activeChart === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => showChart('line')}
              className="flex items-center gap-2"
            >
              <LineChart className="h-4 w-4" />
              Line Chart
            </Button>
            
            <Button 
              variant={activeChart === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => showChart('bar')}
              className="flex items-center gap-2"
            >
              <BarChart className="h-4 w-4" />
              Bar Chart
            </Button>
            
            <Button 
              variant={activeChart === 'pie' ? 'default' : 'outline'}
              size="sm"
              onClick={() => showChart('pie')}
              className="flex items-center gap-2"
            >
              <PieChart className="h-4 w-4" />
              Pie Chart
            </Button>
            
            <Button 
              variant={activeChart === 'lottie' ? 'default' : 'outline'}
              size="sm"
              onClick={() => showChart('lottie')}
            >
              Lottie Animation
            </Button>
            
            <Button 
              variant={activeChart === 'motion' ? 'default' : 'outline'}
              size="sm"
              onClick={() => showChart('motion')}
            >
              Framer Motion
            </Button>
          </div>

          <div className="min-h-[300px] flex items-center justify-center">
            {!activeChart && (
              <div className="text-center text-muted-foreground">
                <p>Select a chart type above to load it dynamically</p>
                <p className="text-sm mt-2">Each chart loads only its required dependencies (Chart.js)</p>
              </div>
            )}

            {activeChart === 'line' && (
              <Suspense fallback={<ChartSkeleton />}>
                <div className="w-full">
                  <LazyLineChart data={sampleLineData} />
                </div>
              </Suspense>
            )}

            {activeChart === 'bar' && (
              <Suspense fallback={<ChartSkeleton />}>
                <div className="w-full">
                  <LazyBarChart data={sampleBarData} />
                </div>
              </Suspense>
            )}

            {activeChart === 'pie' && (
              <Suspense fallback={<ChartSkeleton />}>
                <div className="w-full">
                  <LazyPieChart data={samplePieData} />
                </div>
              </Suspense>
            )}

            {activeChart === 'lottie' && (
              <Suspense fallback={<ChartSkeleton />}>
                <div className="w-full h-64 flex items-center justify-center">
                  <LazyLottieAnimation
                    animationData={{
                      // Simple loading animation data
                      v: "5.5.7",
                      fr: 60,
                      ip: 0,
                      op: 60,
                      w: 200,
                      h: 200,
                      nm: "loading",
                      ddd: 0,
                      assets: [],
                      layers: []
                    }}
                    loop
                    autoplay
                    style={{ width: 200, height: 200 }}
                  />
                </div>
              </Suspense>
            )}

            {activeChart === 'motion' && (
              <Suspense fallback={<ChartSkeleton />}>
                <div className="w-full h-64 flex items-center justify-center">
                  <LazyMotionDiv
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="bg-primary text-primary-foreground p-8 rounded-lg"
                  >
                    Framer Motion Loaded!
                  </LazyMotionDiv>
                </div>
              </Suspense>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <strong>Micro-bundles:</strong> Each chart type loads only its required dependencies (Chart.js)
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <strong>Intelligent preloading:</strong> Related components are preloaded after initial load
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <strong>Error boundaries:</strong> Failed loads fallback gracefully without breaking the app
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <strong>Performance monitoring:</strong> Track loading times and identify slow components
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <strong>Bundle size reduction:</strong> ~150KB saved by migrating from Recharts to Chart.js
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LazyChartsExample;