import React from 'react';

export default function NavItem({ id, icon, label, activeTab, setActiveTab }) {
    const isActive = activeTab === id;
    return (
        <button 
            onClick={() => setActiveTab(id)} 
            className={`flex flex-col md:flex-row items-center justify-center md:justify-start w-full md:w-auto py-3 md:py-4 md:px-6 gap-1 md:gap-4 transition-all duration-300 ${
                isActive 
                    ? 'text-white md:border-r-4 border-primary bg-surfaceLight/30 md:bg-transparent' 
                    : 'text-textMuted hover:text-white hover:bg-surfaceLight/20 md:hover:bg-transparent'
            }`}
        >
            <i className={`fas fa-${icon} text-xl md:text-2xl ${isActive ? 'text-primary scale-110' : ''} transition-all`}></i>
            <span className={`text-[10px] md:text-base font-medium mt-1 md:mt-0 ${isActive ? 'text-primary' : ''}`}>{label}</span>
        </button>
    );
}
