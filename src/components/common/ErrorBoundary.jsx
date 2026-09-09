import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) { 
        return { hasError: true, error }; 
    }

    componentDidCatch(error, errorInfo) { 
        console.error("React Error Boundary caught an error:", error, errorInfo);
        this.setState({ errorInfo }); 
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-8 text-center text-white fixed inset-0 z-[9999]">
                    <i className="fas fa-bug text-primary text-6xl mb-6 animate-bounce"></i>
                    <h1 className="text-3xl font-bold mb-4">Oops! The App Crashed.</h1>
                    <p className="text-textMuted mb-6 max-w-lg">We caught an unexpected error. Check the console for more details.</p>
                    <div className="bg-surfaceLight p-4 rounded-xl w-full max-w-3xl overflow-auto text-left text-sm font-mono text-red-400">
                        <strong>{this.state.error && this.state.error.toString()}</strong>
                        <br /><br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </div>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="mt-8 bg-primary hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg shadow-[0_0_15px_rgba(229,9,20,0.4)]"
                    >
                        Reload App
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
