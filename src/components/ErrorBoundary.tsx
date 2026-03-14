import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-f1-dark flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="glass-strong rounded-3xl p-8 md:p-12 text-center border-glow">
              <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-f1-red/20 blur-3xl rounded-full" />
                <div className="relative w-24 h-24 mx-auto bg-f1-red/10 rounded-full flex items-center justify-center animate-pulse-glow">
                  <AlertTriangle size={48} className="text-f1-red" />
                </div>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-orbitron">
                出错了
              </h1>
              
              <p className="text-gray-400 text-lg mb-8">
                抱歉，应用程序遇到了问题。请尝试刷新页面或返回首页。
              </p>

              {this.state.error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8 text-left">
                  <p className="text-red-400 font-mono text-sm mb-2">
                    错误信息：
                  </p>
                  <p className="text-red-300 font-mono text-sm break-all">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={this.handleRefresh}
                  className="flex items-center justify-center space-x-2 bg-f1-red text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-all duration-300 card-hover"
                >
                  <RefreshCw size={20} />
                  <span>刷新页面</span>
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center space-x-2 bg-white/10 text-white px-6 py-3 rounded-xl hover:bg-white/20 transition-all duration-300 card-hover"
                >
                  <Home size={20} />
                  <span>返回首页</span>
                </button>
              </div>

              <p className="text-gray-600 text-sm mt-8">
                如果问题持续存在，请联系技术支持
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
