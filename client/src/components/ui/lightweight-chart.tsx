"use client"

import * as React from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  ChartOptions,
  TooltipItem,
  ArcElement
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { cn } from "@/lib/utils"

// Register only the components we need
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  Legend
)

export type LightweightChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    color?: string
    backgroundColor?: string
  }
}

type LightweightChartContextProps = {
  config: LightweightChartConfig
}

const LightweightChartContext = React.createContext<LightweightChartContextProps | null>(null)

function useLightweightChart() {
  const context = React.useContext(LightweightChartContext)
  if (!context) {
    throw new Error("useLightweightChart must be used within a <LightweightChartContainer />")
  }
  return context
}

interface LightweightChartContainerProps extends React.ComponentProps<"div"> {
  config: LightweightChartConfig
  children: React.ReactNode
  title?: string
  subtitle?: string
}

const LightweightChartContainer = React.forwardRef<
  HTMLDivElement,
  LightweightChartContainerProps
>(({ className, children, config, title, subtitle, ...props }, ref) => {
  return (
    <LightweightChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        className={cn(
          "flex flex-col space-y-3 p-6 bg-card rounded-lg border",
          className
        )}
        {...props}
      >
        {(title || subtitle) && (
          <div className="space-y-1">
            {title && <h3 className="font-semibold text-lg">{title}</h3>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        )}
        <div className="flex-1 min-h-[200px]">
          {children}
        </div>
      </div>
    </LightweightChartContext.Provider>
  )
})
LightweightChartContainer.displayName = "LightweightChartContainer"

// Common chart options
const getBaseOptions = (isDarkMode = false): ChartOptions<any> => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
      titleColor: isDarkMode ? '#f9fafb' : '#111827',
      bodyColor: isDarkMode ? '#f9fafb' : '#374151',
      borderColor: isDarkMode ? '#374151' : '#e5e7eb',
      borderWidth: 1,
      cornerRadius: 8,
      titleFont: {
        weight: 600,
      },
      padding: 12,
    },
  },
  scales: {
    x: {
      display: true,
      grid: {
        display: false,
      },
      border: {
        display: false,
      },
      ticks: {
        color: isDarkMode ? '#9ca3af' : '#6b7280',
        font: {
          size: 12,
        },
      },
    },
    y: {
      display: true,
      grid: {
        color: isDarkMode ? '#374151' : '#f3f4f6',
      },
      border: {
        display: false,
      },
      ticks: {
        color: isDarkMode ? '#9ca3af' : '#6b7280',
        font: {
          size: 12,
        },
      },
    },
  },
})

// Price Chart Component (replaces Recharts AreaChart)
interface PriceData {
  date: string
  price: number
}

interface LightweightPriceChartProps {
  data: PriceData[]
  color?: string
  className?: string
}

export function LightweightPriceChart({ 
  data, 
  color = "#10b981", 
  className 
}: LightweightPriceChartProps) {
  const isDarkMode = document.documentElement.classList.contains('dark')
  
  const chartData = {
    labels: data.map(d => new Date(d.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })),
    datasets: [
      {
        data: data.map(d => d.price),
        borderColor: color,
        backgroundColor: `${color}15`,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  }

  const options = {
    ...getBaseOptions(isDarkMode),
    plugins: {
      ...getBaseOptions(isDarkMode).plugins,
      tooltip: {
        ...getBaseOptions(isDarkMode).plugins?.tooltip,
        callbacks: {
          label: (context: TooltipItem<'line'>) => `Price: $${context.parsed.y.toFixed(2)}`,
        },
      },
    },
  }

  return (
    <div className={cn("h-full", className)}>
      <Line data={chartData} options={options} />
    </div>
  )
}

// Bar Chart Component (replaces Recharts BarChart)
interface BarData {
  label: string
  value: number
}

interface LightweightBarChartProps {
  data: BarData[]
  color?: string
  className?: string
}

export function LightweightBarChart({ 
  data, 
  color = "#3b82f6", 
  className 
}: LightweightBarChartProps) {
  const isDarkMode = document.documentElement.classList.contains('dark')
  
  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        data: data.map(d => d.value),
        backgroundColor: `${color}80`,
        borderColor: color,
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }

  const options = getBaseOptions(isDarkMode)

  return (
    <div className={cn("h-full", className)}>
      <Bar data={chartData} options={options} />
    </div>
  )
}

// Line Chart Component (replaces Recharts LineChart)
interface LineData {
  label: string
  value: number
}

interface LightweightLineChartProps {
  data: LineData[]
  color?: string
  className?: string
}

export function LightweightLineChart({ 
  data, 
  color = "#ef4444", 
  className 
}: LightweightLineChartProps) {
  const isDarkMode = document.documentElement.classList.contains('dark')
  
  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        data: data.map(d => d.value),
        borderColor: color,
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  }

  const options = getBaseOptions(isDarkMode)

  return (
    <div className={cn("h-full", className)}>
      <Line data={chartData} options={options} />
    </div>
  )
}

// Pie Chart Component (replaces Recharts PieChart)
interface PieData {
  label: string
  value: number
  color?: string
}

interface LightweightPieChartProps {
  data: PieData[]
  className?: string
}

export function LightweightPieChart({ data, className }: LightweightPieChartProps) {
  const isDarkMode = document.documentElement.classList.contains('dark')
  
  const colors = data.map(d => d.color || `hsl(${Math.random() * 360}, 70%, 50%)`)
  
  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        data: data.map(d => d.value),
        backgroundColor: colors,
        borderColor: colors.map(color => color.replace('50%)', '40%)')),
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: isDarkMode ? '#f9fafb' : '#374151',
          font: {
            size: 12,
          },
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        titleColor: isDarkMode ? '#f9fafb' : '#111827',
        bodyColor: isDarkMode ? '#f9fafb' : '#374151',
        borderColor: isDarkMode ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
  }

  return (
    <div className={cn("h-full", className)}>
      <Doughnut data={chartData} options={options} />
    </div>
  )
}

// Mini Chart Component (for cards and smaller spaces)
interface MiniChartProps {
  data: Array<{ value: number }>
  type?: 'line' | 'area'
  color?: string
  height?: number
  className?: string
}

export function LightweightMiniChart({ 
  data, 
  type = 'area', 
  color = "#10b981", 
  height = 40,
  className 
}: MiniChartProps) {
  const chartData = {
    labels: data.map((_, i) => i.toString()),
    datasets: [
      {
        data: data.map(d => d.value),
        borderColor: color,
        backgroundColor: type === 'area' ? `${color}30` : 'transparent',
        fill: type === 'area',
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
  }

  return (
    <div className={cn("", className)} style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  )
}

// Export Recharts-compatible aliases for migration
export const ResponsiveContainer = LightweightChartContainer;
export const BarChart = LightweightBarChart;
export const LineChart = LightweightLineChart;
export const AreaChart = LightweightPriceChart; // Area chart with price styling
export const PieChart = LightweightPieChart;

// Export empty components for unused Recharts elements (avoiding conflicts with chart.js imports)
export const XAxis = () => null;
export const YAxis = () => null;
export const CartesianGrid = () => null;
export const Cell = () => null;
// Note: Tooltip, Legend, Line, Bar, Pie, Area not exported to avoid conflicts with chart.js imports
// Components importing these should use recharts directly or create custom implementations
export const ComposedChart = LightweightLineChart;

export {
  LightweightChartContainer,
  useLightweightChart,
}