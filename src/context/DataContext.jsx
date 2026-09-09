import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
    doc, 
    setDoc, 
    deleteDoc, 
    collection, 
    onSnapshot 
} from "firebase/firestore";
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { getShowDetails, getSeasonDetails } from '../services/tmdb';
import { calculateWatchStats } from '../utils/stats';

const DataContext = createContext(null);

export function DataProvider({ children }) {
    const { currentUid } = useAuth();

    const [savedShowsData, setSavedShowsData] = useState([]);
    const [watchedEpisodesData, setWatchedEpisodesData] = useState([]);
    const [savedMoviesData, setSavedMoviesData] = useState([]);
    const [historyShows, setHistoryShows] = useState([]);

    // Derived State kept in memory across tab switches
    const [watchNextList, setWatchNextList] = useState([]);
    const [isLoadingWatchNext, setIsLoadingWatchNext] = useState(false);
    
    const [upcomingEpisodes, setUpcomingEpisodes] = useState([]);
    const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

    const [stats, setStats] = useState({ months: 0, days: 0, hours: 0, totalMins: 0, topShows: [] });
    const [isCalculatingStats, setIsCalculatingStats] = useState(false);

    // Real-time Firestore Subscriptions
    useEffect(() => {
        if (!currentUid || !db) {
            setSavedShowsData([]);
            setWatchedEpisodesData([]);
            setSavedMoviesData([]);
            setHistoryShows([]);
            setWatchNextList([]);
            setUpcomingEpisodes([]);
            setStats({ months: 0, days: 0, hours: 0, totalMins: 0, topShows: [] });
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
            const sId = Number(ep.show_id);
            showCounts[sId] = (showCounts[sId] || 0) + 1;
            if (!showLastWatched[sId] || new Date(ep.watched_at) > new Date(showLastWatched[sId])) {
                showLastWatched[sId] = ep.watched_at;
            }
        });

        for (const show of savedShowsData) {
            const showId = Number(show.id);
            const count = showCounts[showId] || 0;
            const s = { ...show, watched_count: count };

            s.last_watched_at = showLastWatched[showId] || show.added_at || 0;
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

    // Watch Next Queue Calculation
    const isBuildingWatchNext = useRef(false);
    useEffect(() => {
        let isMounted = true;

        const buildWatchNext = async () => {
            if (historyShows.length === 0) {
                setWatchNextList([]);
                return;
            }
            if (isBuildingWatchNext.current) return;
            isBuildingWatchNext.current = true;
            setIsLoadingWatchNext(true);

            try {
                const queue = [];
                const today = new Date(); 
                today.setHours(0,0,0,0);
                const tomorrow = new Date(today); 
                tomorrow.setDate(tomorrow.getDate() + 1);

                // Candidates for Watch Next: any saved show with at least 1 watched episode that isn't hidden
                const candidateShows = historyShows.filter(s => s.watched_count > 0 && !s.hidden_from_watch_next);

                for (let i = 0; i < candidateShows.length; i += 5) {
                    const chunk = candidateShows.slice(i, i + 5);
                    const promises = chunk.map(async (show) => {
                        const watchedEps = watchedEpisodesData.filter(ep => Number(ep.show_id) === Number(show.id));
                        if (watchedEps.length === 0) return null;

                        // Find highest watched episode numerically
                        const highest = watchedEps.reduce((prev, curr) => {
                            const prevS = Number(prev.season_number) || 0;
                            const currS = Number(curr.season_number) || 0;
                            const prevE = Number(prev.episode_number) || 0;
                            const currE = Number(curr.episode_number) || 0;

                            if (currS > prevS) return curr;
                            if (currS === prevS && currE > prevE) return curr;
                            return prev;
                        });

                        const targetSeason = parseInt(highest.season_number, 10);
                        let nextEpInfo = null;

                        try {
                            // 1. First look in the current season for next episode
                            const data = await getSeasonDetails(show.id, targetSeason);
                            if (data && data.episodes) {
                                const upcomingInSeason = data.episodes.filter(e => Number(e.episode_number) > Number(highest.episode_number));
                                if (upcomingInSeason.length > 0) {
                                    upcomingInSeason.sort((a, b) => Number(a.episode_number) - Number(b.episode_number));
                                    nextEpInfo = upcomingInSeason[0];
                                }
                            }

                            // 2. If season is complete, scan ahead up to 25 seasons (supports long anime like Bleach, One Piece)
                            if (!nextEpInfo) {
                                for (let sOffset = 1; sOffset <= 25; sOffset++) {
                                    const nextSeasonNum = targetSeason + sOffset;
                                    try {
                                        const dataNext = await getSeasonDetails(show.id, nextSeasonNum);
                                        if (dataNext && dataNext.episodes && dataNext.episodes.length > 0) {
                                            dataNext.episodes.sort((a, b) => Number(a.episode_number) - Number(b.episode_number));
                                            nextEpInfo = dataNext.episodes[0];
                                            break;
                                        }
                                    } catch {}
                                }
                            }

                            if (nextEpInfo) {
                                let stateText = '';
                                let isLocked = false;

                                if (nextEpInfo.air_date) {
                                    const airDateObj = new Date(nextEpInfo.air_date);
                                    airDateObj.setHours(0,0,0,0);

                                    if (airDateObj > tomorrow) {
                                        // Episode is in the future
                                        return null;
                                    } else if (airDateObj.getTime() === today.getTime()) {
                                        stateText = 'Airs Today';
                                        isLocked = true;
                                    } else if (airDateObj.getTime() === tomorrow.getTime()) {
                                        stateText = 'Airs Tomorrow';
                                        isLocked = true;
                                    }
                                }

                                return { show, episode: nextEpInfo, stateText, isLocked };
                            }
                        } catch (e) {
                            console.error("Watch next calculation error:", show.name, e);
                        }
                        return null;
                    });

                    const chunkResults = await Promise.all(promises);
                    queue.push(...chunkResults.filter(Boolean));
                    await new Promise(r => setTimeout(r, 50));
                }

                queue.sort((a, b) => {
                    const dateA = a.episode.air_date ? new Date(a.episode.air_date) : 0;
                    const dateB = b.episode.air_date ? new Date(b.episode.air_date) : 0;
                    return dateB - dateA;
                });

                if (isMounted) {
                    setWatchNextList(queue);
                }
            } catch (err) {
                console.error("Error in buildWatchNext:", err);
            } finally {
                isBuildingWatchNext.current = false;
                if (isMounted) setIsLoadingWatchNext(false);
            }
        };

        const timer = setTimeout(buildWatchNext, 300);
        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [historyShows, watchedEpisodesData]);

    // Calendar & Universal Silent Sync (Updates show metadata and calendar episodes)
    useEffect(() => {
        let isMounted = true;
        const fetchUpcomingAndSync = async () => {
            if (savedShowsData.length === 0) {
                setUpcomingEpisodes([]);
                return;
            }

            setIsLoadingCalendar(true);
            try {
                const results = [];

                for (let i = 0; i < savedShowsData.length; i += 8) {
                    const chunk = savedShowsData.slice(i, i + 8);
                    const promises = chunk.map(async (show) => {
                        try {
                            const data = await getShowDetails(show.id);
                            
                            // Auto-heal / Silent sync metadata in Firestore (total_episodes, show_status)
                            if (currentUid && db && (data.number_of_episodes !== show.total_episodes || data.status !== show.show_status)) {
                                setDoc(doc(db, 'users', currentUid, 'shows', show.id.toString()), { 
                                    total_episodes: data.number_of_episodes || null, 
                                    show_status: data.status || null 
                                }, { merge: true });
                            }
                            
                            if (data.next_episode_to_air) {
                                return { 
                                    showId: data.id, 
                                    showName: data.name, 
                                    posterPath: data.poster_path, 
                                    episode: data.next_episode_to_air,
                                    showData: { id: data.id, name: data.name, poster_path: data.poster_path }
                                };
                            }
                        } catch {}
                        return null;
                    });

                    const chunkResults = await Promise.all(promises);
                    results.push(...chunkResults.filter(Boolean));
                    await new Promise(r => setTimeout(r, 80));
                }

                const today = new Date(); 
                today.setHours(0,0,0,0);
                const tomorrow = new Date(today); 
                tomorrow.setDate(tomorrow.getDate() + 1);

                const calendarEps = results.filter(item => {
                    const airDate = new Date(item.episode.air_date); 
                    airDate.setHours(0,0,0,0);
                    return airDate > tomorrow;
                });

                calendarEps.sort((a, b) => new Date(a.episode.air_date) - new Date(b.episode.air_date));
                if (isMounted) setUpcomingEpisodes(calendarEps);
            } catch (error) {
                console.error("Calendar sync error:", error);
            } finally {
                if (isMounted) setIsLoadingCalendar(false);
            }
        };

        const timer = setTimeout(fetchUpcomingAndSync, 800);
        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [savedShowsData, currentUid]);

    // Statistics Calculation (Cached in Context)
    useEffect(() => {
        let isMounted = true;
        const fetchStats = async () => {
            if (!watchedEpisodesData || watchedEpisodesData.length === 0) {
                setStats({ months: 0, days: 0, hours: 0, totalMins: 0, topShows: [] });
                return;
            }
            setIsCalculatingStats(true);
            try {
                const calculated = await calculateWatchStats(watchedEpisodesData, savedShowsData);
                if (isMounted) setStats(calculated);
            } catch (err) {
                console.error("Stats calculation error:", err);
            } finally {
                if (isMounted) setIsCalculatingStats(false);
            }
        };

        const timer = setTimeout(fetchStats, 600);
        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [watchedEpisodesData, savedShowsData]);

    // Helpers
    const isShowSaved = (id) => savedShowsData.some(s => Number(s.id) === Number(id));
    const isShowHidden = (id) => savedShowsData.find(s => Number(s.id) === Number(id))?.hidden_from_watch_next === true;
    const isMovieSaved = (id) => savedMoviesData.some(m => Number(m.id) === Number(id));
    const getWatchedEpisodeData = (showId, sNum, eNum) => 
        watchedEpisodesData.find(w => Number(w.show_id) === Number(showId) && Number(w.season_number) === Number(sNum) && Number(w.episode_number) === Number(eNum));

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
                    show_id: Number(showId),
                    season_number: Number(ep.season_number),
                    episode_number: Number(ep.episode_number),
                    runtime: Number(ep.runtime) || 0,
                    watched_at: new Date().toISOString()
                });
                
                const showUpdateData = {
                    name: optionalShowDetails?.name || "Unknown", 
                    poster_path: optionalShowDetails?.poster_path || null,
                    total_episodes: optionalShowDetails?.number_of_episodes || optionalShowDetails?.total_episodes || null, 
                    show_status: optionalShowDetails?.status || optionalShowDetails?.show_status || null, 
                    first_air_date: optionalShowDetails?.first_air_date || null,
                    hidden_from_watch_next: false
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
            watchNextList,
            isLoadingWatchNext,
            upcomingEpisodes,
            isLoadingCalendar,
            stats,
            isCalculatingStats,
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
