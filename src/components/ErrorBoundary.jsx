import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error: error,
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    if (error && error.stack) {
      console.error('Error stack:', error.stack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-state">
          <div className="error-boundary-content">
            <h2>{'Something went wrong'}</h2>
            <p>{'An error occurred while loading this module. The application will continue to function.'}</p>
            {this.state.error && (
              <div className="error-boundary-details">
                <p className="error-boundary-message">{String(this.state.error.message || this.state.error)}</p>
              </div>
            )}
            <button
              onClick={() => this.setState({ hasError: false })}
              className="error-boundary-retry"
              aria-label={ 'Try again' }
            >
              { 'Try again' }
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;