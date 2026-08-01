import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import Papa from 'papaparse';

import { initializeApp } from "firebase/app";
import { 
    getAuth, onAuthStateChanged, createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, signInWithPopup, signInAnonymously,
    GoogleAuthProvider, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence
} from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot, writeBatch } from "firebase/firestore";

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY; 
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_URL = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_URL = 'https://image.tmdb.org/t/p/w1280';

// Safe Firebase Initialization to prevent Black Screen of Death
let app, auth, db;
let isFirebaseConfigured = false;

try {
    const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
    
    if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        isFirebaseConfigured = true;
    }
} catch (error) {
    console.error("Firebase Initialization Error:", error);
}

const googleProvider = new GoogleAuthProvider();

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
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
                    <button onClick={() => window.location.reload()} className="mt-8 bg-primary hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg shadow-[0_0_15px_rgba(229,9,20,0.4)]">
                        Reload App
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const getYear = (dateString) => (typeof dateString === 'string' && dateString.length >= 4) ? dateString.substring(0, 4) : "";
const formatRating = (rating) => !isNaN(parseFloat(rating)) ? parseFloat(rating).toFixed(1) : "0.0";

const AuthScreen = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);

    const applyPersistence = async () => {
        try { await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence); } 
        catch (err) { console.error("Persistence error:", err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setError(''); setIsLoading(true);
        try {
            await applyPersistence();
            if (isLogin) await signInWithEmailAndPassword(auth, email, password);
            else await createUserWithEmailAndPassword(auth, email, password);
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') setError('This email is already registered.');
            else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') setError('Invalid credentials. Try again.');
            else if (err.code === 'auth/weak-password') setError('Password must be at least 6 characters long.');
            else setError(err.message);
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        try { await applyPersistence(); await signInWithPopup(auth, googleProvider); } 
        catch (err) { setError(err.message); }
    };

    const handleGuestLogin = async () => {
        setError('');
        try { await applyPersistence(); await signInAnonymously(auth); } 
        catch (err) { setError(err.message); }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-surface border border-surfaceLight rounded-2xl shadow-2xl p-8 animate-fade-in">
                <div className="flex justify-center items-center gap-3 mb-8">
                    <div className="bg-primary text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.4)]">
                        <i className="fas fa-play text-xl"></i>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-white">TV<span className="text-primary">Tensei</span></h1>
                </div>
                <h2 className="text-2xl font-bold text-white mb-6 text-center">{isLogin ? 'Welcome back, Otaku' : 'Start your journey'}</h2>
                {error && <div className="bg-primary/20 border border-primary text-white p-3 rounded-lg flex items-center gap-3 mb-6 text-sm"><i className="fas fa-exclamation-triangle text-primary"></i><p>{error}</p></div>}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-textMuted mb-1">Email</label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-background border border-surfaceLight rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-all" placeholder="you@email.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-textMuted mb-1">Password</label>
                        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-background border border-surfaceLight rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-all" placeholder="Minimum 6 characters" />
                    </div>
                    <div className="flex items-center">
                        <label className="flex items-center text-sm text-textMuted cursor-pointer group">
                            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="mr-2 w-4 h-4 accent-primary rounded bg-background" />
                            <span className="group-hover:text-white transition-colors">Remember me</span>
                        </label>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors mt-6 shadow-[0_0_15px_rgba(229,9,20,0.3)] disabled:opacity-50">
                        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : (isLogin ? 'Sign In' : 'Register')}
                    </button>
                </form>

                <div className="my-6 flex items-center gap-4"><div className="flex-1 h-px bg-surfaceLight"></div><span className="text-textMuted text-xs uppercase font-bold tracking-wider">OR</span><div className="flex-1 h-px bg-surfaceLight"></div></div>
                <div className="space-y-3">
                    <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors"><i className="fab fa-google text-blue-500"></i> Continue with Google</button>
                    <button onClick={handleGuestLogin} className="w-full flex items-center justify-center gap-3 bg-surfaceLight text-white font-bold py-3 rounded-lg hover:bg-surfaceLight/80 transition-colors"><i className="fas fa-user-secret"></i> Continue as Guest</button>
                </div>
                <div className="mt-6 text-center text-sm text-textMuted border-t border-surfaceLight pt-6">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-white hover:text-primary font-bold transition-colors" type="button">{isLogin ? 'Sign up' : 'Sign in'}</button>
                </div>
            </div>
        </div>
    );
};

const NavItem = ({ id, icon, label, activeTab, setActiveTab }) => {
    const isActive = activeTab === id;
    return (
        <button onClick={() => setActiveTab(id)} className={`flex flex-col md:flex-row items-center justify-center md:justify-start w-full md:w-auto py-3 md:py-4 md:px-6 gap-1 md:gap-4 transition-all duration-300 ${isActive ? 'text-white md:border-r-4 border-primary bg-surfaceLight/30 md:bg-transparent' : 'text-textMuted hover:text-white hover:bg-surfaceLight/20 md:hover:bg-transparent'}`}>
            <i className={`fas fa-${icon} text-xl md:text-2xl ${isActive ? 'text-primary scale-110' : ''} transition-all`}></i>
            <span className={`text-[10px] md:text-base font-medium mt-1 md:mt-0 ${isActive ? 'text-primary' : ''}`}>{label}</span>
        </button>
    );
};

