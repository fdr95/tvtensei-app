import React, { useState, useEffect } from 'react';
import { doc, setDoc } from "firebase/firestore";
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { TMDB_IMG_URL, getShowDetails } from '../../services/tmdb';
import { formatDateDisplay } from '../../utils/formatters';

export default function CalendarTab({ openShowModal }) {
    const { currentUid } = useAuth();
    const { savedShowsData } = useData();

    const [upcomingEpisodes, setUpcomingEpisodes] = useState([]);
    const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchUpcomingAndSync = async () => {
            if (!savedShowsData || savedShowsData.length === 0) {
                setUpcomingEpisodes([]);
                return;
            }

            setIsLoadingCalendar(true);
            try {
                const results = [];
                // Only sync shows that are active to save API calls
                const activeShows = savedShowsData.filter(s => !['Ended', 'Canceled'].includes(s.show_status));

                for (let i = 0; i < activeShows.length; i += 10) {
                    const chunk = activeShows.slice(i, i + 10);
                    const promises = chunk.map(async (show) => {
                        try {
                            const data = await getShowDetails(show.id);
                            // Silent Sync
                            if (currentUid && db && (data.number_of_episodes !== show.total_episodes || data.status !== show.show_status)) {
                                setDoc(doc(db, 'users', currentUid, 'shows', show.id.toString()), { 
                                    total_episodes: data.number_of_episodes || null, 
                                    show_status: data.status || null 
                                }, { merge: true });
                            }
                            if (data.next_episode_to_air) {
                                return { 
                                    showId: data.id, 
                                    showName: data.name, 
                                    posterPath: data.poster_path, 
                                    episode: data.next_episode_to_air,
                                    showData: { id: data.id, name: data.name, poster_path: data.poster_path }
                                };
                            }
                        } catch {}
                        return null;
                    });

                    const chunkResults = await Promise.all(promises);
                    results.push(...chunkResults.filter(Boolean));
                    await new Promise(r => setTimeout(r, 150));
                }

                const today = new Date(); 
                today.setHours(0,0,0,0);
                const tomorrow = new Date(today); 
                tomorrow.setDate(tomorrow.getDate() + 1);

                const calendarEps = results.filter(item => {
                    const airDate = new Date(item.episode.air_date); 
                    airDate.setHours(0,0,0,0);
                    return airDate > tomorrow;
                });

                calendarEps.sort((a, b) => new Date(a.episode.air_date) - new Date(b.episode.air_date));
                if (isMounted) {
                    setUpcomingEpisodes(calendarEps);
                }
            } catch (error) {
                console.error("Error in calendar fetch:", error);
            } finally {
                if (isMounted) {
                    setIsLoadingCalendar(false);
                }
            }
        };

        const timer = setTimeout(fetchUpcomingAndSync, 500);
        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [savedShowsData, currentUid]);

    return (
        <div className="p-4 md:p-8 animate-fade-in pb-24">
            <h2 className="text-3xl font-bold mb-2">Calendar</h2>
            <p className="text-textMuted mb-8">Upcoming episodes!</p>

            {isLoadingCalendar ? (
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
