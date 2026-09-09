import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import AuthScreen from './components/auth/AuthScreen';
import NavItem from './components/common/NavItem';
import ShowModal from './components/modals/ShowModal';
import MovieModal from './components/modals/MovieModal';
import WatchNextTab from './components/tabs/WatchNextTab';
import DiscoverTab from './components/tabs/DiscoverTab';
import HistoryTab from './components/tabs/HistoryTab';
import SearchTab from './components/tabs/SearchTab';
import CalendarTab from './components/tabs/CalendarTab';
import ProfileTab from './components/tabs/ProfileTab';
import MovieHub from './components/movies/MovieHub';

function MainApp() {
    const { user, isAuthReady, isFirebaseConfigured } = useAuth();

    // Navigation
    const [activeTab, setActiveTab] = useState('watch-next');
    const [movieTab, setMovieTab] = useState('toWatch');

    // Modal settings and state
    const [modalDefaultFS, setModalDefaultFS] = useState(
        () => localStorage.getItem('tvtensei_fs_modal') === 'true'
    );
    const [isFullscreen, setIsFullscreen] = useState(modalDefaultFS);
    const [selectedShow, setSelectedShow] = useState(null);
    const [selectedMovie, setSelectedMovie] = useState(null);

    const openShowModal = (show) => {
        setIsFullscreen(modalDefaultFS);
        setSelectedShow(show);
    };

    const openMovieModal = (movie) => {
        setIsFullscreen(modalDefaultFS);
        setSelectedMovie(movie);
    };

    if (!isFirebaseConfigured) {
        return (
            <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-8 text-center">
                <i className="fas fa-exclamation-triangle text-primary text-6xl mb-6"></i>
                <h1 className="text-3xl font-bold mb-4">Missing Configuration</h1>
                <p className="text-textMuted max-w-lg mb-8">
                    Please check your <code>.env</code> file. Firebase API keys are required to boot the application.
                </p>
                <div className="bg-surfaceLight p-6 rounded-xl border border-surface w-full max-w-xl text-left font-mono text-sm">
                    <p className="text-green-400 mb-2">Ensure these are set:</p>
                    VITE_FIREBASE_API_KEY=...<br/>
                    VITE_FIREBASE_AUTH_DOMAIN=...<br/>
                    VITE_TMDB_API_KEY=...
                </div>
            </div>
        );
    }

    if (!isAuthReady) {
        return (
            <div className="h-screen w-screen bg-background flex flex-col items-center justify-center text-white">
                <i className="fas fa-play text-primary text-4xl mb-4 animate-bounce"></i>
                <h1 className="text-2xl font-bold tracking-tight">TV<span className="text-primary">Tensei</span></h1>
            </div>
        );
    }

    if (!user) {
        return <AuthScreen />;
    }

    return (
        <DataProvider>
            <div className="flex flex-col md:flex-row h-screen bg-background font-sans text-textMain">
                {/* Side Navigation (Desktop) / Bottom Navigation (Mobile) */}
                <nav className="order-2 md:order-1 w-full md:w-64 bg-surface border-t md:border-t-0 md:border-r border-surfaceLight flex md:flex-col justify-around md:justify-start pb-safe md:py-8 z-20 flex-shrink-0 relative">
                    <div className="hidden md:flex px-6 mb-10 items-center gap-3">
                        <div className="bg-primary text-white w-10 h-10 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.3)]">
                            <i className="fas fa-play"></i>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            TV<span className="text-primary">Tensei</span>
                        </h1>
                    </div>

                    <div className="flex w-full md:flex-col gap-0 md:gap-2">
                        <NavItem id="watch-next" icon="play-circle" label="Watch Next" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <NavItem id="discover" icon="compass" label="Discover" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <NavItem id="history" icon="list-ul" label="Library" activeTab={activeTab} setActiveTab={setActiveTab} />
                        
                        <div className="flex flex-col w-full md:w-auto relative group">
                            <button 
                                onClick={() => setActiveTab('movies')} 
                                className={`flex flex-col md:flex-row items-center justify-center md:justify-start w-full py-3 md:py-4 md:px-6 gap-1 md:gap-4 transition-all duration-300 ${
                                    activeTab === 'movies' 
                                        ? 'text-white md:border-r-4 border-primary bg-surfaceLight/30 md:bg-transparent' 
                                        : 'text-textMuted hover:text-white hover:bg-surfaceLight/20 md:hover:bg-transparent'
                                }`}
                            >
                                <i className={`fas fa-film text-xl md:text-2xl ${activeTab === 'movies' ? 'text-primary scale-110' : ''} transition-all`}></i>
                                <span className={`text-[10px] md:text-base font-medium mt-1 md:mt-0 ${activeTab === 'movies' ? 'text-primary' : ''}`}>Movies</span>
                            </button>
                            {activeTab === 'movies' && (
                                <div className="hidden md:flex flex-col pl-14 mt-1 space-y-1 mb-2">
                                    <button 
                                        onClick={() => setMovieTab('toWatch')} 
                                        className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all text-sm ${movieTab === 'toWatch' ? 'text-white bg-surfaceLight/30 border-l-2 border-primary' : 'text-textMuted hover:text-white'}`}
                                    >
                                        <i className="fas fa-bookmark w-4 text-center"></i> To Watch
                                    </button>
                                    <button 
                                        onClick={() => setMovieTab('watched')} 
                                        className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all text-sm ${movieTab === 'watched' ? 'text-white bg-surfaceLight/30 border-l-2 border-primary' : 'text-textMuted hover:text-white'}`}
                                    >
                                        <i className="fas fa-check-circle w-4 text-center"></i> Watched
                                    </button>
                                    <button 
                                        onClick={() => setMovieTab('suggested')} 
                                        className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all text-sm ${movieTab === 'suggested' ? 'text-white bg-surfaceLight/30 border-l-2 border-primary' : 'text-textMuted hover:text-white'}`}
                                    >
                                        <i className="fas fa-lightbulb text-primary w-4 text-center"></i> Suggested
                                    </button>
                                </div>
                            )}
                        </div>

                        <NavItem id="search" icon="search" label="Search" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <NavItem id="calendar" icon="calendar-days" label="Calendar" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <NavItem id="profile" icon="user" label="Profile" activeTab={activeTab} setActiveTab={setActiveTab} />
                    </div>
                </nav>

                {/* Mobile Header */}
                <header className="md:hidden order-1 bg-surface border-b border-surfaceLight p-4 flex items-center justify-center z-10 sticky top-0">
                    <div className="bg-primary text-white w-7 h-7 rounded-md flex items-center justify-center mr-2 shadow-[0_0_10px_rgba(229,9,20,0.3)]">
                        <i className="fas fa-play text-xs"></i>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">
                        TV<span className="text-primary">Tensei</span>
                    </h1>
                </header>

                {/* Main Content Area */}
                <main className="order-1 md:order-2 flex-1 overflow-y-auto hide-scrollbar relative pb-16 md:pb-0 bg-background">
                    <div className="max-w-6xl mx-auto">
                        {activeTab === 'watch-next' && <WatchNextTab openShowModal={openShowModal} />}
                        {activeTab === 'history' && <HistoryTab openShowModal={openShowModal} />}
                        {activeTab === 'discover' && <DiscoverTab openShowModal={openShowModal} />}
                        {activeTab === 'search' && <SearchTab openShowModal={openShowModal} />}
                        {activeTab === 'movies' && (
                            <MovieHub 
                                movieTab={movieTab} 
                                setMovieTab={setMovieTab} 
                                openMovieModal={openMovieModal} 
                            />
                        )}
                        {activeTab === 'calendar' && <CalendarTab openShowModal={openShowModal} />}
                        {activeTab === 'profile' && (
                            <ProfileTab 
                                modalDefaultFS={modalDefaultFS} 
                                setModalDefaultFS={setModalDefaultFS} 
                            />
                        )}
                    </div>
                </main>

                {/* Show Details Modal */}
                {selectedShow && (
                    <ShowModal 
                        selectedShow={selectedShow} 
                        onClose={() => setSelectedShow(null)} 
                        isFullscreen={isFullscreen} 
                        toggleFullscreen={() => setIsFullscreen(!isFullscreen)} 
                    />
                )}

                {/* Movie Details Modal */}
                {selectedMovie && (
                    <MovieModal 
                        selectedMovie={selectedMovie} 
                        onClose={() => setSelectedMovie(null)} 
                        isFullscreen={isFullscreen} 
                        toggleFullscreen={() => setIsFullscreen(!isFullscreen)} 
                    />
                )}
            </div>
        </DataProvider>
    );
}

export default function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <MainApp />
            </AuthProvider>
        </ErrorBoundary>
    );
}