const MediaCard = ({ item, openModal, isSaved, additionalUI }) => {
    const title = item.name || item.title || "Unknown";
    const year = getYear(item.first_air_date || item.release_date);
    return (
        <div onClick={() => openModal(item)} className="cursor-pointer group relative aspect-[2/3] bg-surfaceLight/30 rounded-xl border border-surfaceLight overflow-hidden transition-transform duration-300 hover:scale-105 hover:border-primary/50 shadow-md">
            {item.poster_path ? (
                <img src={`${TMDB_IMG_URL}${item.poster_path}`} alt={title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                    <i className="fas fa-image text-4xl text-surfaceLight mb-3"></i>
                    <span className="text-xs font-bold text-textMuted line-clamp-3">{title}</span>
                </div>
            )}
            {isSaved && <div className="absolute top-2 right-2 bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-black/50 z-10"><i className="fas fa-bookmark text-sm"></i></div>}
            {additionalUI}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                <span className="text-white font-bold text-sm line-clamp-2">{title}</span>
                {year && <span className="text-primary text-xs font-medium">{year}</span>}
            </div>
        </div>
    );
};

const ShowListRow = ({ show, openShowModal }) => (
    <div onClick={() => openShowModal(show)} className="flex items-center gap-4 bg-surfaceLight/10 hover:bg-surfaceLight/30 border border-surfaceLight/50 rounded-xl p-3 cursor-pointer transition-all group">
        <div className="w-12 h-16 md:w-16 md:h-24 flex-shrink-0 bg-surface rounded-md overflow-hidden shadow-md relative">
            {show.poster_path ? (
                <img src={`${TMDB_IMG_URL}${show.poster_path}`} alt={show.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
            ) : (
                <div className="w-full h-full flex items-center justify-center"><i className="fas fa-tv text-textMuted"></i></div>
            )}
        </div>
        <div className="flex-1 min-w-0">
            <h4 className="text-white font-bold text-sm md:text-lg truncate">
                {show.name}
                {show.hidden_from_watch_next && <i className="fas fa-eye-slash text-orange-500 ml-2 text-xs" title="Tracking Stopped"></i>}
            </h4>
            <div className="mt-1 md:mt-2">
                <div className="flex items-center gap-2 mb-1">
                    {show.status === 'completed' && <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded border border-green-400/20">Completed</span>}
                    {show.status === 'upToDate' && <span className="text-xs font-bold text-purple-400 bg-purple-400/10 px-2 py-1 rounded border border-purple-400/20">Up to Date</span>}
                    {show.status === 'toStart' && <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded border border-blue-400/20">Watchlist</span>}
                </div>
                {(show.status === 'inProgress' || show.status === 'upToDate') && (
                    <div className="flex flex-col gap-1 w-full max-w-xs mt-1">
                        <div className="flex justify-between text-xs text-textMuted">
                            <span>Progress</span>
                            <span>{show.watched_count} / {show.total_episodes || "?"}</span>
                        </div>
                        <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                            <div className={`h-full transition-all ${show.status === 'upToDate' ? 'bg-purple-500' : 'bg-primary'}`} style={{ width: `${show.total_episodes ? Math.min(100, (show.watched_count / show.total_episodes) * 100) : 10}%` }}></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
        <div className="px-4 text-textMuted font-bold hidden md:block">
            {show.rating > 0 ? <span className="text-yellow-500"><i className="fas fa-star text-xs"></i> {show.rating}</span> : <span className="text-surfaceLight">-</span>}
        </div>
        <div className="px-2 text-textMuted group-hover:text-white transition-colors"><i className="fas fa-chevron-right"></i></div>
    </div>
);

const MainApp = () => {
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    
    // Navigation
    const [activeTab, setActiveTab] = useState('watch-next'); // Home
    const [movieTab, setMovieTab] = useState('toWatch');
    
    // Settings
    const [modalDefaultFS, setModalDefaultFS] = useState(() => localStorage.getItem('tvtensei_fs_modal') === 'true');
    const [isFullscreen, setIsFullscreen] = useState(modalDefaultFS);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Core Data States
    const [savedShowsData, setSavedShowsData] = useState([]);
    const [watchedEpisodesData, setWatchedEpisodesData] = useState([]);
    const [savedMoviesData, setSavedMoviesData] = useState([]);

    // Derived State (History & Watch Next)
    const [historyShows, setHistoryShows] = useState([]);
    const [watchNextList, setWatchNextList] = useState([]);
    const [isLoadingWatchNext, setIsLoadingWatchNext] = useState(false);
    const [upcomingEpisodes, setUpcomingEpisodes] = useState([]);
    const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

    // History Filters
    const [historyViewMode, setHistoryViewMode] = useState('list'); 
    const [historySortBy, setHistorySortBy] = useState('recent'); 
    const [historySortDesc, setHistorySortDesc] = useState(true);
    const [historyFilterStatus, setHistoryFilterStatus] = useState('inProgress'); // Default filter

    // Discover & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Modals
    const [selectedShow, setSelectedShow] = useState(null);
    const [showDetails, setShowDetails] = useState(null);
    const [expandedSeason, setExpandedSeason] = useState(null);
    const [seasonEpisodes, setSeasonEpisodes] = useState({});
    
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [movieDetails, setMovieDetails] = useState(null);

    // Stats & Import
    const [stats, setStats] = useState({ months: 0, days: 0, hours: 0, totalMins: 0, topShows: [] });
    const [isCalculatingStats, setIsCalculatingStats] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState("");

    const currentUid = user?.uid;

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!currentUid) { setSavedShowsData([]); setWatchedEpisodesData([]); setSavedMoviesData([]); return; }
        const unsubShows = onSnapshot(collection(db, 'users', currentUid, 'shows'), (snap) => setSavedShowsData(snap.docs.map(d => ({ id: Number(d.id), ...d.data() }))));
        const unsubEps = onSnapshot(collection(db, 'users', currentUid, 'watched_episodes'), (snap) => setWatchedEpisodesData(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubMovies = onSnapshot(collection(db, 'users', currentUid, 'movies'), (snap) => setSavedMoviesData(snap.docs.map(d => ({ id: Number(d.id), ...d.data() }))));
        return () => { unsubShows(); unsubEps(); unsubMovies(); };
    }, [currentUid]);

    // Helpers
    const isShowSaved = (id) => savedShowsData.some(s => s.id === id);
    const isShowHidden = (id) => savedShowsData.find(s => s.id === id)?.hidden_from_watch_next === true;
    const isMovieSaved = (id) => savedMoviesData.some(m => m.id === id);
    const getWatchedEpisodeData = (showId, sNum, eNum) => watchedEpisodesData.find(w => w.show_id === showId && w.season_number === sNum && w.episode_number === eNum);

    // Process History Data
    useEffect(() => {
        const flatShows = [];
        const showCounts = {};
        const showLastWatched = {};

        watchedEpisodesData.forEach(ep => {
            showCounts[ep.show_id] = (showCounts[ep.show_id] || 0) + 1;
            if (!showLastWatched[ep.show_id] || new Date(ep.watched_at) > new Date(showLastWatched[ep.show_id])) {
                showLastWatched[ep.show_id] = ep.watched_at;
            }
        });

        for (let show of savedShowsData) {
            const count = showCounts[show.id] || 0;
            const s = { ...show, watched_count: count };

            s.last_watched_at = showLastWatched[show.id] || show.added_at || 0;
            s.year = show.first_air_date ? parseInt(show.first_air_date.substring(0, 4)) : 0;

            if (count === 0) {
                s.status = 'toStart';
            } else {
                let totalEps = s.total_episodes || 9999;
                let isEnded = ['Ended', 'Canceled'].includes(s.show_status);
                
                if (count >= totalEps) s.status = isEnded ? 'completed' : 'upToDate';
                else s.status = 'inProgress';
            }
            
            s.progressPercentage = s.total_episodes ? Math.min(100, (s.watched_count / s.total_episodes) * 100) : 0;
            flatShows.push(s);
        }
        setHistoryShows(flatShows);
    }, [savedShowsData, watchedEpisodesData]);

    // Watch Next Queue Algorithm
    useEffect(() => {
        let isMounted = true;
        const buildWatchNext = async () => {
            if (activeTab !== 'watch-next' || historyShows.length === 0) return;
            setIsLoadingWatchNext(true);
            const queue = [];
            
            const today = new Date(); today.setHours(0,0,0,0);
            const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
            
            // FILTRA SOLO IN PROGRESS E NON NASCOSTI
            const inProgressShows = historyShows.filter(s => s.status === 'inProgress' && !s.hidden_from_watch_next);

                for (let i = 0; i < inProgressShows.length; i += 5) {
                    const chunk = inProgressShows.slice(i, i + 5);
                    const promises = chunk.map(async (show) => {
                        const watchedEps = watchedEpisodesData.filter(ep => ep.show_id === show.id);
                        if (watchedEps.length === 0) return null; 
                        
                        let highest = watchedEps.reduce((prev, curr) => {
                            if (curr.season_number > prev.season_number) return curr;
                            if (curr.season_number === prev.season_number && curr.episode_number > prev.episode_number) return curr;
                            return prev;
                        });

                        let targetSeason = parseInt(highest.season_number, 10);
                        let nextEpInfo = null;

                        try {
                            // 1. Cerca il primo episodio successivo DISPONIBILE nella stessa stagione (ignora buchi di numerazione)
                            let res = await fetch(`${TMDB_BASE_URL}/tv/${show.id}/season/${targetSeason}?api_key=${TMDB_API_KEY}`);
                            if (res.ok) {
                                let data = await res.json();
                                if (data.episodes) {
                                    const upcomingInSeason = data.episodes.filter(e => e.episode_number > highest.episode_number);
                                    if (upcomingInSeason.length > 0) {
                                        upcomingInSeason.sort((a,b) => a.episode_number - b.episode_number);
                                        nextEpInfo = upcomingInSeason[0];
                                    }
                                }
                            }

                            // 2. Se la stagione è finita, cerca il primo episodio della prossima stagione valida (scansionando fino a 3 stagioni avanti)
                            if (!nextEpInfo) {
                                for (let i = 1; i <= 3; i++) {
                                    let nextSeasonNum = targetSeason + i;
                                    let resNext = await fetch(`${TMDB_BASE_URL}/tv/${show.id}/season/${nextSeasonNum}?api_key=${TMDB_API_KEY}`);
                                    if (resNext.ok) {
                                        let dataNext = await resNext.json();
                                        if (dataNext.episodes && dataNext.episodes.length > 0) {
                                            dataNext.episodes.sort((a,b) => a.episode_number - b.episode_number);
                                            nextEpInfo = dataNext.episodes[0]; // Prende il primo della lista, a prescindere dalla numerazione di TMDB
                                            break;
                                        }
                                    }
                                }
                            }

                            if (nextEpInfo && nextEpInfo.air_date) {
                                const airDateObj = new Date(nextEpInfo.air_date);
                                airDateObj.setHours(0,0,0,0);
                            
                            if (airDateObj <= tomorrow) {
                                let stateText = '';
                                let isLocked = false;
                                
                                if (airDateObj.getTime() === today.getTime()) { stateText = 'Airs Today'; isLocked = true; } 
                                else if (airDateObj.getTime() === tomorrow.getTime()) { stateText = 'Airs Tomorrow'; isLocked = true; }

                                return { show, episode: nextEpInfo, stateText, isLocked };
                            }
                        }
                    } catch(e) {}
                    return null;
                });
                
                const chunkResults = await Promise.all(promises);
                queue.push(...chunkResults.filter(Boolean));
                await new Promise(r => setTimeout(r, 100)); // anti 429
            }
            
            queue.sort((a,b) => new Date(b.episode.air_date) - new Date(a.episode.air_date));
            if(isMounted) { setWatchNextList(queue); setIsLoadingWatchNext(false); }
        };
        
        buildWatchNext();
        return () => { isMounted = false; };
    }, [activeTab, historyShows, watchedEpisodesData]);

    // Calendar & Silent Sync Logic
    useEffect(() => {
        const fetchUpcomingAndSync = async () => {
            if (savedShowsData.length === 0) { setUpcomingEpisodes([]); return; }
            setIsLoadingCalendar(true);
            try {
                const results = [];
                // Only sync shows that are active to save API calls
                const activeShows = savedShowsData.filter(s => !['Ended', 'Canceled'].includes(s.show_status));
                
                for (let i = 0; i < activeShows.length; i += 10) {
                    const chunk = activeShows.slice(i, i + 10);
                    const promises = chunk.map(async (show) => {
                        const res = await fetch(`${TMDB_BASE_URL}/tv/${show.id}?api_key=${TMDB_API_KEY}&language=en-US`);
                        if (res.ok) {
                            const data = await res.json();
                            // Silent Sync
                            if (currentUid && (data.number_of_episodes !== show.total_episodes || data.status !== show.show_status)) {
                                setDoc(doc(db, 'users', currentUid, 'shows', show.id.toString()), { total_episodes: data.number_of_episodes || null, show_status: data.status || null }, { merge: true });
                            }
                            if (data.next_episode_to_air) {
                                return { showId: data.id, showName: data.name, posterPath: data.poster_path, episode: data.next_episode_to_air };
                            }
                        }
                        return null;
                    });
                    const chunkResults = await Promise.all(promises);
                    results.push(...chunkResults.filter(Boolean));
                    await new Promise(r => setTimeout(r, 200));
                }
                
                const today = new Date(); today.setHours(0,0,0,0);
                const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
                
                const calendarEps = results.filter(item => {
                    const airDate = new Date(item.episode.air_date); airDate.setHours(0,0,0,0);
                    return airDate > tomorrow;
                });
                calendarEps.sort((a,b) => new Date(a.episode.air_date) - new Date(b.episode.air_date));
                setUpcomingEpisodes(calendarEps);
            } catch (error) {} finally { setIsLoadingCalendar(false); }
        };
        
        const t = setTimeout(fetchUpcomingAndSync, 2000); // delay to let watch-next run first
        return () => clearTimeout(t);
    }, [savedShowsData, currentUid]);

    // Statistics Calculation
    useEffect(() => {
        const calculateStats = async () => {
            if (watchedEpisodesData.length === 0) { setStats({ months: 0, days: 0, hours: 0, totalMins: 0, topShows: [] }); return; }
            setIsCalculatingStats(true);
            try {
                let totalMins = 0; const showWatchTime = {}; const missingRuntimeShows = new Set();
                watchedEpisodesData.forEach(ep => { if (!ep.runtime) missingRuntimeShows.add(ep.show_id); });
                const avgRuntimes = {};
                for (let showId of missingRuntimeShows) {
                    try {
                        const res = await fetch(`${TMDB_BASE_URL}/tv/${showId}?api_key=${TMDB_API_KEY}&language=en-US`);
                        const data = await res.json();
                        avgRuntimes[showId] = (data.episode_run_time && data.episode_run_time.length > 0) ? data.episode_run_time[0] : (data.last_episode_to_air?.runtime || 45); 
                    } catch (e) { avgRuntimes[showId] = 45; }
                }
                watchedEpisodesData.forEach(ep => {
                    const rt = ep.runtime || avgRuntimes[ep.show_id] || 45;
                    totalMins += rt; showWatchTime[ep.show_id] = (showWatchTime[ep.show_id] || 0) + rt;
                });
                const minsInHour = 60, minsInDay = 24 * 60, minsInMonth = 30 * 24 * 60;
                const months = Math.floor(totalMins / minsInMonth); let remainder = totalMins % minsInMonth;
                const days = Math.floor(remainder / minsInDay); remainder = remainder % minsInDay;
                const hours = Math.floor(remainder / minsInHour);
                const topShows = Object.entries(showWatchTime).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([id, time]) => {
                    const show = savedShowsData.find(s => s.id === Number(id)); return { name: show ? show.name : `Show ID: ${id}`, time };
                });
                setStats({ months, days, hours, totalMins, topShows });
            } catch (e) {} finally { setIsCalculatingStats(false); }
        };
        const timeoutId = setTimeout(calculateStats, 1000); return () => clearTimeout(timeoutId);
    }, [watchedEpisodesData, savedShowsData]);

    useEffect(() => {
        const delay = setTimeout(() => {
            if (activeTab === 'search' && searchQuery.trim().length >= 2) {
                setIsSearching(true);
                fetch(`${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}`)
                    .then(res => res.json())
                    .then(data => setSearchResults(data.results || []))
                    .finally(() => setIsSearching(false));
            } else { setSearchResults([]); }
        }, 600);
        return () => clearTimeout(delay);
    }, [searchQuery, activeTab]);

    const filteredAndSortedHistory = [...historyShows]
        .filter(show => historyFilterStatus === 'all' || show.status === historyFilterStatus)
        .sort((a, b) => {
            let res = 0;
            if (historySortBy === 'recent') res = new Date(a.last_watched_at || 0) - new Date(b.last_watched_at || 0);
            else if (historySortBy === 'added_at') res = new Date(a.added_at || 0) - new Date(b.added_at || 0);
            else if (historySortBy === 'name') res = (a.name || "").localeCompare(b.name || "");
            else if (historySortBy === 'rating') res = (a.rating || 0) - (b.rating || 0);
            else if (historySortBy === 'progress') res = (a.progressPercentage || 0) - (b.progressPercentage || 0);
            else if (historySortBy === 'year') res = (a.year || 0) - (b.year || 0);
            return historySortDesc ? -res : res;
        });

    const toggleLibraryShow = async (show) => {
        if(!currentUid) return;
        const docRef = doc(db, 'users', currentUid, 'shows', show.id.toString());
        try {
            if (isShowSaved(show.id)) {
                // FIXED: Delete only the show document. KEEP watched episodes history intact!
                await deleteDoc(docRef);
            } else {
                await setDoc(docRef, { name: show.name, poster_path: show.poster_path || null, added_at: new Date().toISOString(), rating: 0, total_episodes: showDetails?.number_of_episodes || show.number_of_episodes || null, show_status: showDetails?.status || show.status || null, first_air_date: showDetails?.first_air_date || show.first_air_date || null, hidden_from_watch_next: false });
            }
        } catch (e) { console.error(e) }
    };

    // FUNZIONE PER NASCONDERE DAL WATCH NEXT
    const toggleHideShow = async (showId) => {
        if (!currentUid) return;
        try {
            const currentStatus = isShowHidden(showId);
            await setDoc(doc(db, 'users', currentUid, 'shows', showId.toString()), { hidden_from_watch_next: !currentStatus }, { merge: true });
        } catch (e) { console.error(e) }
    };

    const toggleWatchedEpisode = async (ep, showId, optionalShowDetails = null) => {
        if(!currentUid) return;
        const existing = getWatchedEpisodeData(showId, ep.season_number, ep.episode_number);
        try {
            if (existing) {
                await deleteDoc(doc(db, 'users', currentUid, 'watched_episodes', existing.id));
            } else {
                await setDoc(doc(db, 'users', currentUid, 'watched_episodes', ep.id.toString()), { show_id: showId, season_number: ep.season_number, episode_number: ep.episode_number, runtime: ep.runtime || 0, watched_at: new Date().toISOString() });
                
                const showUpdateData = {
                    name: selectedShow?.name || showDetails?.name || optionalShowDetails?.name || "Unknown", 
                    poster_path: selectedShow?.poster_path || showDetails?.poster_path || optionalShowDetails?.poster_path || null,
                    total_episodes: showDetails?.number_of_episodes || selectedShow?.number_of_episodes || optionalShowDetails?.total_episodes || null, 
                    show_status: showDetails?.status || optionalShowDetails?.show_status || null, 
                    first_air_date: showDetails?.first_air_date || selectedShow?.first_air_date || optionalShowDetails?.first_air_date || null,
                    hidden_from_watch_next: false // AUTO UN-HIDE WHEN WATCHING A NEW EPISODE
                };
                
                if (!isShowSaved(showId)) {
                    showUpdateData.added_at = new Date().toISOString();
                    showUpdateData.rating = 0;
                }
                
                await setDoc(doc(db, 'users', currentUid, 'shows', showId.toString()), showUpdateData, { merge: true });
            }
        } catch (e) { console.error(e) }
    };

    // TV Time Import Logic
    const handleZipImport = async (event) => {
        const file = event.target.files[0];
        if (!file || !currentUid) return;

        setIsImporting(true); setImportStatus("Scanning ZIP archive...");

        try {
            const zip = new JSZip();
            const contents = await zip.loadAsync(file);
            
            const extractedData = { followedShows: new Set(), seenEpisodes: new Map(), filesScanned: [] };
            const showNameKeys = ['tv_show_name', 'series_name', 'show_name', 'name', 'tvshow'];
            const seasonKeys = ['episode_season_number', 'season_number', 'season'];
            const episodeKeys = ['episode_number', 'episode', 'ep_number'];

            for (const [filename, zipEntry] of Object.entries(contents.files)) {
                if (zipEntry.dir || filename.includes('__MACOSX') || !filename.toLowerCase().endsWith('.csv')) continue;
                extractedData.filesScanned.push(filename);
                setImportStatus(`Analyzing file: ${filename}...`);

                let csvText = await zipEntry.async("text");
                csvText = csvText.replace(/^\uFEFF/, ''); 

                const parsed = await new Promise((resolve, reject) => {
                    Papa.parse(csvText, { header: true, skipEmptyLines: 'greedy', transformHeader: h => h.replace(/["'\\]/g, '').trim().toLowerCase(), complete: (res) => resolve(res.data), error: (err) => reject(err) });
                });

                if (!parsed || parsed.length === 0) continue;

                const headers = Object.keys(parsed[0]);
                const showKey = headers.find(h => showNameKeys.includes(h)) || headers.find(h => h.includes('show') || h.includes('name'));
                const seasonKey = headers.find(h => seasonKeys.includes(h)) || headers.find(h => h.includes('season') && !h.includes('id'));
                const epKey = headers.find(h => episodeKeys.includes(h)) || headers.find(h => h.includes('episode') && !h.includes('season') && !h.includes('id'));

                for (const row of parsed) {
                    let showName = showKey ? row[showKey] : null;
                    if (!showName) continue;
                    showName = showName.trim();
                    extractedData.followedShows.add(showName); 

                    if (seasonKey && epKey) {
                        let seasonNum = parseInt(row[seasonKey], 10);
                        let epNum = parseInt(row[epKey], 10);
                        if (!isNaN(seasonNum) && !isNaN(epNum)) {
                            let compositeKey = `${showName}-S${seasonNum}E${epNum}`;
                            if (!extractedData.seenEpisodes.has(compositeKey)) extractedData.seenEpisodes.set(compositeKey, { showName, seasonNum, epNum });
                        }
                    }
                }
            }

            const uniqueShowsArray = Array.from(extractedData.followedShows);
            const seenEpisodesArray = Array.from(extractedData.seenEpisodes.values());

            if (uniqueShowsArray.length === 0 && seenEpisodesArray.length === 0) throw new Error("CSV files read successfully, but no valid shows or episodes were found.");

            setImportStatus(`Found ${uniqueShowsArray.length} unique shows. Searching TMDB...`);

            const showIdMap = new Map();
            let processed = 0;
            
            for (const showName of uniqueShowsArray) {
                processed++;
                if (processed % 5 === 0) setImportStatus(`Syncing TMDB: ${processed}/${uniqueShowsArray.length} shows...`);
                
                let cleanName = showName.replace(/\s\(\d{4}\)$/, '').trim(); 
                try {
                    let res = await fetch(`${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanName)}&language=en-US`);
                    let data = await res.json();
                    if (data.results && data.results.length > 0) showIdMap.set(showName, data.results[0]);
                    else if (cleanName.includes(':')) {
                        res = await fetch(`${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanName.split(':')[0])}&language=en-US`);
                        data = await res.json();
                        if (data.results && data.results.length > 0) showIdMap.set(showName, data.results[0]);
                    }
                } catch (e) {}
                await new Promise(r => setTimeout(r, 100));
            }

            setImportStatus(`Saving to Firebase...`);
            let batch = writeBatch(db);
            let batchCount = 0;
            let totalShowsImported = 0;
            let totalEpsImported = 0;

            for (const showName of uniqueShowsArray) {
                let foundShow = showIdMap.get(showName);
                if (foundShow) {
                    let totalEps = null;
                    let showStatus = null;
                    try {
                        let resDetail = await fetch(`${TMDB_BASE_URL}/tv/${foundShow.id}?api_key=${TMDB_API_KEY}&language=en-US`);
                        let dataDetail = await resDetail.json();
                        totalEps = dataDetail.number_of_episodes;
                        showStatus = dataDetail.status;
                    } catch(e){}

                    batch.set(doc(db, 'users', currentUid, 'shows', foundShow.id.toString()), { name: foundShow.name, poster_path: foundShow.poster_path || null, added_at: new Date().toISOString(), rating: 0, total_episodes: totalEps || null, show_status: showStatus || null, hidden_from_watch_next: false }, { merge: true });
                    batchCount++; totalShowsImported++;
                    if (batchCount >= 400) { await batch.commit(); batch = writeBatch(db); batchCount = 0; }
                }
            }

            for (const ep of seenEpisodesArray) {
                let foundShow = showIdMap.get(ep.showName);
                if (foundShow) {
                    const compositeId = `${foundShow.id}_S${ep.seasonNum}E${ep.epNum}`;
                    batch.set(doc(db, 'users', currentUid, 'watched_episodes', compositeId), { show_id: foundShow.id, season_number: ep.seasonNum, episode_number: ep.epNum, runtime: 0, watched_at: new Date().toISOString() }, { merge: true });
                    batchCount++; totalEpsImported++;
                    if (batchCount >= 400) { setImportStatus(`Saved ${totalEpsImported} episodes to Firebase...`); await batch.commit(); batch = writeBatch(db); batchCount = 0; }
                }
            }

            if (batchCount > 0) await batch.commit();
            if (totalShowsImported === 0 && totalEpsImported === 0) throw new Error(`Data extracted, but no matching shows found on TMDB.`);

            setImportStatus(`Finished! Scanned ${extractedData.filesScanned.length} files. Imported ${totalShowsImported} shows and ${totalEpsImported} episodes.`);
            setTimeout(() => { setIsImporting(false); setImportStatus(""); }, 5000);
        } catch (error) {
            console.error("Import error:", error); setImportStatus(`Error: ${error.message}`);
            setTimeout(() => { setIsImporting(false); setImportStatus(""); }, 10000);
        }
    };


    const MovieHub = () => {
        const [query, setQuery] = useState('');
        const [results, setResults] = useState([]);
        const [searching, setSearching] = useState(false);
        const [recommendations, setRecommendations] = useState([]);

        const toWatch = savedMoviesData.filter(m => m.status === 'toWatch').sort((a,b) => new Date(b.added_at) - new Date(a.added_at));
        const watched = savedMoviesData.filter(m => m.status === 'watched').sort((a,b) => new Date(b.added_at) - new Date(a.added_at));

        useEffect(() => {
            if (movieTab === 'suggested' && recommendations.length === 0) {
                const fetchSuggestions = async () => {
                    const watchedMovies = savedMoviesData.filter(m => m.status === 'watched' && (m.rating || 0) > 0);
                    if (watchedMovies.length === 0) {
                        try {
                            const res = await fetch(`${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`);
                            const data = await res.json();
                            setRecommendations(data.results || []);
                        } catch(e) {}
                    } else {
                        try {
                            const topMovies = [...watchedMovies].sort((a,b) => b.rating - a.rating).slice(0, 3);
                            let recs = [];
                            for (let m of topMovies) {
                                const res = await fetch(`${TMDB_BASE_URL}/movie/${m.id}/recommendations?api_key=${TMDB_API_KEY}`);
                                const data = await res.json();
                                recs = [...recs, ...(data.results || [])];
                            }
                            const uniqueRecs = [];
                            const seenIds = new Set(savedMoviesData.map(m => m.id));
                            for (let r of recs) {
                                if (!seenIds.has(r.id)) { uniqueRecs.push(r); seenIds.add(r.id); }
                            }
                            uniqueRecs.sort(() => 0.5 - Math.random());
                            setRecommendations(uniqueRecs.slice(0, 15));
                        } catch(e) {}
                    }
                };
                fetchSuggestions();
            }
        }, [movieTab]);

        useEffect(() => {
            const delay = setTimeout(() => {
                if (movieTab === 'suggested' && query.trim().length >= 2) {
                    setSearching(true);
                    fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`)
                        .then(res => res.json())
                        .then(data => setResults(data.results || []))
                        .finally(() => setSearching(false));
                } else { setResults([]); }
            }, 600);
            return () => clearTimeout(delay);
        }, [query, movieTab]);

        const getMovieStatus = (id) => savedMoviesData.find(m => m.id === id)?.status || null;
        const getMovieRating = (id) => savedMoviesData.find(m => m.id === id)?.rating || 0;

        const renderGrid = (movies, emptyMessage) => {
            if (movies.length === 0) return <div className="flex-1 flex flex-col items-center justify-center text-textMuted opacity-50 py-20"><i className="fas fa-film text-6xl mb-4"></i><p className="text-lg text-center mt-4">{emptyMessage}</p></div>;
            return (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pb-20 mt-2">
                    {movies.map(movie => (
                        <MediaCard key={movie.id} item={movie} openModal={async (m) => {
                            setIsFullscreen(modalDefaultFS); setSelectedMovie(m); setMovieDetails(null); setIsLoadingDetails(true);
                            try { const res = await fetch(`${TMDB_BASE_URL}/movie/${m.id}?api_key=${TMDB_API_KEY}&language=en-US`); setMovieDetails(await res.json()); } catch(e){} finally { setIsLoadingDetails(false); }
                        }} isSaved={isMovieSaved(movie.id)}
                            additionalUI={
                                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                                    {getMovieStatus(movie.id) === 'watched' && <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md">WATCHED</span>}
                                    {getMovieStatus(movie.id) === 'toWatch' && <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md">TO WATCH</span>}
                                    {getMovieRating(movie.id) > 0 && <span className="bg-black/80 text-yellow-500 text-[10px] font-bold px-2 py-1 rounded shadow-md"><i className="fas fa-star"></i> {getMovieRating(movie.id)}</span>}
                                </div>
                            }
                        />
                    ))}
                </div>
            );
        };

        return (
            <div className="p-4 md:p-8 animate-fade-in flex flex-col h-full min-h-[80vh] pb-24">
                <div className="flex flex-col mb-6 gap-4">
                    <div><h2 className="text-3xl font-bold mb-2">Movies</h2><p className="text-textMuted">Track and discover feature films.</p></div>
                    <div className="flex md:hidden bg-surface border border-surfaceLight rounded-xl p-1 overflow-x-auto shrink-0 mt-2">
                        <button onClick={() => setMovieTab('toWatch')} className={`flex-1 flex items-center justify-center gap-2 min-w-max px-4 py-2 text-sm font-bold rounded-lg transition-colors ${movieTab === 'toWatch' ? 'bg-primary text-white' : 'text-textMuted hover:text-white'}`}><i className="fas fa-bookmark"></i> To Watch</button>
                        <button onClick={() => setMovieTab('watched')} className={`flex-1 flex items-center justify-center gap-2 min-w-max px-4 py-2 text-sm font-bold rounded-lg transition-colors ${movieTab === 'watched' ? 'bg-primary text-white' : 'text-textMuted hover:text-white'}`}><i className="fas fa-check-circle"></i> Watched</button>
                        <button onClick={() => setMovieTab('suggested')} className={`flex-1 flex items-center justify-center gap-2 min-w-max px-4 py-2 text-sm font-bold rounded-lg transition-colors ${movieTab === 'suggested' ? 'bg-primary text-white' : 'text-textMuted hover:text-white'}`}><i className="fas fa-lightbulb"></i> Suggested</button>
                    </div>
                </div>
                {movieTab === 'toWatch' && renderGrid(toWatch, "Your watchlist is empty. Check the suggested tab for new movies!")}
                {movieTab === 'watched' && renderGrid(watched, "You haven't marked any movies as watched yet.")}
                {movieTab === 'suggested' && (
                    <div className="flex flex-col animate-fade-in">
                        <div className="relative mb-6">
                            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for movies..." className="w-full bg-surface border border-surfaceLight rounded-full py-4 px-6 pl-14 text-white focus:outline-none focus:border-primary transition-all text-lg" />
                            <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-textMuted text-lg"></i>
                            {searching && <i className="fas fa-spinner fa-spin absolute right-6 top-1/2 -translate-y-1/2 text-primary text-lg"></i>}
                        </div>
                        {query.length >= 2 ? (
                            <><h3 className="text-xl font-bold text-white mb-2">Search Results</h3>{renderGrid(results, "No movies found.")}</>
                        ) : (
                            <><h3 className="text-xl font-bold text-white mb-2"><i className="fas fa-lightbulb text-primary mr-2"></i> {savedMoviesData.filter(m => m.status === 'watched' && (m.rating || 0) > 0).length > 0 ? "Recommended for You" : "Trending Worldwide"}</h3>
                            {renderGrid(recommendations, "Loading movies...")}</>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (!isFirebaseConfigured) {
        return (
            <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-8 text-center">
                <i className="fas fa-exclamation-triangle text-primary text-6xl mb-6"></i>
                <h1 className="text-3xl font-bold mb-4">Missing Configuration</h1>
                <p className="text-textMuted max-w-lg mb-8">Please check your <code>.env</code> file. Firebase API keys are required to boot the application.</p>
                <div className="bg-surfaceLight p-6 rounded-xl border border-surface w-full max-w-xl text-left font-mono text-sm">
                    <p className="text-green-400 mb-2">Ensure these are set:</p>
                    VITE_FIREBASE_API_KEY=...<br/>
                    VITE_FIREBASE_AUTH_DOMAIN=...<br/>
                    VITE_TMDB_API_KEY=...
                </div>
            </div>
        );
    }

    if (!isAuthReady) {
        return <div className="h-screen w-screen bg-background flex flex-col items-center justify-center text-white"><i className="fas fa-play text-primary text-4xl mb-4 animate-bounce"></i><h1 className="text-2xl font-bold tracking-tight">TV<span className="text-primary">Tensei</span></h1></div>;
    }

    if (!user) return <AuthScreen />;

    return (
        <div className="flex flex-col md:flex-row h-screen bg-background font-sans text-textMain">
            <nav className="order-2 md:order-1 w-full md:w-64 bg-surface border-t md:border-t-0 md:border-r border-surfaceLight flex md:flex-col justify-around md:justify-start pb-safe md:py-8 z-20 flex-shrink-0 relative">
                <div className="hidden md:flex px-6 mb-10 items-center gap-3">
                    <div className="bg-primary text-white w-10 h-10 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.3)]"><i className="fas fa-play"></i></div>
                    <h1 className="text-2xl font-bold tracking-tight">TV<span className="text-primary">Tensei</span></h1>
                </div>
                <div className="flex w-full md:flex-col gap-0 md:gap-2">
                    <NavItem id="watch-next" icon="play-circle" label="Watch Next" activeTab={activeTab} setActiveTab={setActiveTab}/>
                    <NavItem id="discover" icon="compass" label="Discover" activeTab={activeTab} setActiveTab={setActiveTab}/>
                    <NavItem id="history" icon="list-ul" label="Library" activeTab={activeTab} setActiveTab={setActiveTab}/>
                    
                    <div className="flex flex-col w-full md:w-auto relative group">
                        <button onClick={() => setActiveTab('movies')} className={`flex flex-col md:flex-row items-center justify-center md:justify-start w-full py-3 md:py-4 md:px-6 gap-1 md:gap-4 transition-all duration-300 ${activeTab === 'movies' ? 'text-white md:border-r-4 border-primary bg-surfaceLight/30 md:bg-transparent' : 'text-textMuted hover:text-white hover:bg-surfaceLight/20 md:hover:bg-transparent'}`}>
                            <i className={`fas fa-film text-xl md:text-2xl ${activeTab === 'movies' ? 'text-primary scale-110' : ''} transition-all`}></i>
                            <span className={`text-[10px] md:text-base font-medium mt-1 md:mt-0 ${activeTab === 'movies' ? 'text-primary' : ''}`}>Movies</span>
                        </button>
                        {activeTab === 'movies' && (
                            <div className="hidden md:flex flex-col pl-14 mt-1 space-y-1 mb-2">
                                <button onClick={() => setMovieTab('toWatch')} className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all text-sm ${movieTab === 'toWatch' ? 'text-white bg-surfaceLight/30 border-l-2 border-primary' : 'text-textMuted hover:text-white'}`}><i className="fas fa-bookmark w-4 text-center"></i> To Watch</button>
                                <button onClick={() => setMovieTab('watched')} className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all text-sm ${movieTab === 'watched' ? 'text-white bg-surfaceLight/30 border-l-2 border-primary' : 'text-textMuted hover:text-white'}`}><i className="fas fa-check-circle w-4 text-center"></i> Watched</button>
                                <button onClick={() => setMovieTab('suggested')} className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all text-sm ${movieTab === 'suggested' ? 'text-white bg-surfaceLight/30 border-l-2 border-primary' : 'text-textMuted hover:text-white'}`}><i className="fas fa-lightbulb text-primary w-4 text-center"></i> Suggested</button>
                            </div>
                        )}
                    </div>

                    <NavItem id="search" icon="search" label="Search" activeTab={activeTab} setActiveTab={setActiveTab}/>
                    <NavItem id="calendar" icon="calendar-days" label="Calendar" activeTab={activeTab} setActiveTab={setActiveTab}/>
                    <NavItem id="profile" icon="user" label="Profile" activeTab={activeTab} setActiveTab={setActiveTab}/>
                </div>
            </nav>

            <header className="md:hidden order-1 bg-surface border-b border-surfaceLight p-4 flex items-center justify-center z-10 sticky top-0">
                <div className="bg-primary text-white w-7 h-7 rounded-md flex items-center justify-center mr-2 shadow-[0_0_10px_rgba(229,9,20,0.3)]"><i className="fas fa-play text-xs"></i></div>
                <h1 className="text-xl font-bold tracking-tight">TV<span className="text-primary">Tensei</span></h1>
            </header>

            <main className="order-1 md:order-2 flex-1 overflow-y-auto hide-scrollbar relative pb-16 md:pb-0 bg-background">
                <div className="max-w-6xl mx-auto">
                    
                    {/* --- WATCH NEXT TAB --- */}
                    {activeTab === 'watch-next' && (
                        <div className="p-4 md:p-8 animate-fade-in pb-24">
                            <h2 className="text-3xl font-bold mb-2">Watch Next</h2>
                            <p className="text-textMuted mb-8">Continue watching your active shows.</p>
                            
                            {isLoadingWatchNext ? (
                                <div className="flex justify-center p-10"><i className="fas fa-spinner fa-spin text-primary text-4xl"></i></div>
                            ) : watchNextList.length > 0 ? (
                                <div className="flex flex-col gap-4">
                                    {watchNextList.map(item => (
                                        <div key={`${item.show.id}-${item.episode.id}`} className="bg-surface border border-surfaceLight rounded-xl overflow-hidden flex shadow-lg hover:border-primary/50 transition-colors h-28 md:h-36 group">
                                            <div onClick={() => {
                                                setIsFullscreen(modalDefaultFS); setSelectedShow(item.show); setShowDetails(null); setExpandedSeason(null); setSeasonEpisodes({}); setIsLoadingDetails(true);
                                                fetch(`${TMDB_BASE_URL}/tv/${item.show.id}?api_key=${TMDB_API_KEY}&language=en-US`).then(r=>r.json()).then(d=>setShowDetails(d)).finally(()=>setIsLoadingDetails(false));
                                            }} className="cursor-pointer flex-shrink-0 w-24 md:w-48 bg-surfaceLight relative overflow-hidden">
                                                {item.episode.still_path || item.show.poster_path ? <img src={`${TMDB_IMG_URL}${item.episode.still_path || item.show.poster_path}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" /> : <div className="w-full h-full flex items-center justify-center"><i className="fas fa-tv text-textMuted text-2xl"></i></div>}
                                                {item.stateText && <div className="absolute top-2 left-2 bg-black/80 backdrop-blur text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded border border-white/20">{item.stateText}</div>}
                                            </div>
                                            <div onClick={() => {
                                                setIsFullscreen(modalDefaultFS); setSelectedShow(item.show); setShowDetails(null); setExpandedSeason(null); setSeasonEpisodes({}); setIsLoadingDetails(true);
                                                fetch(`${TMDB_BASE_URL}/tv/${item.show.id}?api_key=${TMDB_API_KEY}&language=en-US`).then(r=>r.json()).then(d=>setShowDetails(d)).finally(()=>setIsLoadingDetails(false));
                                            }} className="cursor-pointer flex-1 p-3 md:p-4 flex flex-col justify-center min-w-0">
                                                <div className="text-primary text-xs font-bold uppercase tracking-wide truncate mb-1">{item.show.name}</div>
                                                <div className="text-white font-bold text-sm md:text-lg truncate mb-1">{item.episode.name}</div>
                                                <div className="text-textMuted text-xs font-mono">S{String(item.episode.season_number).padStart(2,'0')} E{String(item.episode.episode_number).padStart(2,'0')}</div>
                                            </div>
                                            <div className="w-20 md:w-28 flex items-center justify-center border-l border-surfaceLight/50">
                                                <button disabled={item.isLocked} onClick={() => toggleWatchedEpisode(item.episode, item.show.id, item.show)} className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${item.isLocked ? 'bg-surfaceLight/20 text-textMuted cursor-not-allowed' : 'bg-surfaceLight/50 text-white hover:bg-primary shadow-lg hover:scale-110'}`}><i className={`fas fa-check ${item.isLocked ? 'opacity-50' : 'text-xl'}`}></i></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <div className="text-center p-10 border-2 border-dashed border-surfaceLight rounded-xl text-textMuted"><i className="fas fa-check-circle text-5xl mb-4 opacity-30"></i><p>You're all caught up! Nothing to watch next.</p></div>}
                        </div>
                    )}

                    {/* --- HISTORY TAB --- */}
                    {activeTab === 'history' && (
                        <div className="p-4 md:p-8 animate-fade-in pb-24">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                                <div><h2 className="text-3xl font-bold mb-2">Library</h2><p className="text-textMuted">Manage your entire catalog.</p></div>
                                <div className="flex flex-wrap items-center gap-3 bg-surfaceLight/10 p-2 rounded-xl border border-surfaceLight">
                                    <div className="flex items-center gap-2 bg-surface text-white text-sm rounded-lg px-3 py-2 border border-surfaceLight focus-within:border-primary transition-colors">
                                        <span className="text-textMuted font-medium">Filter:</span>
                                        <select value={historyFilterStatus} onChange={(e) => setHistoryFilterStatus(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
                                            <option value="all" className="bg-surface text-white">All</option>
                                            <option value="inProgress" className="bg-surface text-white">In Progress</option>
                                            <option value="upToDate" className="bg-surface text-white">Up to Date</option>
                                            <option value="completed" className="bg-surface text-white">Completed</option>
                                            <option value="toStart" className="bg-surface text-white">To Start</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center bg-surface rounded-lg border border-surfaceLight focus-within:border-primary transition-colors overflow-hidden">
                                        <div className="flex items-center gap-2 text-white text-sm px-3 py-2">
                                            <span className="text-textMuted font-medium">Sort by:</span>
                                            <select value={historySortBy} onChange={(e) => setHistorySortBy(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
                                                <option value="recent" className="bg-surface text-white">Recent</option>
                                                <option value="added_at" className="bg-surface text-white">Date Added</option>
                                                <option value="name" className="bg-surface text-white">Name</option>
                                                <option value="rating" className="bg-surface text-white">Rating</option>
                                                <option value="progress" className="bg-surface text-white">Progress</option>
                                                <option value="year" className="bg-surface text-white">Year</option>
                                            </select>
                                        </div>
                                        <button onClick={() => setHistorySortDesc(!historySortDesc)} className="px-3 py-2 text-textMuted hover:text-white hover:bg-surfaceLight/50 transition-colors border-l border-surfaceLight" title={historySortDesc ? "Descending" : "Ascending"}><i className={`fas fa-sort-amount-${historySortDesc ? 'down' : 'up'}`}></i></button>
                                    </div>
                                    <div className="flex bg-surface rounded-lg border border-surfaceLight overflow-hidden">
                                        <button onClick={() => setHistoryViewMode('list')} className={`px-3 py-2 transition-colors ${historyViewMode === 'list' ? 'bg-primary text-white' : 'text-textMuted hover:text-white hover:bg-surfaceLight/50'}`}><i className="fas fa-list"></i></button>
                                        <button onClick={() => setHistoryViewMode('grid')} className={`px-3 py-2 transition-colors ${historyViewMode === 'grid' ? 'bg-primary text-white' : 'text-textMuted hover:text-white hover:bg-surfaceLight/50'}`}><i className="fas fa-th-large"></i></button>
                                    </div>
                                </div>
                            </div>
                            {filteredAndSortedHistory.length > 0 ? (
                                historyViewMode === 'list' ? (
                                    <div className="flex flex-col gap-3 mb-10">
                                        {filteredAndSortedHistory.map(show => <ShowListRow key={show.id} show={show} openShowModal={async (s) => {
                                            setIsFullscreen(modalDefaultFS); setSelectedShow(s); setShowDetails(null); setExpandedSeason(null); setSeasonEpisodes({}); setIsLoadingDetails(true);
                                            try { const res = await fetch(`${TMDB_BASE_URL}/tv/${s.id}?api_key=${TMDB_API_KEY}&language=en-US`); setShowDetails(await res.json()); } catch(e){} finally { setIsLoadingDetails(false); }
                                        }} />)}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pb-20">
                                        {filteredAndSortedHistory.map(show => (
                                            <MediaCard key={show.id} item={show} openModal={async (s) => {
                                                setIsFullscreen(modalDefaultFS); setSelectedShow(s); setShowDetails(null); setExpandedSeason(null); setSeasonEpisodes({}); setIsLoadingDetails(true);
                                                try { const res = await fetch(`${TMDB_BASE_URL}/tv/${s.id}?api_key=${TMDB_API_KEY}&language=en-US`); setShowDetails(await res.json()); } catch(e){} finally { setIsLoadingDetails(false); }
                                            }} isSaved={true}
                                                additionalUI={
                                                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                                                        {show.hidden_from_watch_next && <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md border border-orange-400/50"><i className="fas fa-eye-slash"></i> OFF</span>}
                                                        {show.status === 'completed' && <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md border border-green-400/50">COMPLETED</span>}
                                                        {show.status === 'upToDate' && <span className="bg-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md border border-purple-400/50">UP TO DATE</span>}
                                                        {show.status === 'toStart' && <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md border border-blue-400/50">WATCHLIST</span>}
                                                        {show.status === 'inProgress' && <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded shadow-md border border-red-400/50">{Math.round(show.progressPercentage)}%</span>}
                                                        {show.rating > 0 && <span className="bg-black/80 text-yellow-500 text-[10px] font-bold px-2 py-1 rounded shadow-md border border-yellow-500/50"><i className="fas fa-star"></i> {show.rating}</span>}
                                                    </div>
                                                }
                                            />
                                        ))}
                                    </div>
                                )
                            ) : <div className="text-center p-10 border-2 border-dashed border-surfaceLight rounded-xl text-textMuted flex flex-col items-center"><i className="fas fa-filter text-5xl mb-4 opacity-30"></i><p>No shows found for the selected filters.</p></div>}
                        </div>
                    )}

                    {/* --- OTHER TABS --- */}
                    {activeTab === 'discover' && (
                        <div className="p-4 md:p-8 animate-fade-in pb-24">
                            <h2 className="text-3xl font-bold mb-2">Discover</h2><p className="text-textMuted mb-8">Trending globally this week.</p>
                            <div className="text-center p-10 border-2 border-dashed border-surfaceLight rounded-xl text-textMuted"><i className="fas fa-compass text-5xl mb-4 opacity-30"></i><p>Explore function is now powered by TMDB Trends.</p></div>
                        </div>
                    )}

                    {activeTab === 'search' && (
                        <div className="p-4 md:p-8 animate-fade-in flex flex-col h-full min-h-[80vh] pb-24">
                            <h2 className="text-3xl font-bold mb-2">Search TMDB</h2><p className="text-textMuted mb-6">Find your next binge.</p>
                            <div className="relative mb-6">
                                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="E.g. Breaking Bad, Naruto, The Office..." className="w-full bg-surface border border-surfaceLight rounded-full py-4 px-6 pl-14 text-white focus:outline-none focus:border-primary transition-all text-lg" />
                                <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-textMuted text-lg"></i>
                                {isSearching && <i className="fas fa-spinner fa-spin absolute right-6 top-1/2 -translate-y-1/2 text-primary text-lg"></i>}
                            </div>
                            {searchResults.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pb-20">
                                    {searchResults.map(show => <MediaCard key={show.id} item={show} openModal={async (s) => {
                                        setIsFullscreen(modalDefaultFS); setSelectedShow(s); setShowDetails(null); setExpandedSeason(null); setSeasonEpisodes({}); setIsLoadingDetails(true);
                                        try { const res = await fetch(`${TMDB_BASE_URL}/tv/${s.id}?api_key=${TMDB_API_KEY}&language=en-US`); setShowDetails(await res.json()); } catch(e){} finally { setIsLoadingDetails(false); }
                                    }} isSaved={isShowSaved(show.id)} />)}
                                </div>
                            ) : (!isSearching && searchQuery.length > 0 && <div className="flex-1 flex flex-col items-center justify-center text-textMuted opacity-50 pb-20"><p className="text-lg">No results found.</p></div>)}
                        </div>
                    )}

                    {activeTab === 'movies' && <MovieHub />}

                    {activeTab === 'calendar' && (
                        <div className="p-4 md:p-8 animate-fade-in pb-24">
                            <h2 className="text-3xl font-bold mb-2">Calendar</h2>
                            <p className="text-textMuted mb-8">Upcoming episodes!</p>
                            {upcomingEpisodes.length > 0 ? (
                                <div className="space-y-4">
                                    {upcomingEpisodes.map(item => (
                                        <div key={item.episode.id} onClick={() => {
                                            setIsFullscreen(modalDefaultFS); setSelectedShow({ id: item.showId, name: item.showName, poster_path: item.posterPath }); setShowDetails(null); setExpandedSeason(null); setSeasonEpisodes({}); setIsLoadingDetails(true);
                                            fetch(`${TMDB_BASE_URL}/tv/${item.showId}?api_key=${TMDB_API_KEY}&language=en-US`).then(r=>r.json()).then(d=>setShowDetails(d)).finally(()=>setIsLoadingDetails(false));
                                        }} className="bg-surface p-4 rounded-xl border border-surfaceLight flex items-center gap-4 transition-transform hover:-translate-y-1 cursor-pointer hover:border-primary/50">
                                            {item.posterPath ? <img src={`${TMDB_IMG_URL}${item.posterPath}`} className="w-16 h-24 object-cover rounded-lg shadow-md" alt="" /> : <div className="w-16 h-24 bg-surfaceLight/50 rounded-lg flex items-center justify-center text-textMuted"><i className="fas fa-tv"></i></div>}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-primary font-bold mb-1 truncate">{item.showName}</div>
                                                <div className="text-sm md:text-lg font-bold text-white mb-1 truncate">{item.episode.name}</div>
                                                <div className="text-xs md:text-sm text-textMuted">Season {item.episode.season_number} • Episode {item.episode.episode_number}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-white font-bold text-xs md:text-sm bg-primary px-3 py-1 rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)] whitespace-nowrap">{item.episode.air_date ? item.episode.air_date.split('-').reverse().join('/') : 'TBA'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <div className="text-center p-8 border-2 border-dashed border-surfaceLight rounded-xl text-textMuted"><i className="fas fa-calendar-times text-4xl mb-3 opacity-50"></i><p>No upcoming episodes found.</p></div>}
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="p-4 md:p-8 animate-fade-in pb-24">
                            <h2 className="text-3xl font-bold mb-2">Profile</h2>
                            <p className="text-textMuted mb-8">Your Otaku statistics and settings.</p>
                            
                            {/* RESTORED: STATS DASHBOARD */}
                            {isCalculatingStats ? (
                                <div className="flex flex-col items-center justify-center p-8 border border-surfaceLight rounded-xl mb-8">
                                    <i className="fas fa-satellite-dish fa-spin text-primary text-3xl mb-3"></i>
                                    <p className="text-textMuted text-sm">Calculating watch time...</p>
                                </div>
                            ) : (
                                <div className="mb-8 bg-surfaceLight/10 border border-surfaceLight rounded-xl p-6">
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <div className="text-3xl md:text-5xl font-extrabold text-primary mb-1 drop-shadow-[0_0_10px_rgba(229,9,20,0.4)]">{stats.months}</div>
                                            <div className="text-xs md:text-sm text-textMuted uppercase tracking-wider font-semibold">Months</div>
                                        </div>
                                        <div>
                                            <div className="text-3xl md:text-5xl font-extrabold text-white mb-1">{stats.days}</div>
                                            <div className="text-xs md:text-sm text-textMuted uppercase tracking-wider font-semibold">Days</div>
                                        </div>
                                        <div>
                                            <div className="text-3xl md:text-5xl font-extrabold text-white mb-1">{stats.hours}</div>
                                            <div className="text-xs md:text-sm text-textMuted uppercase tracking-wider font-semibold">Hours</div>
                                        </div>
                                    </div>
                                    
                                    {stats.topShows.length > 0 && (
                                        <div className="mt-8 pt-6 border-t border-surfaceLight/50">
                                            <h4 className="text-sm text-textMuted uppercase tracking-wider font-bold mb-4">
                                                <i className="fas fa-trophy text-yellow-500 mr-2"></i> Most Watched Shows
                                            </h4>
                                            <div className="space-y-4">
                                                {stats.topShows.map((show, i) => {
                                                    const maxTime = stats.topShows[0].time > 0 ? stats.topShows[0].time : 1;
                                                    const percentage = (show.time / maxTime) * 100;
                                                    return (
                                                        <div key={i} className="group">
                                                            <div className="flex justify-between text-xs md:text-sm text-gray-300 mb-1">
                                                                <span className="font-semibold truncate pr-4">{show.name}</span>
                                                                <span className="flex-shrink-0 text-textMuted">{Math.floor(show.time / 60)}h {show.time % 60}m</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-1000 ${i === 0 ? 'bg-primary' : 'bg-surfaceLight group-hover:bg-primary/50'}`} 
                                                                    style={{ width: `${percentage}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-8 mb-10">
                                <h4 className="text-sm text-textMuted uppercase tracking-wider font-bold mb-4"><i className="fas fa-cog mr-2 text-primary"></i> Settings</h4>
                                <div className="bg-surfaceLight/10 border border-surfaceLight rounded-xl p-4 flex justify-between items-center hover:bg-surfaceLight/20 transition-colors">
                                    <div><h4 className="text-white font-bold text-sm md:text-base">Default Modal View</h4><p className="text-xs text-textMuted mt-1">Open shows in fullscreen mode by default</p></div>
                                    <button onClick={() => { const newVal = !modalDefaultFS; setModalDefaultFS(newVal); localStorage.setItem('tvtensei_fs_modal', newVal); }} className={`w-12 h-6 md:w-14 md:h-7 rounded-full relative transition-colors shadow-inner ${modalDefaultFS ? 'bg-primary' : 'bg-surfaceLight'}`}>
                                        <div className={`absolute top-1 left-1 w-4 h-4 md:w-5 md:h-5 rounded-full bg-white transition-transform ${modalDefaultFS ? 'translate-x-6 md:translate-x-7' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                            </div>

                            {/* RESTORED: TV TIME IMPORT */}
                            <div className="mt-8 mb-10">
                                <h4 className="text-sm text-textMuted uppercase tracking-wider font-bold mb-4"><i className="fas fa-file-import mr-2 text-primary"></i> Import from TV Time</h4>
                                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors relative bg-surfaceLight/10 ${isImporting ? 'border-primary opacity-80' : 'border-surfaceLight hover:border-primary cursor-pointer group'}`}>
                                    <input type="file" accept=".zip" onChange={handleZipImport} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isImporting} />
                                    {isImporting ? (
                                        <div className="flex flex-col items-center justify-center">
                                            <i className="fas fa-spinner fa-spin text-3xl mb-3 text-primary"></i>
                                            <p className="text-white font-medium mt-2">{importStatus}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pointer-events-none">
                                            <i className="fas fa-file-archive text-4xl mb-3 text-textMuted group-hover:text-primary transition-colors"></i>
                                            <h3 className="font-bold text-lg text-white mb-1">Upload .zip archive</h3>
                                            <p className="text-textMuted text-sm">Drag or click to upload your exported data</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-12 mb-10 border-t border-surfaceLight pt-8">
                                <button onClick={() => signOut(auth)} className="w-full flex items-center justify-center gap-2 bg-transparent border border-red-600/50 text-red-500 hover:bg-red-600 hover:text-white font-bold py-3 px-4 rounded-xl transition-all"><i className="fas fa-sign-out-alt"></i> Logout Account</button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* --- SHOW MODAL --- */}
            {selectedShow && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-modal md:p-6">
                    <div className="absolute inset-0" onClick={() => setSelectedShow(null)}></div>
                    <div className={`bg-surface flex flex-col overflow-hidden relative shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-surfaceLight z-10 animate-fade-in transition-all duration-300 ${isFullscreen ? 'w-full h-full max-w-none rounded-none' : 'w-full max-w-4xl max-h-[90vh] md:h-[85vh] md:rounded-2xl rounded-t-3xl'}`}>
                        <div className="absolute top-4 right-4 z-20 flex gap-2 md:gap-3">
                            <button onClick={() => setIsFullscreen(!isFullscreen)} className="bg-black/60 hover:bg-surface text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/10 hidden md:flex"><i className={`fas fa-${isFullscreen ? 'compress' : 'expand'}`}></i></button>
                            {/* TASTO STOP TRACKING (L'OCCHIO) */}
                            {isShowSaved(selectedShow.id) && (
                                <button 
                                    onClick={() => toggleHideShow(selectedShow.id)} 
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-md border ${isShowHidden(selectedShow.id) ? 'bg-orange-500 text-white border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'bg-black/60 text-white hover:bg-surface border-white/10'}`} 
                                    title={isShowHidden(selectedShow.id) ? "Resume tracking in Watch Next" : "Stop tracking in Watch Next"}
                                >
                                    <i className={`fas fa-${isShowHidden(selectedShow.id) ? 'eye-slash' : 'eye'}`}></i>
                                </button>
                            )}
                            <button onClick={() => toggleLibraryShow(selectedShow)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-md border ${isShowSaved(selectedShow.id) ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(229,9,20,0.5)]' : 'bg-black/60 text-white hover:bg-surface border-white/10'}`} title={isShowSaved(selectedShow.id) ? "Remove from Library" : "Add to Library"}><i className={`${isShowSaved(selectedShow.id) ? 'fas' : 'far'} fa-bookmark`}></i></button>
                            <button onClick={() => setSelectedShow(null)} className="bg-black/60 hover:bg-surface text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/10"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="relative h-56 md:h-80 flex-shrink-0 bg-surfaceLight">
                            {selectedShow.backdrop_path ? <img src={`${TMDB_BACKDROP_URL}${selectedShow.backdrop_path}`} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center opacity-20"><i className="fas fa-image text-6xl"></i></div>}
                            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full flex items-end gap-6">
                                <div className="hidden md:block flex-shrink-0 w-32 rounded-lg overflow-hidden border-2 border-surfaceLight/50 shadow-2xl">
                                     {selectedShow.poster_path && <img src={`${TMDB_IMG_URL}${selectedShow.poster_path}`} className="w-full" alt="" />}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-2 shadow-black drop-shadow-xl tracking-tight">{selectedShow.name}</h2>
                                    {/* INDICATORE STOP TRACKING */}
                                    {isShowHidden(selectedShow.id) && (
                                        <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full w-max mb-2 block shadow-lg">
                                            <i className="fas fa-eye-slash mr-1"></i> Tracking Stopped
                                        </span>
                                    )}
                                    <div className="flex items-center gap-4 text-sm text-gray-300 font-medium bg-black/40 w-max px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10 mt-1">
                                        {selectedShow.vote_average != null && <span className="flex items-center"><i className="fas fa-star text-yellow-500 mr-1.5"></i> {formatRating(selectedShow.vote_average)}/10</span>}
                                        {selectedShow.first_air_date && <span>• {getYear(selectedShow.first_air_date)}</span>}
                                        <span className="uppercase text-primary font-bold">{selectedShow.original_language}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 md:p-8">
                            <div className="mb-8"><h3 className="text-lg font-bold text-white mb-3">Synopsis</h3><p className="text-gray-300 leading-relaxed text-sm md:text-base">{showDetails?.overview || selectedShow.overview || "No synopsis available."}</p></div>
                            {isShowSaved(selectedShow.id) && (
                                <div className="mb-8 bg-surfaceLight/20 p-4 rounded-xl border border-surfaceLight flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
                                    <div className="flex items-center gap-2 text-white font-bold"><i className="fas fa-star text-yellow-500"></i> Your Rating</div>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map(star => {
                                            const currentRating = savedShowsData.find(s => s.id === selectedShow.id)?.rating || 0;
                                            return <button key={star} onClick={() => currentUid && setDoc(doc(db, 'users', currentUid, 'shows', selectedShow.id.toString()), { rating: star }, { merge: true })} className={`text-2xl transition-transform hover:scale-110 ${star <= currentRating ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-surfaceLight hover:text-yellow-500/50'}`}><i className="fas fa-star"></i></button>;
                                        })}
                                    </div>
                                </div>
                            )}
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><i className="fas fa-layer-group text-primary"></i> Seasons & Episodes</h3>
                            {isLoadingDetails ? <div className="flex justify-center p-8"><i className="fas fa-spinner fa-spin text-primary text-3xl"></i></div> : showDetails && showDetails.seasons ? (
                                <div className="space-y-3 pb-8">
                                    {showDetails.seasons.filter(s => s.season_number > 0).map(season => {
                                        const watchedInSeason = watchedEpisodesData.filter(ep => ep.show_id === showDetails.id && ep.season_number === season.season_number);
                                        const isFullyWatched = watchedInSeason.length >= season.episode_count && season.episode_count > 0;
                                        const isExpanded = expandedSeason === season.season_number;

                                        return (
                                            <div key={season.id} className="bg-surfaceLight/20 rounded-xl border border-surfaceLight overflow-hidden transition-all">
                                                <div className="w-full flex items-center justify-between p-3 md:p-4 hover:bg-surfaceLight/40 transition-colors cursor-pointer" onClick={async () => {
                                                    if (isExpanded) { setExpandedSeason(null); return; }
                                                    setExpandedSeason(season.season_number);
                                                    if (!seasonEpisodes[season.season_number]) {
                                                        const res = await fetch(`${TMDB_BASE_URL}/tv/${showDetails.id}/season/${season.season_number}?api_key=${TMDB_API_KEY}&language=en-US`);
                                                        if (res.ok) { const data = await res.json(); setSeasonEpisodes(prev => ({ ...prev, [season.season_number]: data.episodes })); }
                                                    }
                                                }}>
                                                    <div className="flex items-center gap-4">
                                                        {season.poster_path ? <img src={`${TMDB_IMG_URL}${season.poster_path}`} className="w-12 h-16 object-cover rounded shadow-md" alt="" /> : <div className="w-12 h-16 bg-surfaceLight/50 flex flex-col items-center justify-center rounded"><i className="fas fa-tv text-xl text-surfaceLight mb-1"></i></div>}
                                                        <div className="text-left"><div className="font-bold text-white text-lg">{season.name}</div><div className="text-sm text-textMuted">{watchedInSeason.length} / {season.episode_count} Episodes {season.air_date ? `• ${getYear(season.air_date)}` : ''}</div></div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={async (e) => { 
                                                            e.stopPropagation(); 
                                                            if(!currentUid) return;
                                                            const batch = writeBatch(db);
                                                            if (isFullyWatched) {
                                                                watchedInSeason.forEach(w => batch.delete(doc(db, 'users', currentUid, 'watched_episodes', w.id)));
                                                                await batch.commit();
                                                            } else {
                                                                let eps = seasonEpisodes[season.season_number];
                                                                if (!eps) {
                                                                    const res = await fetch(`${TMDB_BASE_URL}/tv/${showDetails.id}/season/${season.season_number}?api_key=${TMDB_API_KEY}&language=en-US`);
                                                                    if (res.ok) eps = (await res.json()).episodes;
                                                                }
                                                                if (eps) {
                                                                    eps.forEach(ep => {
                                                                        if (!getWatchedEpisodeData(showDetails.id, ep.season_number, ep.episode_number)) {
                                                                            batch.set(doc(db, 'users', currentUid, 'watched_episodes', ep.id.toString()), { show_id: showDetails.id, season_number: ep.season_number, episode_number: ep.episode_number, runtime: ep.runtime || 0, watched_at: new Date().toISOString() });
                                                                        }
                                                                    });
                                                                    await batch.commit();
                                                                    
                                                                    // AUTO-UNHIDE QUANDO SEGNI INTERA STAGIONE
                                                                    const showUpdateData = { name: showDetails.name, poster_path: showDetails.poster_path || null, total_episodes: showDetails.number_of_episodes, show_status: showDetails.status || null, hidden_from_watch_next: false };
                                                                    if (!isShowSaved(showDetails.id)) { showUpdateData.added_at = new Date().toISOString(); showUpdateData.rating = 0; }
                                                                    await setDoc(doc(db, 'users', currentUid, 'shows', showDetails.id.toString()), showUpdateData, { merge: true });
                                                                }
                                                            }
                                                        }} className={`w-10 h-10 rounded-full transition-colors flex items-center justify-center z-10 ${isFullyWatched ? 'bg-primary text-white shadow-[0_0_10px_rgba(229,9,20,0.5)]' : 'bg-surfaceLight/50 text-textMuted hover:bg-primary hover:text-white'}`}><i className="fas fa-check-double"></i></button>
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-primary/20 text-primary' : 'bg-surfaceLight/50 text-textMuted'}`}><i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} transition-transform`}></i></div>
                                                    </div>
                                                </div>
                                                {isExpanded && (
                                                    <div className="bg-black/30 p-2 md:p-4 border-t border-surfaceLight max-h-96 overflow-y-auto">
                                                        {!seasonEpisodes[season.season_number] ? <div className="text-center p-6"><i className="fas fa-spinner fa-spin text-textMuted text-xl"></i></div> : (
                                                            <div className="space-y-1">
                                                                {seasonEpisodes[season.season_number].map(ep => {
                                                                    const isWatched = !!getWatchedEpisodeData(showDetails.id, ep.season_number, ep.episode_number);
                                                                    return (
                                                                        <div key={ep.id} className="flex gap-4 items-center p-3 hover:bg-surfaceLight/40 rounded-lg group transition-colors">
                                                                            <div className={`w-8 font-mono text-lg font-bold transition-colors text-right ${isWatched ? 'text-primary' : 'text-surfaceLight group-hover:text-textMuted'}`}>{ep.episode_number}</div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className={`text-sm md:text-base font-semibold truncate ${isWatched ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{ep.name}</div>
                                                                                <div className="text-xs text-textMuted flex items-center gap-2 mt-0.5">
                                                                                    <span><i className="far fa-calendar-alt"></i> {ep.air_date ? ep.air_date.split('-').reverse().join('/') : 'TBA'}</span>
                                                                                    {ep.runtime > 0 && <span><i className="far fa-clock"></i> {ep.runtime} min</span>}
                                                                                </div>
                                                                            </div>
                                                                            <button onClick={() => toggleWatchedEpisode(ep, showDetails.id, showDetails)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${isWatched ? 'bg-primary/20 text-primary border-primary shadow-[0_0_10px_rgba(229,9,20,0.3)]' : 'bg-surfaceLight/30 text-textMuted border-transparent hover:border-textMuted hover:text-white'}`}><i className="fas fa-eye"></i></button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : <p className="text-textMuted">No additional details found.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* --- MOVIE MODAL --- */}
            {selectedMovie && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-modal md:p-6">
                    <div className="absolute inset-0" onClick={() => setSelectedMovie(null)}></div>
                    <div className={`bg-surface flex flex-col overflow-hidden relative shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-surfaceLight z-10 animate-fade-in transition-all duration-300 ${isFullscreen ? 'w-full h-full max-w-none rounded-none' : 'w-full max-w-2xl max-h-[90vh] md:h-auto md:rounded-2xl rounded-t-3xl'}`}>
                        <div className="absolute top-4 right-4 z-20 flex gap-2 md:gap-3">
                            <button onClick={() => setIsFullscreen(!isFullscreen)} className="bg-black/60 hover:bg-surface text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/10 hidden md:flex"><i className={`fas fa-${isFullscreen ? 'compress' : 'expand'}`}></i></button>
                            <button onClick={() => setSelectedMovie(null)} className="bg-black/60 hover:bg-surface text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/10"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="relative h-56 md:h-80 flex-shrink-0 bg-surfaceLight">
                            {selectedMovie.backdrop_path ? <img src={`${TMDB_BACKDROP_URL}${selectedMovie.backdrop_path}`} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center opacity-20"><i className="fas fa-film text-6xl"></i></div>}
                            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full flex items-end gap-6">
                                <div className="hidden md:block flex-shrink-0 w-32 rounded-lg overflow-hidden border-2 border-surfaceLight/50 shadow-2xl">
                                     {selectedMovie.poster_path && <img src={`${TMDB_IMG_URL}${selectedMovie.poster_path}`} className="w-full" alt="" />}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-2 shadow-black drop-shadow-xl tracking-tight">{selectedMovie.title || selectedMovie.name}</h2>
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300 font-medium bg-black/40 w-max max-w-full px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                                        {selectedMovie.vote_average != null && <span className="flex items-center shrink-0"><i className="fas fa-star text-yellow-500 mr-1.5"></i> {formatRating(selectedMovie.vote_average)}/10</span>}
                                        {selectedMovie.release_date && <span className="shrink-0">• {getYear(selectedMovie.release_date)}</span>}
                                        {movieDetails?.runtime > 0 && <span className="shrink-0">• {movieDetails.runtime} min</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 md:p-8">
                            <div className="mb-8"><h3 className="text-lg font-bold text-white mb-3">Synopsis</h3><p className="text-gray-300 leading-relaxed text-sm md:text-base">{movieDetails?.overview || selectedMovie.overview || "No synopsis available."}</p></div>
                            {isMovieSaved(selectedMovie.id) && savedMoviesData.find(m => m.id === selectedMovie.id)?.status === 'watched' && (
                                <div className="mb-8 bg-surfaceLight/20 p-4 rounded-xl border border-surfaceLight flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
                                    <div className="flex items-center gap-2 text-white font-bold"><i className="fas fa-star text-yellow-500"></i> Your Rating</div>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map(star => {
                                            const currentRating = savedMoviesData.find(m => m.id === selectedMovie.id)?.rating || 0;
                                            return <button key={star} onClick={() => currentUid && setDoc(doc(db, 'users', currentUid, 'movies', selectedMovie.id.toString()), { rating: star }, { merge: true })} className={`text-2xl transition-transform hover:scale-110 ${star <= currentRating ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-surfaceLight hover:text-yellow-500/50'}`}><i className="fas fa-star"></i></button>;
                                        })}
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-col sm:flex-row gap-4 mt-8 border-t border-surfaceLight pt-8">
                                {isMovieSaved(selectedMovie.id) ? (
                                    <>
                                        <div className="flex-1 bg-surfaceLight/20 border border-surfaceLight rounded-xl p-4 flex items-center justify-between">
                                            <span className="text-textMuted font-bold text-sm">Status</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => currentUid && setDoc(doc(db, 'users', currentUid, 'movies', selectedMovie.id.toString()), { status: 'toWatch' }, { merge: true })} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${savedMoviesData.find(m => m.id === selectedMovie.id)?.status === 'toWatch' ? 'bg-blue-500 text-white' : 'bg-surface border border-surfaceLight text-textMuted hover:text-white'}`}>TO WATCH</button>
                                                <button onClick={() => currentUid && setDoc(doc(db, 'users', currentUid, 'movies', selectedMovie.id.toString()), { status: 'watched' }, { merge: true })} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${savedMoviesData.find(m => m.id === selectedMovie.id)?.status === 'watched' ? 'bg-green-500 text-white' : 'bg-surface border border-surfaceLight text-textMuted hover:text-white'}`}>WATCHED</button>
                                            </div>
                                        </div>
                                        <button onClick={() => { if(currentUid) { deleteDoc(doc(db, 'users', currentUid, 'movies', selectedMovie.id.toString())); setSelectedMovie(null); } }} className="shrink-0 flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-6 py-4 rounded-xl transition-colors font-bold"><i className="fas fa-trash-alt mr-2"></i> Remove</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => currentUid && setDoc(doc(db, 'users', currentUid, 'movies', selectedMovie.id.toString()), { title: selectedMovie.title || selectedMovie.name, poster_path: selectedMovie.poster_path, release_date: selectedMovie.release_date, status: 'toWatch', added_at: new Date().toISOString() })} className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-4 rounded-xl transition-colors font-bold shadow-lg shadow-blue-500/20"><i className="fas fa-bookmark"></i> Add to "To Watch"</button>
                                        <button onClick={() => currentUid && setDoc(doc(db, 'users', currentUid, 'movies', selectedMovie.id.toString()), { title: selectedMovie.title || selectedMovie.name, poster_path: selectedMovie.poster_path, release_date: selectedMovie.release_date, status: 'watched', added_at: new Date().toISOString() })} className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-xl transition-colors font-bold shadow-lg shadow-green-500/20"><i className="fas fa-check-circle"></i> Mark as Watched</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function App() {
    return <ErrorBoundary><MainApp /></ErrorBoundary>;
}