import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import MediaCard from '../common/MediaCard';
import { searchShows } from '../../services/tmdb';

export default function SearchTab({ openShowModal }) {
    const { isShowSaved } = useData();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const delay = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                setIsSearching(true);
                searchShows(searchQuery)
                    .then(results => setSearchResults(results))
                    .finally(() => setIsSearching(false));
            } else {
                setSearchResults([]);
            }
        }, 600);

        return () => clearTimeout(delay);
    }, [searchQuery]);

    return (
        <div className="p-4 md:p-8 animate-fade-in flex flex-col h-full min-h-[80vh] pb-24">
            <h2 className="text-3xl font-bold mb-2">Search TMDB</h2>
            <p className="text-textMuted mb-6">Find your next binge.</p>
            
            <div className="relative mb-6">
                <input 
                    type="text" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    placeholder="E.g. Breaking Bad, Naruto, The Office..." 
                    className="w-full bg-surface border border-surfaceLight rounded-full py-4 px-6 pl-14 text-white focus:outline-none focus:border-primary transition-all text-lg" 
                />
                <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-textMuted text-lg"></i>
                {isSearching && (
                    <i className="fas fa-spinner fa-spin absolute right-6 top-1/2 -translate-y-1/2 text-primary text-lg"></i>
                )}
            </div>

            {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pb-20">
                    {searchResults.map(show => (
                        <MediaCard 
                            key={show.id} 
                            item={show} 
                            openModal={openShowModal} 
                            isSaved={isShowSaved(show.id)} 
                        />
                    ))}
                </div>
            ) : (!isSearching && searchQuery.length > 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-textMuted opacity-50 pb-20">
                    <p className="text-lg">No results found.</p>
                </div>
            ))}
        </div>
    );
}
