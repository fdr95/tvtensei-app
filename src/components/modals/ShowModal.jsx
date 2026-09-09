import React, { useState, useEffect } from 'react';
import { doc, writeBatch, setDoc } from "firebase/firestore";
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { TMDB_BACKDROP_URL, TMDB_IMG_URL, getShowDetails, getSeasonDetails } from '../../services/tmdb';
import { getYear, formatRating, formatDateDisplay } from '../../utils/formatters';

export default function ShowModal({ selectedShow, onClose, isFullscreen, toggleFullscreen }) {
    const { currentUid } = useAuth();
    const { 
        savedShowsData, 
        watchedEpisodesData, 
        isShowSaved, 
        isShowHidden, 
        toggleHideShow, 
        toggleLibraryShow, 
        updateShowRating, 
        toggleWatchedEpisode,
        getWatchedEpisodeData
    } = useData();

    const [showDetails, setShowDetails] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const [expandedSeason, setExpandedSeason] = useState(null);
    const [seasonEpisodes, setSeasonEpisodes] = useState({});

    useEffect(() => {
        if (!selectedShow) return;
        let isMounted = true;
        setIsLoadingDetails(true);
        setShowDetails(null);
        setExpandedSeason(null);
        setSeasonEpisodes({});

        getShowDetails(selectedShow.id)
            .then(data => {
                if (isMounted) setShowDetails(data);
            })
            .catch(err => {
                console.error("Error fetching show details:", err);
            })
            .finally(() => {
                if (isMounted) setIsLoadingDetails(false);
            });

        return () => { isMounted = false; };
    }, [selectedShow]);

    if (!selectedShow) return null;

    const handleSeasonClick = async (seasonNumber) => {
        if (expandedSeason === seasonNumber) {
            setExpandedSeason(null);
            return;
        }
        setExpandedSeason(seasonNumber);
        if (!seasonEpisodes[seasonNumber]) {
            try {
                const data = await getSeasonDetails(selectedShow.id, seasonNumber);
                if (data.episodes) {
                    setSeasonEpisodes(prev => ({ ...prev, [seasonNumber]: data.episodes }));
                }
            } catch (err) {
                console.error("Error fetching season episodes:", err);
            }
        }
    };

    const handleToggleSeasonWatched = async (e, season, isFullyWatched, watchedInSeason) => {
        e.stopPropagation();
        if (!currentUid || !db) return;

        const batch = writeBatch(db);

        if (isFullyWatched) {
            watchedInSeason.forEach(w => batch.delete(doc(db, 'users', currentUid, 'watched_episodes', w.id)));
            await batch.commit();
        } else {
            let eps = seasonEpisodes[season.season_number];
            if (!eps) {
                try {
                    const data = await getSeasonDetails(selectedShow.id, season.season_number);
                    eps = data.episodes;
                    if (eps) {
                        setSeasonEpisodes(prev => ({ ...prev, [season.season_number]: eps }));
                    }
                } catch (err) {
                    console.error("Error fetching season for bulk mark:", err);
                }
            }

            if (eps) {
                eps.forEach(ep => {
                    if (!getWatchedEpisodeData(selectedShow.id, ep.season_number, ep.episode_number)) {
                        batch.set(doc(db, 'users', currentUid, 'watched_episodes', ep.id.toString()), {
                            show_id: selectedShow.id,
                            season_number: ep.season_number,
                            episode_number: ep.episode_number,
                            runtime: ep.runtime || 0,
                            watched_at: new Date().toISOString()
                        });
                    }
                });
                await batch.commit();

                // Auto un-hide when whole season is marked
                const showUpdateData = {
                    name: showDetails?.name || selectedShow.name,
                    poster_path: showDetails?.poster_path || selectedShow.poster_path || null,
                    total_episodes: showDetails?.number_of_episodes || selectedShow.total_episodes || null,
                    show_status: showDetails?.status || selectedShow.show_status || null,
                    hidden_from_watch_next: false
                };
                if (!isShowSaved(selectedShow.id)) {
                    showUpdateData.added_at = new Date().toISOString();
                    showUpdateData.rating = 0;
                }
                await setDoc(doc(db, 'users', currentUid, 'shows', selectedShow.id.toString()), showUpdateData, { merge: true });
            }
        }
    };

    const currentRating = savedShowsData.find(s => s.id === selectedShow.id)?.rating || 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-modal md:p-6">
            <div className="absolute inset-0" onClick={onClose}></div>
            <div className={`bg-surface flex flex-col overflow-hidden relative shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-surfaceLight z-10 animate-fade-in transition-all duration-300 ${isFullscreen ? 'w-full h-full max-w-none rounded-none' : 'w-full max-w-4xl max-h-[90vh] md:h-[85vh] md:rounded-2xl rounded-t-3xl'}`}>
                
                {/* Action Buttons Top Right */}
                <div className="absolute top-4 right-4 z-20 flex gap-2 md:gap-3">
                    <button 
                        onClick={toggleFullscreen} 
                        className="bg-black/60 hover:bg-surface text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/10 hidden md:flex"
                    >
                        <i className={`fas fa-${isFullscreen ? 'compress' : 'expand'}`}></i>
                    </button>
                    {isShowSaved(selectedShow.id) && (
                        <button 
                            onClick={() => toggleHideShow(selectedShow.id)} 
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-md border ${isShowHidden(selectedShow.id) ? 'bg-orange-500 text-white border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'bg-black/60 text-white hover:bg-surface border-white/10'}`} 
                            title={isShowHidden(selectedShow.id) ? "Resume tracking in Watch Next" : "Stop tracking in Watch Next"}
                        >
                            <i className={`fas fa-${isShowHidden(selectedShow.id) ? 'eye-slash' : 'eye'}`}></i>
                        </button>
                    )}
                    <button 
                        onClick={() => toggleLibraryShow(selectedShow, showDetails)} 
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-md border ${isShowSaved(selectedShow.id) ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(229,9,20,0.5)]' : 'bg-black/60 text-white hover:bg-surface border-white/10'}`} 
                        title={isShowSaved(selectedShow.id) ? "Remove from Library" : "Add to Library"}
                    >
                        <i className={`${isShowSaved(selectedShow.id) ? 'fas' : 'far'} fa-bookmark`}></i>
                    </button>
                    <button 
                        onClick={onClose} 
                        className="bg-black/60 hover:bg-surface text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/10"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Header Backdrop */}
                <div className="relative h-56 md:h-80 flex-shrink-0 bg-surfaceLight">
                    {selectedShow.backdrop_path ? (
                        <img src={`${TMDB_BACKDROP_URL}${selectedShow.backdrop_path}`} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20"><i className="fas fa-image text-6xl"></i></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full flex items-end gap-6">
                        <div className="hidden md:block flex-shrink-0 w-32 rounded-lg overflow-hidden border-2 border-surfaceLight/50 shadow-2xl">
                            {selectedShow.poster_path && <img src={`${TMDB_IMG_URL}${selectedShow.poster_path}`} className="w-full" alt="" />}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-2 shadow-black drop-shadow-xl tracking-tight">{selectedShow.name}</h2>
                            {isShowHidden(selectedShow.id) && (
                                <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full w-max mb-2 block shadow-lg">
                                    <i className="fas fa-eye-slash mr-1"></i> Tracking Stopped
                                </span>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-300 font-medium bg-black/40 w-max px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10 mt-1">
                                {selectedShow.vote_average != null && (
                                    <span className="flex items-center"><i className="fas fa-star text-yellow-500 mr-1.5"></i> {formatRating(selectedShow.vote_average)}/10</span>
                                )}
                                {selectedShow.first_air_date && <span>• {getYear(selectedShow.first_air_date)}</span>}
                                {selectedShow.original_language && <span className="uppercase text-primary font-bold">{selectedShow.original_language}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-white mb-3">Synopsis</h3>
                        <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                            {showDetails?.overview || selectedShow.overview || "No synopsis available."}
                        </p>
                    </div>

                    {isShowSaved(selectedShow.id) && (
                        <div className="mb-8 bg-surfaceLight/20 p-4 rounded-xl border border-surfaceLight flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
                            <div className="flex items-center gap-2 text-white font-bold"><i className="fas fa-star text-yellow-500"></i> Your Rating</div>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button 
                                        key={star} 
                                        onClick={() => updateShowRating(selectedShow.id, star)} 
                                        className={`text-2xl transition-transform hover:scale-110 ${star <= currentRating ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-surfaceLight hover:text-yellow-500/50'}`}
                                    >
                                        <i className="fas fa-star"></i>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><i className="fas fa-layer-group text-primary"></i> Seasons & Episodes</h3>
                    
                    {isLoadingDetails ? (
                        <div className="flex justify-center p-8"><i className="fas fa-spinner fa-spin text-primary text-3xl"></i></div>
                    ) : showDetails && showDetails.seasons ? (
                        <div className="space-y-3 pb-8">
                            {showDetails.seasons.filter(s => s.season_number > 0).map(season => {
                                const watchedInSeason = watchedEpisodesData.filter(ep => ep.show_id === showDetails.id && ep.season_number === season.season_number);
                                const isFullyWatched = watchedInSeason.length >= season.episode_count && season.episode_count > 0;
                                const isExpanded = expandedSeason === season.season_number;

                                return (
                                    <div key={season.id} className="bg-surfaceLight/20 rounded-xl border border-surfaceLight overflow-hidden transition-all">
                                        <div 
                                            className="w-full flex items-center justify-between p-3 md:p-4 hover:bg-surfaceLight/40 transition-colors cursor-pointer" 
                                            onClick={() => handleSeasonClick(season.season_number)}
                                        >
                                            <div className="flex items-center gap-4">
                                                {season.poster_path ? (
                                                    <img src={`${TMDB_IMG_URL}${season.poster_path}`} className="w-12 h-16 object-cover rounded shadow-md" alt="" />
                                                ) : (
                                                    <div className="w-12 h-16 bg-surfaceLight/50 flex flex-col items-center justify-center rounded"><i className="fas fa-tv text-xl text-surfaceLight mb-1"></i></div>
                                                )}
                                                <div className="text-left">
                                                    <div className="font-bold text-white text-lg">{season.name}</div>
                                                    <div className="text-sm text-textMuted">{watchedInSeason.length} / {season.episode_count} Episodes {season.air_date ? `• ${getYear(season.air_date)}` : ''}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={(e) => handleToggleSeasonWatched(e, season, isFullyWatched, watchedInSeason)} 
                                                    className={`w-10 h-10 rounded-full transition-colors flex items-center justify-center z-10 ${isFullyWatched ? 'bg-primary text-white shadow-[0_0_10px_rgba(229,9,20,0.5)]' : 'bg-surfaceLight/50 text-textMuted hover:bg-primary hover:text-white'}`}
                                                    title={isFullyWatched ? "Mark season unwatched" : "Mark season watched"}
                                                >
                                                    <i className="fas fa-check-double"></i>
                                                </button>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-primary/20 text-primary' : 'bg-surfaceLight/50 text-textMuted'}`}>
                                                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} transition-transform`}></i>
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="bg-black/30 p-2 md:p-4 border-t border-surfaceLight max-h-96 overflow-y-auto">
                                                {!seasonEpisodes[season.season_number] ? (
                                                    <div className="text-center p-6"><i className="fas fa-spinner fa-spin text-textMuted text-xl"></i></div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {seasonEpisodes[season.season_number].map(ep => {
                                                            const isWatched = !!getWatchedEpisodeData(showDetails.id, ep.season_number, ep.episode_number);
                                                            return (
                                                                <div key={ep.id} className="flex gap-4 items-center p-3 hover:bg-surfaceLight/40 rounded-lg group transition-colors">
                                                                    <div className={`w-8 font-mono text-lg font-bold transition-colors text-right ${isWatched ? 'text-primary' : 'text-surfaceLight group-hover:text-textMuted'}`}>{ep.episode_number}</div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className={`text-sm md:text-base font-semibold truncate ${isWatched ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{ep.name}</div>
                                                                        <div className="text-xs text-textMuted flex items-center gap-2 mt-0.5">
                                                                            <span><i className="far fa-calendar-alt"></i> {formatDateDisplay(ep.air_date)}</span>
                                                                            {ep.runtime > 0 && <span><i className="far fa-clock"></i> {ep.runtime} min</span>}
                                                                        </div>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => toggleWatchedEpisode(ep, showDetails.id, showDetails)} 
                                                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${isWatched ? 'bg-primary/20 text-primary border-primary shadow-[0_0_10px_rgba(229,9,20,0.3)]' : 'bg-surfaceLight/30 text-textMuted border-transparent hover:border-textMuted hover:text-white'}`}
                                                                    >
                                                                        <i className="fas fa-eye"></i>
                                                                    </button>
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
                    ) : (
                        <p className="text-textMuted">No additional details found.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
