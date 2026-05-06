import { Component, type ReactNode } from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error("[renderer] uncaught error:", error);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-screen items-center justify-center bg-stone-50 p-8">
          <div className="max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="mb-2 text-base font-semibold text-red-900">
              Something went wrong
            </h2>
            <pre className="overflow-auto whitespace-pre-wrap break-words text-xs text-red-700">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-4 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
