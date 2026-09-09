import React from 'react';

export default function DiscoverTab() {
    return (
        <div className="p-4 md:p-8 animate-fade-in pb-24">
            <h2 className="text-3xl font-bold mb-2">Discover</h2>
            <p className="text-textMuted mb-8">Trending globally this week.</p>
            <div className="text-center p-10 border-2 border-dashed border-surfaceLight rounded-xl text-textMuted">
                <i className="fas fa-compass text-5xl mb-4 opacity-30"></i>
                <p>Explore function is now powered by TMDB Trends.</p>
            </div>
        </div>
    );
}
