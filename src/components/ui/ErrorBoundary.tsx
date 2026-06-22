"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="glass rounded-xl p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm text-gray-400">這個區塊載入失敗</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 mx-auto transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> 重試
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
