import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    signInAnonymously,
    signOut as fbSignOut, 
    setPersistence, 
    browserLocalPersistence, 
    browserSessionPersistence 
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        if (!auth) {
            setIsAuthReady(true);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    const applyPersistence = async (rememberMe = true) => {
        if (!auth) return;
        try {
            await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        } catch (err) {
            console.error("Persistence error:", err);
        }
    };

    const loginWithEmail = async (email, password, rememberMe) => {
        await applyPersistence(rememberMe);
        return signInWithEmailAndPassword(auth, email, password);
    };

    const registerWithEmail = async (email, password, rememberMe) => {
        await applyPersistence(rememberMe);
        return createUserWithEmailAndPassword(auth, email, password);
    };

    const loginWithGoogle = async (rememberMe = true) => {
        await applyPersistence(rememberMe);
        return signInWithPopup(auth, googleProvider);
    };

    const loginAsGuest = async (rememberMe = false) => {
        await applyPersistence(rememberMe);
        return signInAnonymously(auth);
    };

    const logout = () => {
        if (!auth) return Promise.resolve();
        return fbSignOut(auth);
    };

    return (
        <AuthContext.Provider value={{
            user,
            currentUid: user?.uid,
            isAuthReady,
            isFirebaseConfigured,
            loginWithEmail,
            registerWithEmail,
            loginWithGoogle,
            loginAsGuest,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
