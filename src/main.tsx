import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './context/LanguageContext';
import './styles/theme.css';
import './styles/washdoor.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Washdoor App ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    try {
      localStorage.removeItem('washdoor_orders_cache');
      localStorage.removeItem('washdoor_customers_cache');
      localStorage.removeItem('washdoor_theme');
      localStorage.removeItem('washdoor_theme_manual');
    } catch {}
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#070e18',
            color: '#cdd9e8',
            fontFamily: "'Inter', sans-serif",
            padding: '20px',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              background: '#0d1829',
              border: '1px solid #1c2e47',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontSize: '38px', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ color: '#fff', fontSize: '18px', margin: '0 0 8px 0' }}>
              Application Recovered From An Error
            </h2>
            <p style={{ fontSize: '13px', color: '#8da2be', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              A temporary issue occurred while rendering. You can reload the page or reset the local cache.
            </p>
            {this.state.error?.message && (
              <pre
                style={{
                  background: '#07101c',
                  border: '1px solid #162438',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '11px',
                  color: '#f87171',
                  textAlign: 'left',
                  overflowX: 'auto',
                  margin: '0 0 16px 0',
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  background: '#0879f9',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ↻ Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  background: '#101d2f',
                  border: '1px solid #203550',
                  color: '#c5d5e8',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Clear Cache &amp; Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
