import React from 'react';
import { useData } from '../../context/DataContext';
import { TMDB_IMG_URL } from '../../services/tmdb';

export default function WatchNextTab({ openShowModal }) {
    const { watchNextList, isLoadingWatchNext, toggleWatchedEpisode } = useData();

    return (
        <div className="p-4 md:p-8 animate-fade-in pb-24">
            <h2 className="text-3xl font-bold mb-2">Watch Next</h2>
            <p className="text-textMuted mb-8">Continue watching your active shows.</p>

            {isLoadingWatchNext && watchNextList.length === 0 ? (
                <div className="flex justify-center p-10">
                    <i className="fas fa-spinner fa-spin text-primary text-4xl"></i>
                </div>
            ) : watchNextList.length > 0 ? (
                <div className="flex flex-col gap-4">
                    {watchNextList.map(item => (
                        <div 
                            key={`${item.show.id}-${item.episode.id}`} 
                            className="bg-surface border border-surfaceLight rounded-xl overflow-hidden flex shadow-lg hover:border-primary/50 transition-colors h-28 md:h-36 group"
                        >
                            <div 
                                onClick={() => openShowModal(item.show)} 
                                className="cursor-pointer flex-shrink-0 w-24 md:w-48 bg-surfaceLight relative overflow-hidden"
                            >
                                {item.episode.still_path || item.show.poster_path ? (
                                    <img 
                                        src={`${TMDB_IMG_URL}${item.episode.still_path || item.show.poster_path}`} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                        alt="" 
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <i className="fas fa-tv text-textMuted text-2xl"></i>
                                    </div>
                                )}
                                {item.stateText && (
                                    <div className="absolute top-2 left-2 bg-black/80 backdrop-blur text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded border border-white/20">
                                        {item.stateText}
                                    </div>
                                )}
                            </div>
                            
                            <div 
                                onClick={() => openShowModal(item.show)} 
                                className="cursor-pointer flex-1 p-3 md:p-4 flex flex-col justify-center min-w-0"
                            >
                                <div className="text-primary text-xs font-bold uppercase tracking-wide truncate mb-1">
                                    {item.show.name}
                                </div>
                                <div className="text-white font-bold text-sm md:text-lg truncate mb-1">
                                    {item.episode.name}
                                </div>
                                <div className="text-textMuted text-xs font-mono">
                                    S{String(item.episode.season_number).padStart(2, '0')} E{String(item.episode.episode_number).padStart(2, '0')}
                                </div>
                            </div>
                            
                            <div className="w-20 md:w-28 flex items-center justify-center border-l border-surfaceLight/50">
                                <button 
                                    disabled={item.isLocked} 
                                    onClick={() => toggleWatchedEpisode(item.episode, item.show.id, item.show)} 
                                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${
                                        item.isLocked 
                                            ? 'bg-surfaceLight/20 text-textMuted cursor-not-allowed' 
                                            : 'bg-surfaceLight/50 text-white hover:bg-primary shadow-lg hover:scale-110'
                                    }`}
                                >
                                    <i className={`fas fa-check ${item.isLocked ? 'opacity-50' : 'text-xl'}`}></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center p-10 border-2 border-dashed border-surfaceLight rounded-xl text-textMuted">
                    <i className="fas fa-check-circle text-5xl mb-4 opacity-30"></i>
                    <p>You're all caught up! Nothing to watch next.</p>
                </div>
            )}
        </div>
    );
}
