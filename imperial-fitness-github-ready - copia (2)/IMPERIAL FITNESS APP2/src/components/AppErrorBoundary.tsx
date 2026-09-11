import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

interface Props extends React.PropsWithChildren {
  activeTab?: string;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'No pudimos mostrar esta sección en este momento.' };
  }

  componentDidCatch(error: Error) {
    console.error('[Imperial Fitness UI]', error);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.activeTab !== this.props.activeTab) {
      this.setState({ hasError: false, message: '' });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="max-w-3xl mx-auto p-6 md:p-10">
        <div className="rounded-3xl border border-red-900/50 bg-red-950/10 p-8 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-2xl font-black text-white">No pudimos mostrar esta sección</h2>
          <p className="text-sm text-neutral-400">
            Tu progreso está protegido. Actualiza la pantalla e intenta nuevamente.
          </p>
          <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-3 rounded-xl">
            <RefreshCw className="w-4 h-4" /> Recargar
          </button>
        </div>
      </div>
    );
  }
}
