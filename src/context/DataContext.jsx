import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
    doc, 
    setDoc, 
    deleteDoc, 
    collection, 
    onSnapshot 
} from "firebase/firestore";
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
    const { currentUid } = useAuth();

    const [savedShowsData, setSavedShowsData] = useState([]);
    const [watchedEpisodesData, setWatchedEpisodesData] = useState([]);
    const [savedMoviesData, setSavedMoviesData] = useState([]);
    const [historyShows, setHistoryShows] = useState([]);

    // Real-time Firestore Subscriptions
    useEffect(() => {
        if (!currentUid || !db) {
            setSavedShowsData([]);
            setWatchedEpisodesData([]);
            setSavedMoviesData([]);
            return;
        }

        const unsubShows = onSnapshot(
            collection(db, 'users', currentUid, 'shows'), 
            (snap) => setSavedShowsData(snap.docs.map(d => ({ id: Number(d.id), ...d.data() })))
        );

        const unsubEps = onSnapshot(
            collection(db, 'users', currentUid, 'watched_episodes'), 
            (snap) => setWatchedEpisodesData(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );

        const unsubMovies = onSnapshot(
            collection(db, 'users', currentUid, 'movies'), 
            (snap) => setSavedMoviesData(snap.docs.map(d => ({ id: Number(d.id), ...d.data() })))
        );

        return () => {
            unsubShows();
            unsubEps();
            unsubMovies();
        };
    }, [currentUid]);

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

        for (const show of savedShowsData) {
            const count = showCounts[show.id] || 0;
            const s = { ...show, watched_count: count };

            s.last_watched_at = showLastWatched[show.id] || show.added_at || 0;
            s.year = show.first_air_date ? parseInt(show.first_air_date.substring(0, 4)) : 0;

            if (count === 0) {
                s.status = 'toStart';
            } else {
                const totalEps = s.total_episodes || 9999;
                const isEnded = ['Ended', 'Canceled'].includes(s.show_status);
                
                if (count >= totalEps) s.status = isEnded ? 'completed' : 'upToDate';
                else s.status = 'inProgress';
            }
            
            s.progressPercentage = s.total_episodes ? Math.min(100, (s.watched_count / s.total_episodes) * 100) : 0;
            flatShows.push(s);
        }
        setHistoryShows(flatShows);
    }, [savedShowsData, watchedEpisodesData]);

    // Helpers
    const isShowSaved = (id) => savedShowsData.some(s => s.id === id);
    const isShowHidden = (id) => savedShowsData.find(s => s.id === id)?.hidden_from_watch_next === true;
    const isMovieSaved = (id) => savedMoviesData.some(m => m.id === id);
    const getWatchedEpisodeData = (showId, sNum, eNum) => 
        watchedEpisodesData.find(w => w.show_id === showId && w.season_number === sNum && w.episode_number === eNum);

    // Actions
    const toggleLibraryShow = async (show, showDetails = null) => {
        if (!currentUid || !db) return;
        const docRef = doc(db, 'users', currentUid, 'shows', show.id.toString());
        try {
            if (isShowSaved(show.id)) {
                await deleteDoc(docRef);
            } else {
                await setDoc(docRef, {
                    name: show.name,
                    poster_path: show.poster_path || null,
                    added_at: new Date().toISOString(),
                    rating: 0,
                    total_episodes: showDetails?.number_of_episodes || show.number_of_episodes || null,
                    show_status: showDetails?.status || show.status || null,
                    first_air_date: showDetails?.first_air_date || show.first_air_date || null,
                    hidden_from_watch_next: false
                });
            }
        } catch (e) {
            console.error("Error toggling library show:", e);
        }
    };

    const toggleHideShow = async (showId) => {
        if (!currentUid || !db) return;
        try {
            const currentStatus = isShowHidden(showId);
            await setDoc(doc(db, 'users', currentUid, 'shows', showId.toString()), { 
                hidden_from_watch_next: !currentStatus 
            }, { merge: true });
        } catch (e) {
            console.error("Error toggling hide status:", e);
        }
    };

    const toggleWatchedEpisode = async (ep, showId, optionalShowDetails = null) => {
        if (!currentUid || !db) return;
        const existing = getWatchedEpisodeData(showId, ep.season_number, ep.episode_number);
        try {
            if (existing) {
                await deleteDoc(doc(db, 'users', currentUid, 'watched_episodes', existing.id));
            } else {
                await setDoc(doc(db, 'users', currentUid, 'watched_episodes', ep.id.toString()), {
                    show_id: showId,
                    season_number: ep.season_number,
                    episode_number: ep.episode_number,
                    runtime: ep.runtime || 0,
                    watched_at: new Date().toISOString()
                });
                
                const showUpdateData = {
                    name: optionalShowDetails?.name || "Unknown", 
                    poster_path: optionalShowDetails?.poster_path || null,
                    total_episodes: optionalShowDetails?.number_of_episodes || optionalShowDetails?.total_episodes || null, 
                    show_status: optionalShowDetails?.status || optionalShowDetails?.show_status || null, 
                    first_air_date: optionalShowDetails?.first_air_date || null,
                    hidden_from_watch_next: false // Auto un-hide when watching new episode
                };
                
                if (!isShowSaved(showId)) {
                    showUpdateData.added_at = new Date().toISOString();
                    showUpdateData.rating = 0;
                }
                
                await setDoc(doc(db, 'users', currentUid, 'shows', showId.toString()), showUpdateData, { merge: true });
            }
        } catch (e) {
            console.error("Error toggling watched episode:", e);
        }
    };

    const updateShowRating = async (showId, rating) => {
        if (!currentUid || !db) return;
        try {
            await setDoc(doc(db, 'users', currentUid, 'shows', showId.toString()), { rating }, { merge: true });
        } catch (e) {
            console.error("Error updating show rating:", e);
        }
    };

    const updateMovieRating = async (movieId, rating) => {
        if (!currentUid || !db) return;
        try {
            await setDoc(doc(db, 'users', currentUid, 'movies', movieId.toString()), { rating }, { merge: true });
        } catch (e) {
            console.error("Error updating movie rating:", e);
        }
    };

    const saveMovie = async (movie, status = 'toWatch') => {
        if (!currentUid || !db) return;
        try {
            await setDoc(doc(db, 'users', currentUid, 'movies', movie.id.toString()), {
                title: movie.title || movie.name,
                poster_path: movie.poster_path || null,
                release_date: movie.release_date || null,
                status,
                added_at: new Date().toISOString()
            }, { merge: true });
        } catch (e) {
            console.error("Error saving movie:", e);
        }
    };

    const setMovieStatus = async (movieId, status) => {
        if (!currentUid || !db) return;
        try {
            await setDoc(doc(db, 'users', currentUid, 'movies', movieId.toString()), { status }, { merge: true });
        } catch (e) {
            console.error("Error setting movie status:", e);
        }
    };

    const removeMovie = async (movieId) => {
        if (!currentUid || !db) return;
        try {
            await deleteDoc(doc(db, 'users', currentUid, 'movies', movieId.toString()));
        } catch (e) {
            console.error("Error removing movie:", e);
        }
    };

    return (
        <DataContext.Provider value={{
            savedShowsData,
            watchedEpisodesData,
            savedMoviesData,
            historyShows,
            isShowSaved,
            isShowHidden,
            isMovieSaved,
            getWatchedEpisodeData,
            toggleLibraryShow,
            toggleHideShow,
            toggleWatchedEpisode,
            updateShowRating,
            updateMovieRating,
            saveMovie,
            setMovieStatus,
            removeMovie
        }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
}
