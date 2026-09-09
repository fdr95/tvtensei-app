import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import MediaCard from '../common/MediaCard';
import { searchMovies, getTrendingMovies, getMovieRecommendations } from '../../services/tmdb';

export default function MovieHub({ movieTab, setMovieTab, openMovieModal }) {
    const { savedMoviesData, isMovieSaved } = useData();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [recommendations, setRecommendations] = useState([]);

    const toWatch = savedMoviesData
        .filter(m => m.status === 'toWatch')
        .sort((a, b) => new Date(b.added_at) - new Date(a.added_at));
        
    const watched = savedMoviesData
        .filter(m => m.status === 'watched')
        .sort((a, b) => new Date(b.added_at) - new Date(a.added_at));

    // Suggestions fetching
    useEffect(() => {
        if (movieTab === 'suggested' && recommendations.length === 0) {
            const fetchSuggestions = async () => {
                const watchedMovies = savedMoviesData.filter(m => m.status === 'watched' && (m.rating || 0) > 0);
                if (watchedMovies.length === 0) {
                    try {
                        const trending = await getTrendingMovies();
                        setRecommendations(trending);
                    } catch {}
                } else {
                    try {
                        const topMovies = [...watchedMovies].sort((a, b) => b.rating - a.rating).slice(0, 3);
                        let recs = [];
                        for (const m of topMovies) {
                            const recData = await getMovieRecommendations(m.id);
                            recs = [...recs, ...recData];
                        }
                        const uniqueRecs = [];
                        const seenIds = new Set(savedMoviesData.map(m => m.id));
                        for (const r of recs) {
                            if (!seenIds.has(r.id)) {
                                uniqueRecs.push(r);
                                seenIds.add(r.id);
                            }
                        }
                        uniqueRecs.sort(() => 0.5 - Math.random());
                        setRecommendations(uniqueRecs.slice(0, 15));
                    } catch {}
                }
            };
            fetchSuggestions();
        }
    }, [movieTab, savedMoviesData, recommendations.length]);

    // Search debouncing
    useEffect(() => {
        const delay = setTimeout(() => {
            if (movieTab === 'suggested' && query.trim().length >= 2) {
                setSearching(true);
                searchMovies(query)
                    .then(res => setResults(res))
                    .finally(() => setSearching(false));
            } else {
                setResults([]);
            }
        }, 600);
        return () => clearTimeout(delay);
    }, [query, movieTab]);

    const getMovieStatus = (id) => savedMoviesData.find(m => m.id === id)?.status || null;
    const getMovieRating = (id) => savedMoviesData.find(m => m.id === id)?.rating || 0;

    const renderGrid = (movies, emptyMessage) => {
        if (movies.length === 0) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center text-textMuted opacity-50 py-20">
                    <i className="fas fa-film text-6xl mb-4"></i>
                    <p className="text-lg text-center mt-4">{emptyMessage}</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pb-20 mt-2">
                {movies.map(movie => (
                    <MediaCard 
                        key={movie.id} 
                        item={movie} 
                        openModal={openMovieModal} 
                        isSaved={isMovieSaved(movie.id)}
                        additionalUI={
                            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                                {getMovieStatus(movie.id) === 'watched' && (
                                    <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md">WATCHED</span>
                                )}
                                {getMovieStatus(movie.id) === 'toWatch' && (
                                    <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md">TO WATCH</span>
                                )}
                                {getMovieRating(movie.id) > 0 && (
                                    <span className="bg-black/80 text-yellow-500 text-[10px] font-bold px-2 py-1 rounded shadow-md">
                                        <i className="fas fa-star"></i> {getMovieRating(movie.id)}
                                    </span>
                                )}
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
                <div>
                    <h2 className="text-3xl font-bold mb-2">Movies</h2>
                    <p className="text-textMuted">Track and discover feature films.</p>
                </div>
                
                {/* Mobile Tabs */}
                <div className="flex md:hidden bg-surface border border-surfaceLight rounded-xl p-1 overflow-x-auto shrink-0 mt-2">
                    <button 
                        onClick={() => setMovieTab('toWatch')} 
                        className={`flex-1 flex items-center justify-center gap-2 min-w-max px-4 py-2 text-sm font-bold rounded-lg transition-colors ${movieTab === 'toWatch' ? 'bg-primary text-white' : 'text-textMuted hover:text-white'}`}
                    >
                        <i className="fas fa-bookmark"></i> To Watch
                    </button>
                    <button 
                        onClick={() => setMovieTab('watched')} 
                        className={`flex-1 flex items-center justify-center gap-2 min-w-max px-4 py-2 text-sm font-bold rounded-lg transition-colors ${movieTab === 'watched' ? 'bg-primary text-white' : 'text-textMuted hover:text-white'}`}
                    >
                        <i className="fas fa-check-circle"></i> Watched
                    </button>
                    <button 
                        onClick={() => setMovieTab('suggested')} 
                        className={`flex-1 flex items-center justify-center gap-2 min-w-max px-4 py-2 text-sm font-bold rounded-lg transition-colors ${movieTab === 'suggested' ? 'bg-primary text-white' : 'text-textMuted hover:text-white'}`}
                    >
                        <i className="fas fa-lightbulb"></i> Suggested
                    </button>
                </div>
            </div>

            {movieTab === 'toWatch' && renderGrid(toWatch, "Your watchlist is empty. Check the suggested tab for new movies!")}
            {movieTab === 'watched' && renderGrid(watched, "You haven't marked any movies as watched yet.")}
            {movieTab === 'suggested' && (
                <div className="flex flex-col animate-fade-in">
                    <div className="relative mb-6">
                        <input 
                            type="text" 
                            value={query} 
                            onChange={(e) => setQuery(e.target.value)} 
                            placeholder="Search for movies..." 
                            className="w-full bg-surface border border-surfaceLight rounded-full py-4 px-6 pl-14 text-white focus:outline-none focus:border-primary transition-all text-lg" 
                        />
                        <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-textMuted text-lg"></i>
                        {searching && <i className="fas fa-spinner fa-spin absolute right-6 top-1/2 -translate-y-1/2 text-primary text-lg"></i>}
                    </div>
                    {query.length >= 2 ? (
                        <>
                            <h3 className="text-xl font-bold text-white mb-2">Search Results</h3>
                            {renderGrid(results, "No movies found.")}
                        </>
                    ) : (
                        <>
                            <h3 className="text-xl font-bold text-white mb-2">
                                <i className="fas fa-lightbulb text-primary mr-2"></i> 
                                {savedMoviesData.filter(m => m.status === 'watched' && (m.rating || 0) > 0).length > 0 ? "Recommended for You" : "Trending Worldwide"}
                            </h3>
                            {renderGrid(recommendations, "Loading movies...")}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
