import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import Papa from 'papaparse';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot, writeBatch } from "firebase/firestore";

// --- ENVIRONMENT VARIABLES ---
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY; 
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_URL = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_URL = 'https://image.tmdb.org/t/p/w1280';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// AUTHENTICATION SCREEN
// ==========================================
const AuthScreen = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            console.error("Auth error:", err);
            // Traduzione degli errori più comuni di Firebase
            if (err.code === 'auth/email-already-in-use') setError('Questa email è già registrata.');
            else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') setError('Credenziali non valide. Riprova.');
            else if (err.code === 'auth/weak-password') setError('La password deve avere almeno 6 caratteri.');
            else setError(err.message);
        } finally {
            setIsLoading(false);
        }
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

                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                    {isLogin ? 'Bentornato Otaku' : 'Inizia il tuo viaggio'}
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
                            className="w-full bg-background border border-surfaceLight rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:shadow-[0_0_10px_rgba(229,9,20,0.2)] transition-all"
                            placeholder="tu@email.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-textMuted mb-1">Password</label>
                        <input 
                            type="password" 
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-background border border-surfaceLight rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:shadow-[0_0_10px_rgba(229,9,20,0.2)] transition-all"
                            placeholder="Minimo 6 caratteri"
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors mt-6 shadow-[0_0_15px_rgba(229,9,20,0.3)] disabled:opacity-50"
                    >
                        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : (isLogin ? 'Accedi' : 'Registrati')}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-textMuted">
                    {isLogin ? "Non hai un account? " : "Hai già un account? "}
                    <button 
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="text-white hover:text-primary font-bold transition-colors"
                    >
                        {isLogin ? 'Registrati ora' : 'Accedi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// UI COMPONENTS
// ==========================================

const NavItem = ({ id, icon, label, activeTab, setActiveTab }) => {
    const isActive = activeTab === id;
    return (
        <button 
            onClick={() => setActiveTab(id)}
            className={`flex flex-col md:flex-row items-center justify-center md:justify-start w-full md:w-auto py-3 md:py-4 md:px-6 gap-1 md:gap-4 transition-all duration-300 ${
                isActive ? 'text-white md:border-r-4 border-primary bg-surfaceLight/30 md:bg-transparent' : 'text-textMuted hover:text-white hover:bg-surfaceLight/20 md:hover:bg-transparent'
            }`}
        >
            <i className={`fas fa-${icon} text-xl md:text-2xl ${isActive ? 'text-primary scale-110' : ''} transition-all`}></i>
            <span className={`text-[10px] md:text-base font-medium mt-1 md:mt-0 ${isActive ? 'text-primary' : ''}`}>{label}</span>
        </button>
    );
};

const ShowCard = ({ show, openShowModal, isSaved, additionalUI }) => (
    <div onClick={() => openShowModal(show)} className="cursor-pointer group relative aspect-[2/3] bg-surfaceLight/30 rounded-xl border border-surfaceLight overflow-hidden transition-transform duration-300 hover:scale-105 hover:border-primary/50">
        {show.poster_path ? (
            <img src={`${TMDB_IMG_URL}${show.poster_path}`} alt={show.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                <i className="fas fa-tv text-4xl text-surfaceLight mb-3"></i>
                <span className="text-xs font-bold text-textMuted line-clamp-3">{show.name}</span>
            </div>
        )}
        {isSaved && <div className="absolute top-2 right-2 bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-black/50 z-10"><i className="fas fa-heart text-sm"></i></div>}
        {additionalUI}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
            <span className="text-white font-bold text-sm line-clamp-2">{show.name}</span>
            {show.first_air_date && <span className="text-primary text-xs font-medium">{show.first_air_date.substring(0,4)}</span>}
        </div>
    </div>
);

const ShowListRow = ({ show, openShowModal, status }) => (
    <div onClick={() => openShowModal(show)} className="flex items-center gap-4 bg-surfaceLight/10 hover:bg-surfaceLight/30 border border-surfaceLight/50 rounded-xl p-3 cursor-pointer transition-all group">
        <div className="w-12 h-16 md:w-16 md:h-24 flex-shrink-0 bg-surface rounded-md overflow-hidden shadow-md">
            {show.poster_path ? <img src={`${TMDB_IMG_URL}${show.poster_path}`} alt={show.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><i className="fas fa-tv text-textMuted"></i></div>}
        </div>
        <div className="flex-1 min-w-0">
            <h4 className="text-white font-bold text-sm md:text-lg truncate">{show.name}</h4>
            <div className="mt-1 md:mt-2">
                {status === 'completed' && <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded">Completata</span>}
                {status === 'toStart' && <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded">Da Iniziare</span>}
                {status === 'inProgress' && (
                    <div className="flex flex-col gap-1 w-full max-w-xs">
                        <div className="flex justify-between text-xs text-textMuted">
                            <span>Progresso</span>
                            <span>{show.watched_count} / {show.total_episodes || "?"}</span>
                        </div>
                        <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${show.total_episodes ? Math.min(100, (show.watched_count / show.total_episodes) * 100) : 10}%` }}></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
        <div className="px-2 text-textMuted group-hover:text-white transition-colors"><i className="fas fa-chevron-right"></i></div>
    </div>
);

const DiscoverTab = ({ savedShowsData, openShowModal, isShowSaved }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDiscover = async () => {
            setIsLoading(true);
            try {
                if (savedShowsData.length === 0) {
                    const res = await fetch(`${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}`);
                    const data = await res.json();
                    setRecommendations(data.results.slice(0, 10));
                } else {
                    const seedShows = [...savedShowsData].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3);
                    let recs = [];
                    
                    for (let show of seedShows) {
                        const res = await fetch(`${TMDB_BASE_URL}/tv/${show.id}/recommendations?api_key=${TMDB_API_KEY}`);
                        const data = await res.json();
                        recs = [...recs, ...data.results];
                    }

                    const uniqueRecs = [];
                    const seenIds = new Set(savedShowsData.map(s => s.id));
                    
                    for (let r of recs) {
                        if (!seenIds.has(r.id)) {
                            uniqueRecs.push(r);
                            seenIds.add(r.id);
                        }
                    }
                    
                    uniqueRecs.sort(() => 0.5 - Math.random());
                    setRecommendations(uniqueRecs.slice(0, 12));
                }
            } catch (e) { console.error("Error fetching recommendations", e); }
            finally { setIsLoading(false); }
        };
        fetchDiscover();
    }, [savedShowsData]);

    return (
        <div className="p-4 md:p-8 animate-fade-in pb-24">
            <h2 className="text-3xl font-bold mb-2">Esplora</h2>
            <p className="text-textMuted mb-8">{savedShowsData.length > 0 ? "Raccomandati per te in base ai tuoi preferiti." : "Le serie in tendenza mondiale questa settimana."}</p>
            
            {isLoading ? (
                <div className="flex justify-center p-10"><i className="fas fa-spinner fa-spin text-primary text-4xl"></i></div>
            ) : recommendations.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pb-20">
                    {recommendations.map(show => <ShowCard key={show.id} show={show} openShowModal={openShowModal} isSaved={isShowSaved(show.id)} />)}
                </div>
            ) : (
                <p className="text-textMuted">Nessuna raccomandazione disponibile al momento.</p>
            )}
        </div>
    );
};

const SearchTab = ({ searchQuery, setSearchQuery, isSearching, searchError, searchResults, openShowModal, isShowSaved }) => (
    <div className="p-4 md:p-8 animate-fade-in flex flex-col h-full min-h-[80vh] pb-24">
        <h2 className="text-3xl font-bold mb-2">Cerca TMDB</h2>
        <p className="text-textMuted mb-6">Trova la tua prossima serie da divorare.</p>
        
        <div className="relative mb-6">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Es. Breaking Bad, Naruto, The Office..." className="w-full bg-surface border border-surfaceLight rounded-full py-4 px-6 pl-14 text-white focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(229,9,20,0.3)] transition-all text-lg" />
            <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-textMuted text-lg"></i>
            {isSearching && <i className="fas fa-spinner fa-spin absolute right-6 top-1/2 -translate-y-1/2 text-primary text-lg"></i>}
        </div>

        {searchError && <div className="bg-primary/20 border border-primary text-white p-4 rounded-xl flex items-center gap-3 mb-6"><i className="fas fa-exclamation-triangle text-primary"></i><p>{searchError}</p></div>}

        {searchResults.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pb-20">
                {searchResults.map(show => <ShowCard key={show.id} show={show} openShowModal={openShowModal} isSaved={isShowSaved(show.id)} />)}
            </div>
        ) : (!isSearching && searchQuery.length === 0 && <div className="flex-1 flex flex-col items-center justify-center text-textMuted opacity-50 pb-20"><i className="fas fa-satellite-dish text-6xl mb-4"></i><p className="text-lg">Inizia a digitare per cercare su TMDB</p></div>)}
    </div>
);

// ==========================================
// MAIN APP COMPONENT
// ==========================================
const App = () => {
    // Auth State
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    
    // UI States
    const [activeTab, setActiveTab] = useState('home');
    const [modalDefaultFS, setModalDefaultFS] = useState(() => localStorage.getItem('tvtensei_fs_modal') === 'true');
    const [isFullscreen, setIsFullscreen] = useState(modalDefaultFS);

    // Data States
    const [savedShowsData, setSavedShowsData] = useState([]);
    const [watchedEpisodesData, setWatchedEpisodesData] = useState([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');

    const [selectedShow, setSelectedShow] = useState(null);
    const [showDetails, setShowDetails] = useState(null);
    const [expandedSeason, setExpandedSeason] = useState(null);
    const [seasonEpisodes, setSeasonEpisodes] = useState({});
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    const [upcomingEpisodes, setUpcomingEpisodes] = useState([]);
    const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

    const [stats, setStats] = useState({ months: 0, days: 0, hours: 0, totalMins: 0, topShows: [] });
    const [isCalculatingStats, setIsCalculatingStats] = useState(false);
    
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState("");
    const [historyData, setHistoryData] = useState({ completed: [], inProgress: [], toStart: [] });

    // --- FIREBASE AUTH INIT ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    const currentUid = user ? user.uid : null;

    // --- LOGOUT HANDLER ---
    const handleLogout = async () => {
        try {
            await signOut(auth);
            setSavedShowsData([]);
            setWatchedEpisodesData([]);
        } catch (error) {
            console.error("Errore durante il logout", error);
        }
    };

    // --- DATA SYNC ---
    useEffect(() => {
        if (!currentUid) return;
        
        const unsubShows = onSnapshot(collection(db, 'users', currentUid, 'shows'), (snapshot) => {
            const newShows = [];
            snapshot.forEach(d => newShows.push({ id: Number(d.id), ...d.data() }));
            setSavedShowsData(newShows);
        });

        const unsubEps = onSnapshot(collection(db, 'users', currentUid, 'watched_episodes'), (snapshot) => {
            const newEps = [];
            snapshot.forEach(d => newEps.push({ id: d.id, ...d.data() }));
            setWatchedEpisodesData(newEps);
        });

        return () => { unsubShows(); unsubEps(); };
    }, [currentUid]);

    // --- DATA LOGIC ---
    const isShowSaved = (showId) => savedShowsData.some(s => s.id === showId);
    const getWatchedEpisodeData = (showId, seasonNum, epNum) => watchedEpisodesData.find(w => w.show_id === showId && w.season_number === seasonNum && w.episode_number === epNum);

    const toggleFavoriteShow = async (show) => {
        if(!currentUid) return;
        const docRef = doc(db, 'users', currentUid, 'shows', show.id.toString());
        try {
            if (isShowSaved(show.id)) await deleteDoc(docRef);
            else await setDoc(docRef, { name: show.name, poster_path: show.poster_path, added_at: new Date().toISOString(), rating: 0, total_episodes: show.number_of_episodes || null });
        } catch (e) { console.error(e) }
    };

    const rateShow = async (showId, rating) => {
        if(!currentUid) return;
        try { await setDoc(doc(db, 'users', currentUid, 'shows', showId.toString()), { rating }, { merge: true }); } catch (e) {}
    };

    const toggleWatchedEpisode = async (ep, showId) => {
        if(!currentUid) return;
        const existing = getWatchedEpisodeData(showId, ep.season_number, ep.episode_number);
        try {
            if (existing) await deleteDoc(doc(db, 'users', currentUid, 'watched_episodes', existing.id));
            else await setDoc(doc(db, 'users', currentUid, 'watched_episodes', ep.id.toString()), { show_id: showId, season_number: ep.season_number, episode_number: ep.episode_number, runtime: ep.runtime || 0, watched_at: new Date().toISOString() });
        } catch (e) {}
    };

    const toggleSeasonWatched = async (showId, seasonNumber, episodeCount) => {
        if(!currentUid) return;
        const batch = writeBatch(db);
        const watchedInSeason = watchedEpisodesData.filter(ep => ep.show_id === showId && ep.season_number === seasonNumber);
        
        if (watchedInSeason.length >= episodeCount && episodeCount > 0) {
            watchedInSeason.forEach(w => batch.delete(doc(db, 'users', currentUid, 'watched_episodes', w.id)));
            try { await batch.commit(); } catch (e) {}
        } else {
            let eps = seasonEpisodes[seasonNumber];
            if (!eps) {
                try {
                    const res = await fetch(`${TMDB_BASE_URL}/tv/${showId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`);
                    if (res.ok) { const data = await res.json(); eps = data.episodes; setSeasonEpisodes(prev => ({ ...prev, [seasonNumber]: eps })); }
                } catch (err) {}
            }
            if (!eps) return;
            
            let batchCount = 0;
            eps.forEach(ep => {
                if (!getWatchedEpisodeData(showId, ep.season_number, ep.episode_number)) {
                    batch.set(doc(db, 'users', currentUid, 'watched_episodes', ep.id.toString()), { show_id: showId, season_number: ep.season_number, episode_number: ep.episode_number, runtime: ep.runtime || 0, watched_at: new Date().toISOString() });
                    batchCount++;
                }
            });
            if (batchCount > 0) try { await batch.commit(); } catch (e) {}
        }
    };

    // --- IMPORT LOGIC ---
    const handleZipImport = async (event) => {
        const file = event.target.files[0];
        if (!file || !currentUid) return;

        setIsImporting(true); setImportStatus("Scansione dell'archivio ZIP in corso...");

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
                setImportStatus(`Analizzo file: ${filename}...`);

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

            if (uniqueShowsArray.length === 0 && seenEpisodesArray.length === 0) throw new Error("I CSV sono stati letti ma non è stata riconosciuta alcuna serie o episodio.");

            setImportStatus(`Trovate ${uniqueShowsArray.length} serie uniche. Ricerca su TMDB in corso...`);

            const showIdMap = new Map();
            let processed = 0;
            
            for (const showName of uniqueShowsArray) {
                processed++;
                if (processed % 5 === 0) setImportStatus(`Sincronizzazione TMDB: ${processed}/${uniqueShowsArray.length} serie...`);
                
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

            setImportStatus(`Salvataggio su Firebase in corso...`);
            let batch = writeBatch(db);
            let batchCount = 0;
            let totalShowsImported = 0;
            let totalEpsImported = 0;

            for (const showName of uniqueShowsArray) {
                let foundShow = showIdMap.get(showName);
                if (foundShow) {
                    let totalEps = null;
                    try {
                        let resDetail = await fetch(`${TMDB_BASE_URL}/tv/${foundShow.id}?api_key=${TMDB_API_KEY}&language=en-US`);
                        let dataDetail = await resDetail.json();
                        totalEps = dataDetail.number_of_episodes;
                    } catch(e){}

                    batch.set(doc(db, 'users', currentUid, 'shows', foundShow.id.toString()), { name: foundShow.name, poster_path: foundShow.poster_path, added_at: new Date().toISOString(), rating: 0, total_episodes: totalEps }, { merge: true });
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
                    if (batchCount >= 400) { setImportStatus(`Salvati ${totalEpsImported} episodi su Firebase...`); await batch.commit(); batch = writeBatch(db); batchCount = 0; }
                }
            }

            if (batchCount > 0) await batch.commit();
            if (totalShowsImported === 0 && totalEpsImported === 0) throw new Error(`Nessuna serie o episodio convertito con successo.`);

            setImportStatus(`Finito! File analizzati: ${extractedData.filesScanned.length}. Salvati ${totalShowsImported} serie e ${totalEpsImported} episodi.`);
            setTimeout(() => { setIsImporting(false); setImportStatus(""); }, 5000);
        } catch (error) {
            console.error("Import error:", error); setImportStatus(`Errore: ${error.message}`);
            setTimeout(() => { setIsImporting(false); setImportStatus(""); }, 10000);
        }
    };

    // --- TMDB SEARCH & HISTORY ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                setIsSearching(true); setSearchError('');
                fetch(`${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery.trim())}&language=en-US`)
                    .then(r => r.json()).then(data => { setSearchResults(data.results || []); if (data.results.length === 0) setSearchError("Nessuna serie trovata con questo nome."); })
                    .catch(err => { setSearchError(err.message); setSearchResults([]); })
                    .finally(() => setIsSearching(false));
            } else if (searchQuery.trim().length === 0) { setSearchResults([]); setSearchError(''); }
        }, 600);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    useEffect(() => {
        const processHistory = async () => {
            const toStart = [], inProgress = [], completed = [];
            const showCounts = {};
            watchedEpisodesData.forEach(ep => showCounts[ep.show_id] = (showCounts[ep.show_id] || 0) + 1);

            for (let show of savedShowsData) {
                const count = showCounts[show.id] || 0;
                const s = { ...show, watched_count: count };

                if (count === 0) toStart.push(s);
                else {
                    let totalEps = s.total_episodes;
                    if (!totalEps) {
                        try {
                            const res = await fetch(`${TMDB_BASE_URL}/tv/${s.id}?api_key=${TMDB_API_KEY}&language=en-US`);
                            totalEps = (await res.json()).number_of_episodes;
                            if (currentUid) await setDoc(doc(db, 'users', currentUid, 'shows', s.id.toString()), { total_episodes: totalEps }, { merge: true });
                        } catch(e) { totalEps = 9999; }
                    }
                    s.total_episodes = totalEps;
                    if (totalEps && count >= totalEps) completed.push(s); else inProgress.push(s);
                }
            }
            const sortByName = (a, b) => a.name.localeCompare(b.name);
            setHistoryData({ completed: completed.sort(sortByName), inProgress: inProgress.sort(sortByName), toStart: toStart.sort(sortByName) });
        };
        processHistory();
    }, [savedShowsData, watchedEpisodesData, currentUid]);

    useEffect(() => {
        const fetchUpcomingEpisodes = async () => {
            if (savedShowsData.length === 0) { setUpcomingEpisodes([]); return; }
            setIsLoadingCalendar(true);
            try {
                const promises = savedShowsData.map(async (show) => {
                    const res = await fetch(`${TMDB_BASE_URL}/tv/${show.id}?api_key=${TMDB_API_KEY}&language=en-US`);
                    const data = await res.json();
                    if (data.next_episode_to_air) return { showId: data.id, showName: data.name, posterPath: data.poster_path, episode: data.next_episode_to_air };
                    return null;
                });
                const results = (await Promise.all(promises)).filter(ep => ep !== null).sort((a, b) => new Date(a.episode.air_date) - new Date(b.episode.air_date));
                setUpcomingEpisodes(results);
            } catch (error) {} finally { setIsLoadingCalendar(false); }
        };
        fetchUpcomingEpisodes();
    }, [savedShowsData]);

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

    // --- MODAL CONTROLS ---
    const openShowModal = async (show) => {
        setIsFullscreen(modalDefaultFS); setSelectedShow(show); setShowDetails(null); setExpandedSeason(null); setSeasonEpisodes({}); setIsLoadingDetails(true);
        try {
            const res = await fetch(`${TMDB_BASE_URL}/tv/${show.id}?api_key=${TMDB_API_KEY}&language=en-US`);
            const data = await res.json();
            setShowDetails(data);
            if (currentUid && isShowSaved(show.id)) await setDoc(doc(db, 'users', currentUid, 'shows', show.id.toString()), { total_episodes: data.number_of_episodes }, { merge: true });
        } catch (err) {} finally { setIsLoadingDetails(false); }
    };
    const toggleSeason = async (tvId, seasonNumber) => {
        if (expandedSeason === seasonNumber) { setExpandedSeason(null); return; }
        setExpandedSeason(seasonNumber);
        if (!seasonEpisodes[seasonNumber]) {
            try {
                const res = await fetch(`${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`);
                if (res.ok) {
                    const data = await res.json();
                    setSeasonEpisodes(prev => ({ ...prev, [seasonNumber]: data.episodes }));
                }
            } catch (err) {}
        }
    };
    const closeModal = () => setSelectedShow(null);
    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);
    const toggleDefaultFS = () => { const newVal = !modalDefaultFS; setModalDefaultFS(newVal); localStorage.setItem('tvtensei_fs_modal', newVal); };

    // ==========================================
    // RENDER: LOADING OR AUTH OR APP
    // ==========================================
    if (!isAuthReady) {
        return (
            <div className="h-screen w-screen bg-background flex flex-col items-center justify-center text-white">
                <i className="fas fa-play text-primary text-4xl mb-4 animate-bounce"></i>
                <h1 className="text-2xl font-bold tracking-tight">TV<span className="text-primary">Tensei</span></h1>
            </div>
        );
    }

    if (!user) {
        return <AuthScreen />;
    }

    // ==========================================
    // MAIN APP RENDER
    // ==========================================
    return (
        <div className="flex flex-col md:flex-row h-screen bg-background font-sans text-textMain">
            <nav className="order-2 md:order-1 w-full md:w-64 bg-surface border-t md:border-t-0 md:border-r border-surfaceLight flex md:flex-col justify-around md:justify-start pb-safe md:py-8 z-20 flex-shrink-0">
                <div className="hidden md:flex px-6 mb-10 items-center gap-3">
                    <div className="bg-primary text-white w-10 h-10 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.3)]"><i className="fas fa-play"></i></div>
                    <h1 className="text-2xl font-bold tracking-tight">TV<span className="text-primary">Tensei</span></h1>
                </div>
                <div className="flex w-full md:flex-col gap-0 md:gap-2">
                    <NavItem id="home" icon="compass" label="Esplora" activeTab={activeTab} setActiveTab={setActiveTab}/>
                    <NavItem id="search" icon="search" label="Cerca" activeTab={activeTab} setActiveTab={setActiveTab}/>
                    <NavItem id="history" icon="list-ul" label="Storico" activeTab={activeTab} setActiveTab={setActiveTab}/>
                    <NavItem id="calendar" icon="calendar-days" label="Calendario" activeTab={activeTab} setActiveTab={setActiveTab}/>
                    <NavItem id="profile" icon="user" label="Profilo" activeTab={activeTab} setActiveTab={setActiveTab}/>
                </div>
            </nav>

            <header className="md:hidden order-1 bg-surface border-b border-surfaceLight p-4 flex items-center justify-center z-10 sticky top-0">
                <div className="bg-primary text-white w-7 h-7 rounded-md flex items-center justify-center mr-2 shadow-[0_0_10px_rgba(229,9,20,0.3)]"><i className="fas fa-play text-xs"></i></div>
                <h1 className="text-xl font-bold tracking-tight">TV<span className="text-primary">Tensei</span></h1>
            </header>

            <main className="order-1 md:order-2 flex-1 overflow-y-auto hide-scrollbar relative pb-16 md:pb-0 bg-background">
                <div className="max-w-6xl mx-auto">
                    {activeTab === 'home' && <DiscoverTab savedShowsData={savedShowsData} openShowModal={openShowModal} isShowSaved={isShowSaved} />}
                    {activeTab === 'search' && <SearchTab searchQuery={searchQuery} setSearchQuery={setSearchQuery} isSearching={isSearching} searchError={searchError} searchResults={searchResults} openShowModal={openShowModal} isShowSaved={isShowSaved} />}
                    
                    {activeTab === 'calendar' && (
                        <div className="p-4 md:p-8 animate-fade-in pb-24">
                            <h2 className="text-3xl font-bold mb-2">Calendario</h2>
                            <p className="text-textMuted mb-8">I prossimi episodi delle tue serie preferite.</p>
                            {isLoadingCalendar ? <div className="flex justify-center p-10"><i className="fas fa-spinner fa-spin text-primary text-4xl"></i></div> : upcomingEpisodes.length > 0 ? (
                                <div className="space-y-4">
                                    {upcomingEpisodes.map(item => (
                                        <div key={item.episode.id} onClick={() => openShowModal({ id: item.showId, name: item.showName, poster_path: item.posterPath })} className="bg-surface p-4 rounded-xl border border-surfaceLight flex items-center gap-4 transition-transform hover:-translate-y-1 cursor-pointer hover:border-primary/50">
                                            {item.posterPath ? <img src={`${TMDB_IMG_URL}${item.posterPath}`} className="w-16 h-24 object-cover rounded-lg shadow-md" alt={item.showName} /> : <div className="w-16 h-24 bg-surfaceLight/50 rounded-lg flex items-center justify-center text-textMuted"><i className="fas fa-tv"></i></div>}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-primary font-bold mb-1 truncate">{item.showName}</div>
                                                <div className="text-sm md:text-lg font-bold text-white mb-1 truncate">{item.episode.name}</div>
                                                <div className="text-xs md:text-sm text-textMuted">Stagione {item.episode.season_number} • Episodio {item.episode.episode_number}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-white font-bold text-xs md:text-sm bg-primary px-3 py-1 rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)] whitespace-nowrap">{item.episode.air_date ? item.episode.air_date.split('-').reverse().join('/') : 'TBA'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <div className="text-center p-8 border-2 border-dashed border-surfaceLight rounded-xl text-textMuted"><i className="fas fa-calendar-times text-4xl mb-3 opacity-50"></i><p>Nessun nuovo episodio in programma.</p></div>}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="p-4 md:p-8 animate-fade-in pb-24">
                            <h2 className="text-3xl font-bold mb-2">Storico</h2>
                            <p className="text-textMuted mb-8">La tua libreria divisa per stato di visione.</p>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-surfaceLight pb-2"><i className="fas fa-play-circle text-primary"></i> In Corso <span className="text-sm text-textMuted bg-surfaceLight px-2 py-0.5 rounded-full">{historyData.inProgress.length}</span></h3>
                                <div className="flex flex-col gap-3 mb-10">{historyData.inProgress.length > 0 ? historyData.inProgress.map(show => <ShowListRow key={show.id} show={show} openShowModal={openShowModal} status="inProgress" />) : <p className="text-textMuted text-sm mb-6">Nessuna serie in corso.</p>}</div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-surfaceLight pb-2"><i className="fas fa-check-circle text-green-500"></i> Completate <span className="text-sm text-textMuted bg-surfaceLight px-2 py-0.5 rounded-full">{historyData.completed.length}</span></h3>
                                <div className="flex flex-col gap-3 mb-10">{historyData.completed.length > 0 ? historyData.completed.map(show => <ShowListRow key={show.id} show={show} openShowModal={openShowModal} status="completed" />) : <p className="text-textMuted text-sm mb-6">Non hai completato nessuna serie.</p>}</div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-surfaceLight pb-2"><i className="fas fa-bookmark text-blue-400"></i> Da Iniziare <span className="text-sm text-textMuted bg-surfaceLight px-2 py-0.5 rounded-full">{historyData.toStart.length}</span></h3>
                                <div className="flex flex-col gap-3 mb-10">{historyData.toStart.length > 0 ? historyData.toStart.map(show => <ShowListRow key={show.id} show={show} openShowModal={openShowModal} status="toStart" />) : <p className="text-textMuted text-sm mb-6">Nessuna serie salvata "da iniziare".</p>}</div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="p-4 md:p-8 animate-fade-in pb-24">
                            <h2 className="text-3xl font-bold mb-2">Profilo</h2>
                            <p className="text-textMuted mb-8">Le tue statistiche da Otaku.</p>
                            
                            {isCalculatingStats ? <div className="flex flex-col items-center justify-center p-8 border border-surfaceLight rounded-xl mb-8"><i className="fas fa-satellite-dish fa-spin text-primary text-3xl mb-3"></i><p className="text-textMuted text-sm">Calcolando il tempo perso...</p></div> : (
                                <div className="mb-8 bg-surfaceLight/10 border border-surfaceLight rounded-xl p-6">
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div><div className="text-3xl md:text-5xl font-extrabold text-primary mb-1 drop-shadow-[0_0_10px_rgba(229,9,20,0.4)]">{stats.months}</div><div className="text-xs md:text-sm text-textMuted uppercase tracking-wider font-semibold">Mesi</div></div>
                                        <div><div className="text-3xl md:text-5xl font-extrabold text-white mb-1">{stats.days}</div><div className="text-xs md:text-sm text-textMuted uppercase tracking-wider font-semibold">Giorni</div></div>
                                        <div><div className="text-3xl md:text-5xl font-extrabold text-white mb-1">{stats.hours}</div><div className="text-xs md:text-sm text-textMuted uppercase tracking-wider font-semibold">Ore</div></div>
                                    </div>
                                    {stats.topShows.length > 0 && (
                                        <div className="mt-8 pt-6 border-t border-surfaceLight/50">
                                            <h4 className="text-sm text-textMuted uppercase tracking-wider font-bold mb-4"><i className="fas fa-trophy text-yellow-500 mr-2"></i> Le Serie Più Viste</h4>
                                            <div className="space-y-4">
                                                {stats.topShows.map((show, i) => (
                                                    <div key={i} className="group">
                                                        <div className="flex justify-between text-xs md:text-sm text-gray-300 mb-1"><span className="font-semibold truncate pr-4">{show.name}</span><span className="flex-shrink-0 text-textMuted">{Math.floor(show.time / 60)}h {show.time % 60}m</span></div>
                                                        <div className="h-1.5 w-full bg-black rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${i === 0 ? 'bg-primary' : 'bg-surfaceLight group-hover:bg-primary/50'}`} style={{ width: `${stats.topShows[0].time > 0 ? (show.time / stats.topShows[0].time) * 100 : 0}%` }}></div></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-8 mb-10">
                                <h4 className="text-sm text-textMuted uppercase tracking-wider font-bold mb-4"><i className="fas fa-cog mr-2 text-primary"></i> Impostazioni</h4>
                                <div className="bg-surfaceLight/10 border border-surfaceLight rounded-xl p-4 flex justify-between items-center hover:bg-surfaceLight/20 transition-colors">
                                    <div><h4 className="text-white font-bold text-sm md:text-base">Schermo Intero</h4><p className="text-xs text-textMuted mt-1">Apri le serie in fullscreen di default</p></div>
                                    <button onClick={toggleDefaultFS} className={`w-12 h-6 md:w-14 md:h-7 rounded-full relative transition-colors shadow-inner ${modalDefaultFS ? 'bg-primary' : 'bg-surfaceLight'}`}><div className={`absolute top-1 left-1 w-4 h-4 md:w-5 md:h-5 rounded-full bg-white transition-transform ${modalDefaultFS ? 'translate-x-6 md:translate-x-7' : 'translate-x-0'}`}></div></button>
                                </div>
                            </div>

                            <div className="mt-8 mb-10">
                                <h4 className="text-sm text-textMuted uppercase tracking-wider font-bold mb-4"><i className="fas fa-file-import mr-2 text-primary"></i> Importa da TV Time</h4>
                                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors relative bg-surfaceLight/10 ${isImporting ? 'border-primary opacity-80' : 'border-surfaceLight hover:border-primary cursor-pointer group'}`}>
                                    <input type="file" accept=".zip" onChange={handleZipImport} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isImporting} />
                                    {isImporting ? (
                                        <div className="flex flex-col items-center justify-center"><i className="fas fa-spinner fa-spin text-3xl mb-3 text-primary"></i><p className="text-white font-medium mt-2">{importStatus}</p></div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pointer-events-none"><i className="fas fa-file-archive text-4xl mb-3 text-textMuted group-hover:text-primary transition-colors"></i><h3 className="font-bold text-lg text-white mb-1">Carica archivio .zip</h3><p className="text-textMuted text-sm">Trascina qui il file esportato da TV Time</p></div>
                                    )}
                                </div>
                            </div>

                            {/* LOGOUT BUTTON */}
                            <div className="mt-12 mb-10 border-t border-surfaceLight pt-8">
                                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-transparent border border-red-600/50 text-red-500 hover:bg-red-600 hover:text-white font-bold py-3 px-4 rounded-xl transition-all">
                                    <i className="fas fa-sign-out-alt"></i> Disconnetti Account
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* FULLSCREEN / WINDOWED MODAL */}
            {selectedShow && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-modal md:p-6">
                    <div className="absolute inset-0" onClick={closeModal}></div>
                    <div className={`bg-surface flex flex-col overflow-hidden relative shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-surfaceLight z-10 animate-fade-in transition-all duration-300 ${isFullscreen ? 'w-full h-full max-w-none rounded-none' : 'w-full max-w-4xl max-h-[90vh] md:h-[85vh] md:rounded-2xl rounded-t-3xl'}`}>
                        
                        <div className="absolute top-4 right-4 z-20 flex gap-2 md:gap-3">
                            <button onClick={toggleFullscreen} className="bg-black/60 hover:bg-surface text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/10 hidden md:flex" title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}><i className={`fas fa-${isFullscreen ? 'compress' : 'expand'}`}></i></button>
                            <button onClick={() => toggleFavoriteShow(selectedShow)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-md border ${isShowSaved(selectedShow.id) ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(229,9,20,0.5)]' : 'bg-black/60 text-white hover:bg-surface border-white/10'}`} title={isShowSaved(selectedShow.id) ? "Remove from Favorites" : "Add to Favorites"}><i className={`${isShowSaved(selectedShow.id) ? 'fas' : 'far'} fa-heart`}></i></button>
                            <button onClick={closeModal} className="bg-black/60 hover:bg-surface text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/10"><i className="fas fa-times"></i></button>
                        </div>

                        <div className="relative h-56 md:h-80 flex-shrink-0 bg-surfaceLight">
                            {selectedShow.backdrop_path ? <img src={`${TMDB_BACKDROP_URL}${selectedShow.backdrop_path}`} className="w-full h-full object-cover" alt="Backdrop" /> : <div className="w-full h-full flex items-center justify-center opacity-20"><i className="fas fa-image text-6xl"></i></div>}
                            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full flex items-end gap-6">
                                <div className="hidden md:block flex-shrink-0 w-32 rounded-lg overflow-hidden border-2 border-surfaceLight/50 shadow-2xl">
                                     {selectedShow.poster_path ? <img src={`${TMDB_IMG_URL}${selectedShow.poster_path}`} className="w-full" alt="Poster" /> : null}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-2 shadow-black drop-shadow-xl tracking-tight">{selectedShow.name}</h2>
                                    <div className="flex items-center gap-4 text-sm text-gray-300 font-medium bg-black/40 w-max px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                                        <span className="flex items-center"><i className="fas fa-star text-yellow-500 mr-1.5"></i> {selectedShow.vote_average?.toFixed(1)}/10</span>
                                        {selectedShow.first_air_date && <span>&bull; {selectedShow.first_air_date.substring(0,4)}</span>}
                                        <span className="uppercase text-primary font-bold">{selectedShow.original_language}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-8">
                            <div className="mb-8">
                                <h3 className="text-lg font-bold text-white mb-3">Sinossi</h3>
                                <p className="text-gray-300 leading-relaxed text-sm md:text-base">{showDetails?.overview || selectedShow.overview || "Nessuna sinossi disponibile per questa serie."}</p>
                            </div>

                            {isShowSaved(selectedShow.id) && (
                                <div className="mb-8 bg-surfaceLight/20 p-4 rounded-xl border border-surfaceLight flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
                                    <div className="flex items-center gap-2 text-white font-bold"><i className="fas fa-star text-yellow-500"></i> Il Tuo Voto</div>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map(star => {
                                            const currentRating = savedShowsData.find(s => s.id === selectedShow.id)?.rating || 0;
                                            return <button key={star} onClick={() => rateShow(selectedShow.id, star)} className={`text-2xl transition-transform hover:scale-110 ${star <= currentRating ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-surfaceLight hover:text-yellow-500/50'}`}><i className="fas fa-star"></i></button>;
                                        })}
                                    </div>
                                </div>
                            )}

                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><i className="fas fa-layer-group text-primary"></i> Stagioni ed Episodi</h3>
                            
                            {isLoadingDetails ? <div className="flex justify-center p-8"><i className="fas fa-spinner fa-spin text-primary text-3xl"></i></div> : showDetails && showDetails.seasons ? (
                                <div className="space-y-3 pb-8">
                                    {showDetails.seasons.filter(s => s.season_number > 0).map(season => {
                                        const watchedInSeason = watchedEpisodesData.filter(ep => ep.show_id === showDetails.id && ep.season_number === season.season_number);
                                        const isFullyWatched = watchedInSeason.length >= season.episode_count && season.episode_count > 0;

                                        return (
                                            <div key={season.id} className="bg-surfaceLight/20 rounded-xl border border-surfaceLight overflow-hidden transition-all">
                                                <div className="w-full flex items-center justify-between p-3 md:p-4 hover:bg-surfaceLight/40 transition-colors cursor-pointer" onClick={() => toggleSeason(showDetails.id, season.season_number)}>
                                                    <div className="flex items-center gap-4">
                                                        {season.poster_path ? <img src={`${TMDB_IMG_URL}${season.poster_path}`} className="w-12 h-16 object-cover rounded shadow-md" alt={season.name} /> : <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center"><i className="fas fa-tv text-4xl text-surfaceLight mb-3"></i></div>}
                                                        <div className="text-left">
                                                            <div className="font-bold text-white text-lg">{season.name}</div>
                                                            <div className="text-sm text-textMuted">{watchedInSeason.length} / {season.episode_count} Episodi {season.air_date ? `• ${season.air_date.substring(0,4)}` : ''}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={(e) => { e.stopPropagation(); toggleSeasonWatched(showDetails.id, season.season_number, season.episode_count); }} className={`w-10 h-10 rounded-full transition-colors flex items-center justify-center z-10 ${isFullyWatched ? 'bg-primary text-white shadow-[0_0_10px_rgba(229,9,20,0.5)]' : 'bg-surfaceLight/50 text-textMuted hover:bg-primary hover:text-white'}`} title={isFullyWatched ? "Mark season as unwatched" : "Mark entire season as watched"}><i className="fas fa-check-double"></i></button>
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${expandedSeason === season.season_number ? 'bg-primary/20 text-primary' : 'bg-surfaceLight/50 text-textMuted'}`}><i className={`fas fa-chevron-${expandedSeason === season.season_number ? 'up' : 'down'} transition-transform`}></i></div>
                                                    </div>
                                                </div>

                                                {expandedSeason === season.season_number && (
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
                                                                            <button onClick={() => toggleWatchedEpisode(ep, showDetails.id)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${isWatched ? 'bg-primary/20 text-primary border-primary shadow-[0_0_10px_rgba(229,9,20,0.3)]' : 'bg-surfaceLight/30 text-textMuted border-transparent hover:border-textMuted hover:text-white'}`} title={isWatched ? "Mark as unwatched" : "Mark as watched"}><i className="fas fa-eye"></i></button>
                                                                        </div>
                                                                    );
                                                                })}
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
                </div>
            );
        };

        export default App;