import React from 'react';
import { TMDB_IMG_URL } from '../../services/tmdb';

export default function ShowListRow({ show, openShowModal }) {
    return (
        <div 
            onClick={() => openShowModal(show)} 
            className="flex items-center gap-4 bg-surfaceLight/10 hover:bg-surfaceLight/30 border border-surfaceLight/50 rounded-xl p-3 cursor-pointer transition-all group"
        >
            <div className="w-12 h-16 md:w-16 md:h-24 flex-shrink-0 bg-surface rounded-md overflow-hidden shadow-md relative">
                {show.poster_path ? (
                    <img 
                        src={`${TMDB_IMG_URL}${show.poster_path}`} 
                        alt={show.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        loading="lazy" 
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <i className="fas fa-tv text-textMuted"></i>
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-white font-bold text-sm md:text-lg truncate">
                    {show.name}
                    {show.hidden_from_watch_next && (
                        <i className="fas fa-eye-slash text-orange-500 ml-2 text-xs" title="Tracking Stopped"></i>
                    )}
                </h4>
                <div className="mt-1 md:mt-2">
                    <div className="flex items-center gap-2 mb-1">
                        {show.status === 'completed' && (
                            <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded border border-green-400/20">Completed</span>
                        )}
                        {show.status === 'upToDate' && (
                            <span className="text-xs font-bold text-purple-400 bg-purple-400/10 px-2 py-1 rounded border border-purple-400/20">Up to Date</span>
                        )}
                        {show.status === 'toStart' && (
                            <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded border border-blue-400/20">Watchlist</span>
                        )}
                    </div>
                    {(show.status === 'inProgress' || show.status === 'upToDate') && (
                        <div className="flex flex-col gap-1 w-full max-w-xs mt-1">
                            <div className="flex justify-between text-xs text-textMuted">
                                <span>Progress</span>
                                <span>{show.watched_count} / {show.total_episodes || "?"}</span>
                            </div>
                            <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all ${show.status === 'upToDate' ? 'bg-purple-500' : 'bg-primary'}`} 
                                    style={{ width: `${show.total_episodes ? Math.min(100, (show.watched_count / show.total_episodes) * 100) : 10}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="px-4 text-textMuted font-bold hidden md:block">
                {show.rating > 0 ? (
                    <span className="text-yellow-500"><i className="fas fa-star text-xs"></i> {show.rating}</span>
                ) : (
                    <span className="text-surfaceLight">-</span>
                )}
            </div>
            <div className="px-2 text-textMuted group-hover:text-white transition-colors">
                <i className="fas fa-chevron-right"></i>
            </div>
        </div>
    );
}
