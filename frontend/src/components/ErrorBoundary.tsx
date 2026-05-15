import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 24, background: '#0c0c0e', color: '#e8e8ea' }}>
          <div style={{ maxWidth: 500 }}>
            <h2 style={{ margin: '0 0 8px', color: '#e8b765' }}>Something went wrong</h2>
            <p style={{ color: '#9a9a9f', marginBottom: 16 }}>The dashboard crashed. Details below:</p>
            <pre style={{ background: '#141416', border: '1px solid #232328', padding: 12, borderRadius: 8, fontSize: 12, color: '#ff8a7a', overflow: 'auto', maxHeight: 300 }}>
              {this.state.error?.stack || this.state.error?.message || 'Unknown error'}
            </pre>
            <button
              style={{ marginTop: 16, padding: '8px 16px', borderRadius: 6, background: '#e8b765', color: '#111', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
