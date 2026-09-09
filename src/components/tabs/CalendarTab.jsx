import React from 'react';
import { useData } from '../../context/DataContext';
import { TMDB_IMG_URL } from '../../services/tmdb';
import { formatDateDisplay } from '../../utils/formatters';

export default function CalendarTab({ openShowModal }) {
    const { upcomingEpisodes, isLoadingCalendar } = useData();

    return (
        <div className="p-4 md:p-8 animate-fade-in pb-24">
            <h2 className="text-3xl font-bold mb-2">Calendar</h2>
            <p className="text-textMuted mb-8">Upcoming episodes!</p>

            {isLoadingCalendar && upcomingEpisodes.length === 0 ? (
                <div className="flex justify-center p-10">
                    <i className="fas fa-spinner fa-spin text-primary text-4xl"></i>
                </div>
            ) : upcomingEpisodes.length > 0 ? (
                <div className="space-y-4">
                    {upcomingEpisodes.map(item => (
                        <div 
                            key={item.episode.id} 
                            onClick={() => openShowModal(item.showData)} 
                            className="bg-surface p-4 rounded-xl border border-surfaceLight flex items-center gap-4 transition-transform hover:-translate-y-1 cursor-pointer hover:border-primary/50"
                        >
                            {item.posterPath ? (
                                <img 
                                    src={`${TMDB_IMG_URL}${item.posterPath}`} 
                                    className="w-16 h-24 object-cover rounded-lg shadow-md" 
                                    alt="" 
                                />
                            ) : (
                                <div className="w-16 h-24 bg-surfaceLight/50 rounded-lg flex items-center justify-center text-textMuted">
                                    <i className="fas fa-tv"></i>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-primary font-bold mb-1 truncate">{item.showName}</div>
                                <div className="text-sm md:text-lg font-bold text-white mb-1 truncate">{item.episode.name}</div>
                                <div className="text-xs md:text-sm text-textMuted">Season {item.episode.season_number} • Episode {item.episode.episode_number}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-white font-bold text-xs md:text-sm bg-primary px-3 py-1 rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)] whitespace-nowrap">
                                    {formatDateDisplay(item.episode.air_date)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center p-8 border-2 border-dashed border-surfaceLight rounded-xl text-textMuted">
                    <i className="fas fa-calendar-times text-4xl mb-3 opacity-50"></i>
                    <p>No upcoming episodes found.</p>
                </div>
            )}
        </div>
    );
}
