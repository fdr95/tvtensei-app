import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { calculateWatchStats } from '../../utils/stats';
import { importTvTimeZip } from '../../utils/tvTimeImport';

export default function ProfileTab({ modalDefaultFS, setModalDefaultFS }) {
    const { user, currentUid, logout } = useAuth();
    const { watchedEpisodesData, savedShowsData } = useData();

    const [stats, setStats] = useState({ months: 0, days: 0, hours: 0, totalMins: 0, topShows: [] });
    const [isCalculatingStats, setIsCalculatingStats] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState("");

    useEffect(() => {
        let isMounted = true;
        const fetchStats = async () => {
            if (!watchedEpisodesData || watchedEpisodesData.length === 0) {
                setStats({ months: 0, days: 0, hours: 0, totalMins: 0, topShows: [] });
                return;
            }
            setIsCalculatingStats(true);
            try {
                const calculated = await calculateWatchStats(watchedEpisodesData, savedShowsData);
                if (isMounted) setStats(calculated);
            } catch (err) {
                console.error("Error calculating stats:", err);
            } finally {
                if (isMounted) setIsCalculatingStats(false);
            }
        };

        const timer = setTimeout(fetchStats, 500);
        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [watchedEpisodesData, savedShowsData]);

    const handleZipImport = async (event) => {
        const file = event.target.files[0];
        if (!file || !currentUid) return;

        setIsImporting(true);
        try {
            const summary = await importTvTimeZip(file, currentUid, setImportStatus);
            setImportStatus(`Finished! Scanned ${summary.filesCount} files. Imported ${summary.showsCount} shows and ${summary.episodesCount} episodes.`);
            setTimeout(() => {
                setIsImporting(false);
                setImportStatus("");
            }, 5000);
        } catch (error) {
            console.error("Import error:", error);
            setImportStatus(`Error: ${error.message}`);
            setTimeout(() => {
                setIsImporting(false);
                setImportStatus("");
            }, 8000);
        }
    };

    return (
        <div className="p-4 md:p-8 animate-fade-in pb-24">
            <h2 className="text-3xl font-bold mb-2">Profile</h2>
            <p className="text-textMuted mb-8">Your Otaku statistics and settings.</p>
            
            {/* Stats Dashboard */}
            {isCalculatingStats ? (
                <div className="flex flex-col items-center justify-center p-8 border border-surfaceLight rounded-xl mb-8">
                    <i className="fas fa-satellite-dish fa-spin text-primary text-3xl mb-3"></i>
                    <p className="text-textMuted text-sm">Calculating watch time...</p>
                </div>
            ) : (
                <div className="mb-8 bg-surfaceLight/10 border border-surfaceLight rounded-xl p-6">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-3xl md:text-5xl font-extrabold text-primary mb-1 drop-shadow-[0_0_10px_rgba(229,9,20,0.4)]">
                                {stats.months}
                            </div>
                            <div className="text-xs md:text-sm text-textMuted uppercase tracking-wider font-semibold">Months</div>
                        </div>
                        <div>
                            <div className="text-3xl md:text-5xl font-extrabold text-white mb-1">
                                {stats.days}
                            </div>
                            <div className="text-xs md:text-sm text-textMuted uppercase tracking-wider font-semibold">Days</div>
                        </div>
                        <div>
                            <div className="text-3xl md:text-5xl font-extrabold text-white mb-1">
                                {stats.hours}
                            </div>
                            <div className="text-xs md:text-sm text-textMuted uppercase tracking-wider font-semibold">Hours</div>
                        </div>
                    </div>
                    
                    {stats.topShows.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-surfaceLight/50">
                            <h4 className="text-sm text-textMuted uppercase tracking-wider font-bold mb-4">
                                <i className="fas fa-trophy text-yellow-500 mr-2"></i> Most Watched Shows
                            </h4>
                            <div className="space-y-4">
                                {stats.topShows.map((show, i) => {
                                    const maxTime = stats.topShows[0].time > 0 ? stats.topShows[0].time : 1;
                                    const percentage = (show.time / maxTime) * 100;
                                    return (
                                        <div key={i} className="group">
                                            <div className="flex justify-between text-xs md:text-sm text-gray-300 mb-1">
                                                <span className="font-semibold truncate pr-4">{show.name}</span>
                                                <span className="flex-shrink-0 text-textMuted">
                                                    {Math.floor(show.time / 60)}h {show.time % 60}m
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-1000 ${i === 0 ? 'bg-primary' : 'bg-surfaceLight group-hover:bg-primary/50'}`} 
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Settings */}
            <div className="mt-8 mb-10">
                <h4 className="text-sm text-textMuted uppercase tracking-wider font-bold mb-4">
                    <i className="fas fa-cog mr-2 text-primary"></i> Settings
                </h4>
                <div className="bg-surfaceLight/10 border border-surfaceLight rounded-xl p-4 flex justify-between items-center hover:bg-surfaceLight/20 transition-colors">
                    <div>
                        <h4 className="text-white font-bold text-sm md:text-base">Default Modal View</h4>
                        <p className="text-xs text-textMuted mt-1">Open shows in fullscreen mode by default</p>
                    </div>
                    <button 
                        onClick={() => { 
                            const newVal = !modalDefaultFS; 
                            setModalDefaultFS(newVal); 
                            localStorage.setItem('tvtensei_fs_modal', String(newVal)); 
                        }} 
                        className={`w-12 h-6 md:w-14 md:h-7 rounded-full relative transition-colors shadow-inner ${modalDefaultFS ? 'bg-primary' : 'bg-surfaceLight'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 md:w-5 md:h-5 rounded-full bg-white transition-transform ${modalDefaultFS ? 'translate-x-6 md:translate-x-7' : 'translate-x-0'}`}></div>
                    </button>
                </div>
            </div>

            {/* TV Time Import */}
            <div className="mt-8 mb-10">
                <h4 className="text-sm text-textMuted uppercase tracking-wider font-bold mb-4">
                    <i className="fas fa-file-import mr-2 text-primary"></i> Import from TV Time
                </h4>
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors relative bg-surfaceLight/10 ${isImporting ? 'border-primary opacity-80' : 'border-surfaceLight hover:border-primary cursor-pointer group'}`}>
                    <input 
                        type="file" 
                        accept=".zip" 
                        onChange={handleZipImport} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        disabled={isImporting} 
                    />
                    {isImporting ? (
                        <div className="flex flex-col items-center justify-center">
                            <i className="fas fa-spinner fa-spin text-3xl mb-3 text-primary"></i>
                            <p className="text-white font-medium mt-2">{importStatus}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center pointer-events-none">
                            <i className="fas fa-file-archive text-4xl mb-3 text-textMuted group-hover:text-primary transition-colors"></i>
                            <h3 className="font-bold text-lg text-white mb-1">Upload .zip archive</h3>
                            <p className="text-textMuted text-sm">Drag or click to upload your exported data</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Logout */}
            <div className="mt-12 mb-10 border-t border-surfaceLight pt-8">
                <button 
                    onClick={logout} 
                    className="w-full flex items-center justify-center gap-2 bg-transparent border border-red-600/50 text-red-500 hover:bg-red-600 hover:text-white font-bold py-3 px-4 rounded-xl transition-all"
                >
                    <i className="fas fa-sign-out-alt"></i> Logout ({user?.email || 'Guest'})
                </button>
            </div>
        </div>
    );
}
