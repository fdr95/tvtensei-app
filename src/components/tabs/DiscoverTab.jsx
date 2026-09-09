import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import MediaCard from '../common/MediaCard';
import { 
    getTrendingShows, 
    getPopularShows, 
    getTopRatedShows, 
    getPopularAnime, 
    getShowsByGenre 
} from '../../services/tmdb';

const CATEGORIES = [
    { id: 'trending', label: 'Trending This Week', icon: 'fire' },
    { id: 'popular', label: 'Popular Shows', icon: 'chart-line' },
    { id: 'top_rated', label: 'Top Rated', icon: 'star' },
    { id: 'anime', label: 'Popular Anime', icon: 'dragon' },
    { id: 'action', label: 'Action & Adventure', icon: 'fist-raised', genreId: 10759 },
    { id: 'comedy', label: 'Comedy', icon: 'laugh-beam', genreId: 35 },
    { id: 'scifi', label: 'Sci-Fi & Fantasy', icon: 'rocket', genreId: 10765 }
];

export default function DiscoverTab({ openShowModal }) {
    const { isShowSaved } = useData();

    const [activeCategory, setActiveCategory] = useState('trending');
    const [shows, setShows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);

        const fetchShows = async () => {
            try {
                let results = [];
                const cat = CATEGORIES.find(c => c.id === activeCategory);

                if (activeCategory === 'trending') {
                    results = await getTrendingShows();
                } else if (activeCategory === 'popular') {
                    results = await getPopularShows();
                } else if (activeCategory === 'top_rated') {
                    results = await getTopRatedShows();
                } else if (activeCategory === 'anime') {
                    results = await getPopularAnime();
                } else if (cat?.genreId) {
                    results = await getShowsByGenre(cat.genreId);
                }

                if (isMounted) {
                    setShows(results || []);
                }
            } catch (err) {
                console.error("Error fetching discover shows:", err);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchShows();
        return () => { isMounted = false; };
    }, [activeCategory]);

    return (
        <div className="p-4 md:p-8 animate-fade-in pb-24">
            <h2 className="text-3xl font-bold mb-2">Discover</h2>
            <p className="text-textMuted mb-6">Explore the best TV shows and Anime across the globe.</p>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar shrink-0">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                            activeCategory === cat.id
                                ? 'bg-primary text-white shadow-[0_0_12px_rgba(229,9,20,0.4)]'
                                : 'bg-surfaceLight/20 text-textMuted hover:text-white hover:bg-surfaceLight/40'
                        }`}
                    >
                        <i className={`fas fa-${cat.icon}`}></i>
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Content Grid */}
            {isLoading ? (
                <div className="flex justify-center p-20">
                    <i className="fas fa-spinner fa-spin text-primary text-4xl"></i>
                </div>
            ) : shows.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pb-20">
                    {shows.map(show => (
                        <MediaCard
                            key={show.id}
                            item={show}
                            openModal={openShowModal}
                            isSaved={isShowSaved(show.id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center p-10 border-2 border-dashed border-surfaceLight rounded-xl text-textMuted">
                    <p>No shows found for this category.</p>
                </div>
            )}
        </div>
    );
}
