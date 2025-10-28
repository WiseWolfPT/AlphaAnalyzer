import { w as React, j as jsxRuntimeExports, C as Card, a as CardHeader, v as CircleAlert, b as CardTitle, c as CardContent, o as Alert, p as AlertDescription, B as Button, R as RefreshCw, O as House } from "./index-DF734YkB.js";
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.handleRetry = () => {
      this.setState({
        hasError: false,
        error: void 0,
        errorInfo: void 0
      });
    };
    this.handleGoHome = () => {
      window.location.href = "/";
    };
    this.state = {
      hasError: false
    };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });
  }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(FallbackComponent, {
          error: this.state.error,
          retry: this.handleRetry
        });
      }
      return /* @__PURE__ */ jsxRuntimeExports.jsx(DefaultErrorFallback, {
        error: this.state.error,
        retry: this.handleRetry
      });
    }
    return this.props.children;
  }
}
function DefaultErrorFallback({
  error,
  retry
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
    className: "min-h-screen flex items-center justify-center p-4 bg-background",
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      className: "w-full max-w-md",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
        className: "text-center",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
            className: "h-6 w-6 text-red-600"
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
          className: "text-xl",
          children: "Algo correu mal"
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
        className: "space-y-4",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
            className: "h-4 w-4"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, {
            children: "Ocorreu um erro inesperado. Tente recarregar a página ou voltar à página inicial."
          })]
        }), false, /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            variant: "outline",
            onClick: retry,
            className: "flex-1",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, {
              className: "h-4 w-4 mr-2"
            }), "Tentar novamente"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            onClick: () => window.location.href = "/",
            className: "flex-1",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(House, {
              className: "h-4 w-4 mr-2"
            }), "Página inicial"]
          })]
        })]
      })]
    })
  });
}
function useErrorHandler() {
  return (error, errorInfo) => {
  };
}
function withErrorBoundary(Component, fallback) {
  return function WrappedComponent(props) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, {
      fallback,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Component, {
        ...props
      })
    });
  };
}
export {
  DefaultErrorFallback,
  ErrorBoundary,
  useErrorHandler,
  withErrorBoundary
};
