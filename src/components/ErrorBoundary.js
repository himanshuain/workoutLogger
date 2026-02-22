"use client";

import { Component } from "react";
import { useTheme } from "@/context/ThemeContext";

class ErrorBoundaryClass extends Component {
  state = { hasError: false, error: null, errorInfo: null, isExpanded: false };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, isExpanded: false });
  };

  render() {
    const { hasError, error, errorInfo, isExpanded } = this.state;
    const { children, fallback, isDarkMode = false } = this.props;

    if (fallback && hasError) return fallback({ error, errorInfo, retry: this.handleRetry });

    if (!hasError) return children;

    const dark = "bg-iron-900/50 text-iron-100";
    const light = "bg-white text-slate-800 border border-slate-200";
    const btnCls = isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white";

    return (
      <div className="min-h-[200px] flex items-center justify-center p-6">
        <div className={`rounded-2xl p-6 max-w-md w-full ${isDarkMode ? dark : light}`}>
          <div className="flex flex-col items-center text-center">
            <span className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-2xl mb-3">⚠️</span>
            <h3 className={`font-bold text-lg mb-2 ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>Something went wrong</h3>
            <p className={`text-sm mb-4 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}>We hit an unexpected error. You can try again.</p>
            <div className="w-full mb-4 text-left">
              <button
                type="button"
                className={`cursor-pointer text-xs ${isDarkMode ? "text-iron-500 hover:text-iron-400" : "text-slate-500 hover:text-slate-600"}`}
                onClick={() => this.setState({ isExpanded: !isExpanded })}
              >
                {isExpanded ? "Hide" : "Show"} error details
              </button>
              {isExpanded && (
                <pre className={`mt-2 p-3 rounded-lg text-xs overflow-auto max-h-32 ${isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"}`}>
                  {error?.toString?.()}
                  {errorInfo?.componentStack}
                </pre>
              )}
            </div>
            <button onClick={this.handleRetry} className={`px-6 py-2.5 rounded-xl font-semibold ${btnCls}`}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export function ErrorBoundary(props) {
  return <ErrorBoundaryClass {...props} />;
}

export default function ErrorBoundaryWrapper({ children, fallback, ...rest }) {
  const { isDarkMode } = useTheme();
  return (
    <ErrorBoundaryClass isDarkMode={isDarkMode} fallback={fallback} {...rest}>
      {children}
    </ErrorBoundaryClass>
  );
}
