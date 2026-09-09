import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { TMDB_BACKDROP_URL, TMDB_IMG_URL, getMovieDetails } from '../../services/tmdb';
import { getYear, formatRating } from '../../utils/formatters';

export default function MovieModal({ selectedMovie, onClose, isFullscreen, toggleFullscreen }) {
    const { 
        savedMoviesData, 
        isMovieSaved, 
        updateMovieRating, 
        saveMovie, 
        setMovieStatus, 
        removeMovie 
    } = useData();

    const [movieDetails, setMovieDetails] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);

    useEffect(() => {
        if (!selectedMovie) return;
        let isMounted = true;
        setIsLoadingDetails(true);
        setMovieDetails(null);

        getMovieDetails(selectedMovie.id)
            .then(data => {
                if (isMounted) setMovieDetails(data);
            })
            .catch(err => {
                console.error("Error fetching movie details:", err);
            })
            .finally(() => {
                if (isMounted) setIsLoadingDetails(false);
            });

        return () => { isMounted = false; };
    }, [selectedMovie]);

    if (!selectedMovie) return null;

    const savedMovie = savedMoviesData.find(m => m.id === selectedMovie.id);
    const isSaved = isMovieSaved(selectedMovie.id);
    const currentRating = savedMovie?.rating || 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-modal md:p-6">
            <div className="absolute inset-0" onClick={onClose}></div>
            <div className={`bg-surface flex flex-col overflow-hidden relative shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-surfaceLight z-10 animate-fade-in transition-all duration-300 ${isFullscreen ? 'w-full h-full max-w-none rounded-none' : 'w-full max-w-2xl max-h-[90vh] md:h-auto md:rounded-2xl rounded-t-3xl'}`}>
                
                {/* Header Controls */}
                <div className="absolute top-4 right-4 z-20 flex gap-2 md:gap-3">
                    <button 
                        onClick={toggleFullscreen} 
                        className="bg-black/60 hover:bg-surface text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/10 hidden md:flex"
                    >
                        <i className={`fas fa-${isFullscreen ? 'compress' : 'expand'}`}></i>
                    </button>
                    <button 
                        onClick={onClose} 
                        className="bg-black/60 hover:bg-surface text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/10"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Backdrop Image */}
                <div className="relative h-56 md:h-80 flex-shrink-0 bg-surfaceLight">
                    {selectedMovie.backdrop_path ? (
                        <img src={`${TMDB_BACKDROP_URL}${selectedMovie.backdrop_path}`} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20"><i className="fas fa-film text-6xl"></i></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full flex items-end gap-6">
                        <div className="hidden md:block flex-shrink-0 w-32 rounded-lg overflow-hidden border-2 border-surfaceLight/50 shadow-2xl">
                            {selectedMovie.poster_path && <img src={`${TMDB_IMG_URL}${selectedMovie.poster_path}`} className="w-full" alt="" />}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-2 shadow-black drop-shadow-xl tracking-tight">
                                {selectedMovie.title || selectedMovie.name}
                            </h2>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300 font-medium bg-black/40 w-max max-w-full px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                                {selectedMovie.vote_average != null && (
                                    <span className="flex items-center shrink-0">
                                        <i className="fas fa-star text-yellow-500 mr-1.5"></i> {formatRating(selectedMovie.vote_average)}/10
                                    </span>
                                )}
                                {selectedMovie.release_date && <span className="shrink-0">• {getYear(selectedMovie.release_date)}</span>}
                                {movieDetails?.runtime > 0 && <span className="shrink-0">• {movieDetails.runtime} min</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-white mb-3">Synopsis</h3>
                        {isLoadingDetails ? (
                            <div className="flex justify-center p-4">
                                <i className="fas fa-spinner fa-spin text-primary text-xl"></i>
                            </div>
                        ) : (
                            <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                                {movieDetails?.overview || selectedMovie.overview || "No synopsis available."}
                            </p>
                        )}
                    </div>

                    {isSaved && savedMovie?.status === 'watched' && (
                        <div className="mb-8 bg-surfaceLight/20 p-4 rounded-xl border border-surfaceLight flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
                            <div className="flex items-center gap-2 text-white font-bold">
                                <i className="fas fa-star text-yellow-500"></i> Your Rating
                            </div>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button 
                                        key={star} 
                                        onClick={() => updateMovieRating(selectedMovie.id, star)} 
                                        className={`text-2xl transition-transform hover:scale-110 ${star <= currentRating ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-surfaceLight hover:text-yellow-500/50'}`}
                                    >
                                        <i className="fas fa-star"></i>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 mt-8 border-t border-surfaceLight pt-8">
                        {isSaved ? (
                            <>
                                <div className="flex-1 bg-surfaceLight/20 border border-surfaceLight rounded-xl p-4 flex items-center justify-between">
                                    <span className="text-textMuted font-bold text-sm">Status</span>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setMovieStatus(selectedMovie.id, 'toWatch')} 
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${savedMovie?.status === 'toWatch' ? 'bg-blue-500 text-white' : 'bg-surface border border-surfaceLight text-textMuted hover:text-white'}`}
                                        >
                                            TO WATCH
                                        </button>
                                        <button 
                                            onClick={() => setMovieStatus(selectedMovie.id, 'watched')} 
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${savedMovie?.status === 'watched' ? 'bg-green-500 text-white' : 'bg-surface border border-surfaceLight text-textMuted hover:text-white'}`}
                                        >
                                            WATCHED
                                        </button>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        removeMovie(selectedMovie.id);
                                        onClose();
                                    }} 
                                    className="shrink-0 flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-6 py-4 rounded-xl transition-colors font-bold"
                                >
                                    <i className="fas fa-trash-alt mr-2"></i> Remove
                                </button>
                            </>
                        ) : (
                            <>
                                <button 
                                    onClick={() => saveMovie(selectedMovie, 'toWatch')} 
                                    className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-4 rounded-xl transition-colors font-bold shadow-lg shadow-blue-500/20"
                                >
                                    <i className="fas fa-bookmark"></i> Add to "To Watch"
                                </button>
                                <button 
                                    onClick={() => saveMovie(selectedMovie, 'watched')} 
                                    className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-xl transition-colors font-bold shadow-lg shadow-green-500/20"
                                >
                                    <i className="fas fa-check-circle"></i> Mark as Watched
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
