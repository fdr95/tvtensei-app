import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AuthScreen() {
    const { loginWithEmail, registerWithEmail, loginWithGoogle, loginAsGuest } = useAuth();

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (isLogin) {
                await loginWithEmail(email, password, rememberMe);
            } else {
                await registerWithEmail(email, password, rememberMe);
            }
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already registered.');
            } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
                setError('Invalid credentials. Try again.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password must be at least 6 characters long.');
            } else {
                setError(err.message || 'Authentication failed.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        try {
            await loginWithGoogle(rememberMe);
        } catch (err) {
            setError(err.message || 'Google sign-in failed.');
        }
    };

    const handleGuestLogin = async () => {
        setError('');
        try {
            await loginAsGuest(rememberMe);
        } catch (err) {
            setError(err.message || 'Guest sign-in failed.');
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-surface border border-surfaceLight rounded-2xl shadow-2xl p-8 animate-fade-in">
                <div className="flex justify-center items-center gap-3 mb-8">
                    <div className="bg-primary text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.4)]">
                        <i className="fas fa-play text-xl"></i>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-white">
                        TV<span className="text-primary">Tensei</span>
                    </h1>
                </div>
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                    {isLogin ? 'Welcome back, Otaku' : 'Start your journey'}
                </h2>
                {error && (
                    <div className="bg-primary/20 border border-primary text-white p-3 rounded-lg flex items-center gap-3 mb-6 text-sm">
                        <i className="fas fa-exclamation-triangle text-primary"></i>
                        <p>{error}</p>
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-textMuted mb-1">Email</label>
                        <input 
                            type="email" 
                            required 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            className="w-full bg-background border border-surfaceLight rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-all" 
                            placeholder="you@email.com" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-textMuted mb-1">Password</label>
                        <input 
                            type="password" 
                            required 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            className="w-full bg-background border border-surfaceLight rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-all" 
                            placeholder="Minimum 6 characters" 
                        />
                    </div>
                    <div className="flex items-center">
                        <label className="flex items-center text-sm text-textMuted cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={rememberMe} 
                                onChange={(e) => setRememberMe(e.target.checked)} 
                                className="mr-2 w-4 h-4 accent-primary rounded bg-background" 
                            />
                            <span className="group-hover:text-white transition-colors">Remember me</span>
                        </label>
                    </div>
                    <button 
                        type="submit" 
                        disabled={isLoading} 
                        className="w-full bg-primary hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors mt-6 shadow-[0_0_15px_rgba(229,9,20,0.3)] disabled:opacity-50"
                    >
                        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : (isLogin ? 'Sign In' : 'Register')}
                    </button>
                </form>

                <div className="my-6 flex items-center gap-4">
                    <div className="flex-1 h-px bg-surfaceLight"></div>
                    <span className="text-textMuted text-xs uppercase font-bold tracking-wider">OR</span>
                    <div className="flex-1 h-px bg-surfaceLight"></div>
                </div>
                <div className="space-y-3">
                    <button 
                        onClick={handleGoogleLogin} 
                        type="button"
                        className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <i className="fab fa-google text-blue-500"></i> Continue with Google
                    </button>
                    <button 
                        onClick={handleGuestLogin} 
                        type="button"
                        className="w-full flex items-center justify-center gap-3 bg-surfaceLight text-white font-bold py-3 rounded-lg hover:bg-surfaceLight/80 transition-colors"
                    >
                        <i className="fas fa-user-secret"></i> Continue as Guest
                    </button>
                </div>
                <div className="mt-6 text-center text-sm text-textMuted border-t border-surfaceLight pt-6">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button 
                        onClick={() => { setIsLogin(!isLogin); setError(''); }} 
                        className="text-white hover:text-primary font-bold transition-colors" 
                        type="button"
                    >
                        {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
}
