import React from 'react';
import { TMDB_IMG_URL } from '../../services/tmdb';
import { getYear } from '../../utils/formatters';

export default function MediaCard({ item, openModal, isSaved, additionalUI }) {
    const title = item.name || item.title || "Unknown";
    const year = getYear(item.first_air_date || item.release_date);

    return (
        <div 
            onClick={() => openModal(item)} 
            className="cursor-pointer group relative aspect-[2/3] bg-surfaceLight/30 rounded-xl border border-surfaceLight overflow-hidden transition-transform duration-300 hover:scale-105 hover:border-primary/50 shadow-md"
        >
            {item.poster_path ? (
                <img 
                    src={`${TMDB_IMG_URL}${item.poster_path}`} 
                    alt={title} 
                    className="w-full h-full object-cover" 
                    loading="lazy" 
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                    <i className="fas fa-image text-4xl text-surfaceLight mb-3"></i>
                    <span className="text-xs font-bold text-textMuted line-clamp-3">{title}</span>
                </div>
            )}
            {isSaved && (
                <div className="absolute top-2 right-2 bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-black/50 z-10">
                    <i className="fas fa-bookmark text-sm"></i>
                </div>
            )}
            {additionalUI}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                <span className="text-white font-bold text-sm line-clamp-2">{title}</span>
                {year && <span className="text-primary text-xs font-medium">{year}</span>}
            </div>
        </div>
    );
}
