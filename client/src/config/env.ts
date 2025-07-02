/**
 * Frontend Environment Configuration
 * 
 * This module provides type-safe access to environment variables
 * and validates that required variables are present.
 * 
 * IMPORTANT: Only VITE_ prefixed variables are accessible in the frontend
 * These variables are exposed in the client-side JavaScript bundle
 */

// Extend the ImportMetaEnv interface to include our custom environment variables
interface ImportMetaEnv {
  // Required variables
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  
  // Optional variables
  readonly VITE_APP_URL?: string
  
  // Vite default variables
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Define the shape of our validated environment
export interface ClientEnv {
  supabase: {
    url: string
    anonKey: string
  }
  app: {
    url: string
    isDev: boolean
    isProd: boolean
  }
}

// List of required environment variables
const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
] as const

// Validate that all required environment variables are present
function validateEnv(): void {
  const missing: string[] = []
  
  for (const varName of REQUIRED_ENV_VARS) {
    if (!import.meta.env[varName]) {
      missing.push(varName)
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file and ensure all required variables are set.`
    )
  }
}

// Get the app URL with fallback for development
function getAppUrl(): string {
  // If VITE_APP_URL is set, use it
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL
  }
  
  // In development, default to localhost
  if (import.meta.env.DEV) {
    return 'http://localhost:5173'
  }
  
  // In production, try to use window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // Fallback
  return ''
}

// Create and export the validated environment configuration
let _env: ClientEnv | null = null

export function getEnv(): ClientEnv {
  // Lazy initialization and caching
  if (_env) {
    return _env
  }
  
  // Validate environment variables
  validateEnv()
  
  // Create the environment configuration
  _env = {
    supabase: {
      url: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
    },
    app: {
      url: getAppUrl(),
      isDev: import.meta.env.DEV,
      isProd: import.meta.env.PROD
    }
  }
  
  // Freeze the object to prevent modifications
  return Object.freeze(_env)
}

// Helper functions for common use cases
export const env = {
  /**
   * Get the full Supabase configuration
   */
  getSupabaseConfig() {
    const { supabase } = getEnv()
    return supabase
  },
  
  /**
   * Get the application URL
   */
  getAppUrl() {
    const { app } = getEnv()
    return app.url
  },
  
  /**
   * Check if running in development mode
   */
  isDev() {
    const { app } = getEnv()
    return app.isDev
  },
  
  /**
   * Check if running in production mode
   */
  isProd() {
    const { app } = getEnv()
    return app.isProd
  },
  
  /**
   * Build a full URL from a path
   */
  buildUrl(path: string) {
    const appUrl = env.getAppUrl()
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${appUrl}${normalizedPath}`
  }
}

// Export type helpers
export type EnvVar = keyof ImportMetaEnv
export type RequiredEnvVar = typeof REQUIRED_ENV_VARS[number]