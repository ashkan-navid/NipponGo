'use client';

import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-ios-gray-100 dark:bg-ios-gray-950 p-4">
                    <div className="bg-white dark:bg-ios-gray-800 rounded-ios-xl shadow-ios p-8 max-w-md w-full text-center">
                        <div className="w-16 h-16 bg-ios-red/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-ios-red" />
                        </div>
                        <h2 className="text-xl font-semibold text-ios-gray-950 dark:text-white mb-2">
                            Etwas ist schiefgelaufen
                        </h2>
                        <p className="text-ios-gray-600 dark:text-ios-gray-400 mb-6">
                            Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
                        </p>
                        <button
                            onClick={this.handleRetry}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-ios-blue text-white rounded-ios-lg font-medium
                         transition-all duration-200 active:scale-95"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Erneut versuchen
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
