/**
 * Toast Notifications Utility
 * Provides easy-to-use functions for showing user feedback
 */

import { toast } from "@/hooks/use-toast";

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: React.ReactNode;
}

/**
 * Show success toast
 */
export const showSuccess = (message: string, options?: ToastOptions) => {
  return toast({
    title: options?.title || "Success",
    description: message,
    duration: options?.duration || 3000,
    variant: "default",
    action: options?.action,
  });
};

/**
 * Show error toast
 */
export const showError = (error: Error | string, options?: ToastOptions) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return toast({
    title: options?.title || "Error",
    description: errorMessage,
    duration: options?.duration || 5000,
    variant: "destructive",
    action: options?.action,
  });
};

/**
 * Show warning toast
 */
export const showWarning = (message: string, options?: ToastOptions) => {
  return toast({
    title: options?.title || "Warning",
    description: message,
    duration: options?.duration || 4000,
    variant: "default",
    action: options?.action,
    className: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
  });
};

/**
 * Show info toast
 */
export const showInfo = (message: string, options?: ToastOptions) => {
  return toast({
    title: options?.title || "Info",
    description: message,
    duration: options?.duration || 3000,
    variant: "default",
    action: options?.action,
  });
};

/**
 * Show loading toast (returns dismiss function)
 */
export const showLoading = (message: string = "Loading...") => {
  const { id, dismiss } = toast({
    title: "Loading",
    description: message,
    duration: Infinity, // Don't auto-dismiss
    variant: "default",
  });
  
  return {
    id,
    dismiss,
    update: (newMessage: string) => {
      toast({
        id,
        title: "Loading",
        description: newMessage,
        duration: Infinity,
        variant: "default",
      });
    },
  };
};

/**
 * Show promise toast (loading -> success/error)
 */
export async function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading?: string;
    success?: string | ((data: T) => string);
    error?: string | ((error: Error) => string);
  }
): Promise<T> {
  const loadingToast = showLoading(messages.loading || "Processing...");
  
  try {
    const result = await promise;
    loadingToast.dismiss();
    
    const successMessage = typeof messages.success === 'function' 
      ? messages.success(result) 
      : messages.success || "Operation completed successfully";
    
    showSuccess(successMessage);
    return result;
  } catch (error: any) {
    loadingToast.dismiss();
    
    const errorMessage = typeof messages.error === 'function'
      ? messages.error(error)
      : messages.error || error.message || "Operation failed";
    
    showError(errorMessage);
    throw error;
  }
}

/**
 * API Response toast helpers
 */
export const apiToast = {
  /**
   * Show toast based on API response
   */
  fromResponse: (response: Response, successMessage?: string) => {
    if (response.ok) {
      showSuccess(successMessage || "Request successful");
    } else {
      showError(`Request failed: ${response.status} ${response.statusText}`);
    }
  },
  
  /**
   * Handle API call with toast notifications
   */
  async fetch<T>(
    apiCall: () => Promise<T>,
    messages?: {
      loading?: string;
      success?: string;
      error?: string;
    }
  ): Promise<T | null> {
    try {
      return await showPromise(apiCall(), {
        loading: messages?.loading || "Loading...",
        success: messages?.success || "Success",
        error: messages?.error,
      });
    } catch (error) {
      // Error already shown by showPromise
      return null;
    }
  },
};

/**
 * Stock-specific toast messages
 */
export const stockToast = {
  addedToWatchlist: (symbol: string) => 
    showSuccess(`${symbol} added to watchlist`),
  
  removedFromWatchlist: (symbol: string) =>
    showSuccess(`${symbol} removed from watchlist`),
  
  priceAlert: (symbol: string, price: number) =>
    showInfo(`${symbol} has reached $${price.toFixed(2)}`, {
      title: "Price Alert",
      duration: 10000,
    }),
  
  portfolioUpdate: (action: 'bought' | 'sold', symbol: string, shares: number) =>
    showSuccess(`Successfully ${action} ${shares} shares of ${symbol}`),
  
  dataRefreshed: () =>
    showSuccess("Market data refreshed", { duration: 2000 }),
  
  connectionLost: () =>
    showError("Connection to market data lost. Retrying...", {
      title: "Connection Error",
      duration: 5000,
    }),
  
  connectionRestored: () =>
    showSuccess("Connection restored", { duration: 2000 }),
};

/**
 * Form validation toast messages
 */
export const validationToast = {
  required: (fieldName: string) =>
    showWarning(`${fieldName} is required`),
  
  invalid: (fieldName: string, reason?: string) =>
    showWarning(`${fieldName} is invalid${reason ? `: ${reason}` : ''}`),
  
  min: (fieldName: string, min: number) =>
    showWarning(`${fieldName} must be at least ${min}`),
  
  max: (fieldName: string, max: number) =>
    showWarning(`${fieldName} must be no more than ${max}`),
  
  email: () =>
    showWarning("Please enter a valid email address"),
  
  password: () =>
    showWarning("Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number"),
};

/**
 * Authentication toast messages
 */
export const authToast = {
  loginSuccess: (userName?: string) =>
    showSuccess(userName ? `Welcome back, ${userName}!` : "Successfully logged in"),
  
  loginError: (error?: string) =>
    showError(error || "Login failed. Please check your credentials."),
  
  logoutSuccess: () =>
    showSuccess("Successfully logged out"),
  
  sessionExpired: () =>
    showWarning("Your session has expired. Please log in again.", {
      duration: 5000,
    }),
  
  registerSuccess: () =>
    showSuccess("Account created successfully! Please check your email to verify."),
  
  registerError: (error?: string) =>
    showError(error || "Registration failed. Please try again."),
  
  unauthorized: () =>
    showError("You don't have permission to access this resource"),
};

// Export all utilities
export const toastNotifications = {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  promise: showPromise,
  api: apiToast,
  stock: stockToast,
  validation: validationToast,
  auth: authToast,
};