import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Unhandled React Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f0f0f',
            color: '#ffffff',
            padding: '2rem',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: '#181818',
              border: '1px solid rgba(229, 9, 20, 0.4)',
              borderRadius: '12px',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(229, 9, 20, 0.2)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(229, 9, 20, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                border: '1px solid rgba(229, 9, 20, 0.3)',
              }}
            >
              <AlertTriangle size={32} color="#e50914" />
            </div>

            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.75rem', color: '#ffffff' }}>
              Something Went Wrong
            </h1>

            <p style={{ color: '#aaaaaa', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.75rem' }}>
              The application encountered an unexpected runtime error. Your Watch Space session or page state can be safely restored by refreshing.
            </p>

            {this.state.error?.message && (
              <div
                style={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderLeft: '3px solid #e50914',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.8rem',
                  color: '#e2e8f0',
                  fontFamily: 'monospace',
                  textAlign: 'left',
                  marginBottom: '1.75rem',
                  wordBreak: 'break-word',
                  maxHeight: '120px',
                  overflowY: 'auto',
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#e50914',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.7rem 1.4rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                <RefreshCw size={16} />
                Try Again
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  padding: '0.7rem 1.4rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                <Home size={16} />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
