// Error types and interfaces for financial application error handling
export var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "low";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["CRITICAL"] = "critical";
})(ErrorSeverity || (ErrorSeverity = {}));
export var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["NETWORK"] = "network";
    ErrorCategory["API_LIMIT"] = "api_limit";
    ErrorCategory["AUTHENTICATION"] = "authentication";
    ErrorCategory["AUTHORIZATION"] = "authorization";
    ErrorCategory["VALIDATION"] = "validation";
    ErrorCategory["DATA_INTEGRITY"] = "data_integrity";
    ErrorCategory["CALCULATION"] = "calculation";
    ErrorCategory["RATE_LIMIT"] = "rate_limit";
    ErrorCategory["SERVICE_UNAVAILABLE"] = "service_unavailable";
    ErrorCategory["TIMEOUT"] = "timeout";
    ErrorCategory["UNKNOWN"] = "unknown";
})(ErrorCategory || (ErrorCategory = {}));
export var RecoveryStrategy;
(function (RecoveryStrategy) {
    RecoveryStrategy["RETRY"] = "retry";
    RecoveryStrategy["FALLBACK"] = "fallback";
    RecoveryStrategy["CACHE"] = "cache";
    RecoveryStrategy["DEGRADE"] = "degrade";
    RecoveryStrategy["FAIL"] = "fail";
    RecoveryStrategy["IGNORE"] = "ignore";
})(RecoveryStrategy || (RecoveryStrategy = {}));
// User-friendly error messages mapping
export const USER_ERROR_MESSAGES = {
    [ErrorCategory.NETWORK]: {
        [ErrorSeverity.LOW]: 'Connection is slow. Please wait...',
        [ErrorSeverity.MEDIUM]: 'Network issue detected. Retrying...',
        [ErrorSeverity.HIGH]: 'Connection problems. Some features may be limited.',
        [ErrorSeverity.CRITICAL]: 'Unable to connect. Please check your internet connection.'
    },
    [ErrorCategory.API_LIMIT]: {
        [ErrorSeverity.LOW]: 'Data refresh may be delayed.',
        [ErrorSeverity.MEDIUM]: 'API usage approaching limit. Using cached data.',
        [ErrorSeverity.HIGH]: 'Daily API limit reached. Using cached data until tomorrow.',
        [ErrorSeverity.CRITICAL]: 'All API services unavailable. Displaying last known data.'
    },
    [ErrorCategory.AUTHENTICATION]: {
        [ErrorSeverity.LOW]: 'Session will expire soon. Please save your work.',
        [ErrorSeverity.MEDIUM]: 'Please log in again to continue.',
        [ErrorSeverity.HIGH]: 'Authentication failed. Please log in.',
        [ErrorSeverity.CRITICAL]: 'Account access denied. Please contact support.'
    },
    [ErrorCategory.VALIDATION]: {
        [ErrorSeverity.LOW]: 'Please check the highlighted field.',
        [ErrorSeverity.MEDIUM]: 'Some information needs to be corrected.',
        [ErrorSeverity.HIGH]: 'Required information is missing or invalid.',
        [ErrorSeverity.CRITICAL]: 'Cannot process request due to invalid data.'
    },
    [ErrorCategory.DATA_INTEGRITY]: {
        [ErrorSeverity.LOW]: 'Some data may be outdated.',
        [ErrorSeverity.MEDIUM]: 'Data inconsistency detected. Refreshing...',
        [ErrorSeverity.HIGH]: 'Data integrity issue. Using alternative source.',
        [ErrorSeverity.CRITICAL]: 'Critical data corruption. Please contact support.'
    },
    [ErrorCategory.CALCULATION]: {
        [ErrorSeverity.LOW]: 'Calculation warning. Please review inputs.',
        [ErrorSeverity.MEDIUM]: 'Calculation completed with assumptions.',
        [ErrorSeverity.HIGH]: 'Cannot calculate with current inputs.',
        [ErrorSeverity.CRITICAL]: 'Calculation error. Results may be unreliable.'
    },
    [ErrorCategory.RATE_LIMIT]: {
        [ErrorSeverity.LOW]: 'Request rate is high. Slowing down...',
        [ErrorSeverity.MEDIUM]: 'Rate limit approaching. Please wait...',
        [ErrorSeverity.HIGH]: 'Rate limit exceeded. Retrying in a moment...',
        [ErrorSeverity.CRITICAL]: 'Too many requests. Please wait before trying again.'
    },
    [ErrorCategory.SERVICE_UNAVAILABLE]: {
        [ErrorSeverity.LOW]: 'Service temporarily slow.',
        [ErrorSeverity.MEDIUM]: 'Service experiencing issues. Using backup.',
        [ErrorSeverity.HIGH]: 'Service unavailable. Limited functionality.',
        [ErrorSeverity.CRITICAL]: 'All services down. Please try again later.'
    },
    [ErrorCategory.TIMEOUT]: {
        [ErrorSeverity.LOW]: 'Request taking longer than usual...',
        [ErrorSeverity.MEDIUM]: 'Request timeout. Retrying...',
        [ErrorSeverity.HIGH]: 'Connection timeout. Please try again.',
        [ErrorSeverity.CRITICAL]: 'Server not responding. Please check connection.'
    },
    [ErrorCategory.AUTHORIZATION]: {
        [ErrorSeverity.LOW]: 'Limited access to this feature.',
        [ErrorSeverity.MEDIUM]: 'Insufficient permissions. Contact administrator.',
        [ErrorSeverity.HIGH]: 'Access denied. Please check your subscription.',
        [ErrorSeverity.CRITICAL]: 'Account suspended. Contact support immediately.'
    },
    [ErrorCategory.UNKNOWN]: {
        [ErrorSeverity.LOW]: 'Minor issue detected.',
        [ErrorSeverity.MEDIUM]: 'Unexpected issue. Please try again.',
        [ErrorSeverity.HIGH]: 'System error. Attempting recovery...',
        [ErrorSeverity.CRITICAL]: 'Critical system error. Please contact support.'
    }
};
