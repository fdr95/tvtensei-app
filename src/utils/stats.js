import { getShowDetails } from '../services/tmdb';

export async function calculateWatchStats(watchedEpisodesData, savedShowsData) {
    if (!watchedEpisodesData || watchedEpisodesData.length === 0) {
        return { months: 0, days: 0, hours: 0, totalMins: 0, topShows: [] };
    }

    let totalMins = 0;
    const showWatchTime = {};
    const missingRuntimeShows = new Set();

    watchedEpisodesData.forEach(ep => {
        if (!ep.runtime) missingRuntimeShows.add(ep.show_id);
    });

    const avgRuntimes = {};
    for (const showId of missingRuntimeShows) {
        try {
            const data = await getShowDetails(showId);
            avgRuntimes[showId] = (data.episode_run_time && data.episode_run_time.length > 0)
                ? data.episode_run_time[0]
                : (data.last_episode_to_air?.runtime || 45);
        } catch {
            avgRuntimes[showId] = 45;
        }
    }

    watchedEpisodesData.forEach(ep => {
        const rt = ep.runtime || avgRuntimes[ep.show_id] || 45;
        totalMins += rt;
        showWatchTime[ep.show_id] = (showWatchTime[ep.show_id] || 0) + rt;
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
            const show = savedShowsData.find(s => s.id === Number(id));
            return { name: show ? show.name : `Show ID: ${id}`, time };
        });

    return { months, days, hours, totalMins, topShows };
}
