import { getShowDetails } from '../services/tmdb';

// Cache runtimes in localStorage so we don't query TMDB repeatedly
function getCachedRuntimes() {
    try {
        const raw = localStorage.getItem('tvtensei_runtimes_cache');
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveCachedRuntimes(cache) {
    try {
        localStorage.setItem('tvtensei_runtimes_cache', JSON.stringify(cache));
    } catch {}
}

export async function calculateWatchStats(watchedEpisodesData, savedShowsData) {
    if (!watchedEpisodesData || watchedEpisodesData.length === 0) {
        return { months: 0, days: 0, hours: 0, totalMins: 0, topShows: [] };
    }

    let totalMins = 0;
    const showWatchTime = {};
    const runtimeCache = getCachedRuntimes();
    const missingRuntimeShows = new Set();

    watchedEpisodesData.forEach(ep => {
        const showId = Number(ep.show_id);
        if (!ep.runtime && !runtimeCache[showId]) {
            missingRuntimeShows.add(showId);
        }
    });

    let cacheUpdated = false;
    for (const showId of missingRuntimeShows) {
        try {
            const data = await getShowDetails(showId);
            const rt = (data.episode_run_time && data.episode_run_time.length > 0)
                ? data.episode_run_time[0]
                : (data.last_episode_to_air?.runtime || 45);
            runtimeCache[showId] = rt;
            cacheUpdated = true;
        } catch {
            runtimeCache[showId] = 45;
            cacheUpdated = true;
        }
    }

    if (cacheUpdated) {
        saveCachedRuntimes(runtimeCache);
    }

    watchedEpisodesData.forEach(ep => {
        const showId = Number(ep.show_id);
        const rt = Number(ep.runtime) || runtimeCache[showId] || 45;
        totalMins += rt;
        showWatchTime[showId] = (showWatchTime[showId] || 0) + rt;
    });

    const minsInHour = 60;
    const minsInDay = 24 * 60;
    const minsInMonth = 30 * 24 * 60;

    const months = Math.floor(totalMins / minsInMonth);
    let remainder = totalMins % minsInMonth;
    const days = Math.floor(remainder / minsInDay);
    remainder = remainder % minsInDay;
    const hours = Math.floor(remainder / minsInHour);

    const topShows = Object.entries(showWatchTime)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, time]) => {
            const show = savedShowsData.find(s => Number(s.id) === Number(id));
            return { name: show ? show.name : `Show ID: ${id}`, time };
        });

    return { months, days, hours, totalMins, topShows };
}
