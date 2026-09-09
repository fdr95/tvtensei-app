import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import ShowListRow from '../shows/ShowListRow';
import MediaCard from '../common/MediaCard';

export default function HistoryTab({ openShowModal }) {
    const { historyShows } = useData();

    const [historyViewMode, setHistoryViewMode] = useState('list');
    const [historySortBy, setHistorySortBy] = useState('recent');
    const [historySortDesc, setHistorySortDesc] = useState(true);
    const [historyFilterStatus, setHistoryFilterStatus] = useState('inProgress');

    const filteredAndSortedHistory = [...historyShows]
        .filter(show => historyFilterStatus === 'all' || show.status === historyFilterStatus)
        .sort((a, b) => {
            let res = 0;
            if (historySortBy === 'recent') res = new Date(a.last_watched_at || 0) - new Date(b.last_watched_at || 0);
            else if (historySortBy === 'added_at') res = new Date(a.added_at || 0) - new Date(b.added_at || 0);
            else if (historySortBy === 'name') res = (a.name || "").localeCompare(b.name || "");
            else if (historySortBy === 'rating') res = (a.rating || 0) - (b.rating || 0);
            else if (historySortBy === 'progress') res = (a.progressPercentage || 0) - (b.progressPercentage || 0);
            else if (historySortBy === 'year') res = (a.year || 0) - (b.year || 0);
            return historySortDesc ? -res : res;
        });

    return (
        <div className="p-4 md:p-8 animate-fade-in pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold mb-2">Library</h2>
                    <p className="text-textMuted">Manage your entire catalog.</p>
                </div>
                
                {/* Filters and View Controls */}
                <div className="flex flex-wrap items-center gap-3 bg-surfaceLight/10 p-2 rounded-xl border border-surfaceLight">
                    <div className="flex items-center gap-2 bg-surface text-white text-sm rounded-lg px-3 py-2 border border-surfaceLight focus-within:border-primary transition-colors">
                        <span className="text-textMuted font-medium">Filter:</span>
                        <select 
                            value={historyFilterStatus} 
                            onChange={(e) => setHistoryFilterStatus(e.target.value)} 
                            className="bg-transparent focus:outline-none cursor-pointer"
                        >
                            <option value="all" className="bg-surface text-white">All</option>
                            <option value="inProgress" className="bg-surface text-white">In Progress</option>
                            <option value="upToDate" className="bg-surface text-white">Up to Date</option>
                            <option value="completed" className="bg-surface text-white">Completed</option>
                            <option value="toStart" className="bg-surface text-white">To Start</option>
                        </select>
                    </div>

                    <div className="flex items-center bg-surface rounded-lg border border-surfaceLight focus-within:border-primary transition-colors overflow-hidden">
                        <div className="flex items-center gap-2 text-white text-sm px-3 py-2">
                            <span className="text-textMuted font-medium">Sort by:</span>
                            <select 
                                value={historySortBy} 
                                onChange={(e) => setHistorySortBy(e.target.value)} 
                                className="bg-transparent focus:outline-none cursor-pointer"
                            >
                                <option value="recent" className="bg-surface text-white">Recent</option>
                                <option value="added_at" className="bg-surface text-white">Date Added</option>
                                <option value="name" className="bg-surface text-white">Name</option>
                                <option value="rating" className="bg-surface text-white">Rating</option>
                                <option value="progress" className="bg-surface text-white">Progress</option>
                                <option value="year" className="bg-surface text-white">Year</option>
                            </select>
                        </div>
                        <button 
                            onClick={() => setHistorySortDesc(!historySortDesc)} 
                            className="px-3 py-2 text-textMuted hover:text-white hover:bg-surfaceLight/50 transition-colors border-l border-surfaceLight" 
                            title={historySortDesc ? "Descending" : "Ascending"}
                        >
                            <i className={`fas fa-sort-amount-${historySortDesc ? 'down' : 'up'}`}></i>
                        </button>
                    </div>

                    <div className="flex bg-surface rounded-lg border border-surfaceLight overflow-hidden">
                        <button 
                            onClick={() => setHistoryViewMode('list')} 
                            className={`px-3 py-2 transition-colors ${historyViewMode === 'list' ? 'bg-primary text-white' : 'text-textMuted hover:text-white hover:bg-surfaceLight/50'}`}
                        >
                            <i className="fas fa-list"></i>
                        </button>
                        <button 
                            onClick={() => setHistoryViewMode('grid')} 
                            className={`px-3 py-2 transition-colors ${historyViewMode === 'grid' ? 'bg-primary text-white' : 'text-textMuted hover:text-white hover:bg-surfaceLight/50'}`}
                        >
                            <i className="fas fa-th-large"></i>
                        </button>
                    </div>
                </div>
            </div>

            {filteredAndSortedHistory.length > 0 ? (
                historyViewMode === 'list' ? (
                    <div className="flex flex-col gap-3 mb-10">
                        {filteredAndSortedHistory.map(show => (
                            <ShowListRow 
                                key={show.id} 
                                show={show} 
                                openShowModal={openShowModal} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pb-20">
                        {filteredAndSortedHistory.map(show => (
                            <MediaCard 
                                key={show.id} 
                                item={show} 
                                openModal={openShowModal} 
                                isSaved={true}
                                additionalUI={
                                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                                        {show.hidden_from_watch_next && (
                                            <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md border border-orange-400/50">
                                                <i className="fas fa-eye-slash"></i> OFF
                                            </span>
                                        )}
                                        {show.status === 'completed' && (
                                            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md border border-green-400/50">
                                                COMPLETED
                                            </span>
                                        )}
                                        {show.status === 'upToDate' && (
                                            <span className="bg-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md border border-purple-400/50">
                                                UP TO DATE
                                            </span>
                                        )}
                                        {show.status === 'toStart' && (
                                            <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md border border-blue-400/50">
                                                WATCHLIST
                                            </span>
                                        )}
                                        {show.status === 'inProgress' && (
                                            <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded shadow-md border border-red-400/50">
                                                {Math.round(show.progressPercentage)}%
                                            </span>
                                        )}
                                        {show.rating > 0 && (
                                            <span className="bg-black/80 text-yellow-500 text-[10px] font-bold px-2 py-1 rounded shadow-md border border-yellow-500/50">
                                                <i className="fas fa-star"></i> {show.rating}
                                            </span>
                                        )}
                                    </div>
                                }
                            />
                        ))}
                    </div>
                )
            ) : (
                <div className="text-center p-10 border-2 border-dashed border-surfaceLight rounded-xl text-textMuted flex flex-col items-center">
                    <i className="fas fa-filter text-5xl mb-4 opacity-30"></i>
                    <p>No shows found for the selected filters.</p>
                </div>
            )}
        </div>
    );
}
