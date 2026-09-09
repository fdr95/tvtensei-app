export const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMG_URL = 'https://image.tmdb.org/t/p/w500';
export const TMDB_BACKDROP_URL = 'https://image.tmdb.org/t/p/w1280';

// Simple in-memory cache to prevent redundant TMDB API requests
const cache = new Map();

async function fetchWithCache(url, ttlMs = 5 * 60 * 1000) {
    const cached = cache.get(url);
    if (cached && (Date.now() - cached.timestamp < ttlMs)) {
        return cached.data;
    }

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`TMDB fetch failed with status ${res.status}`);
    }
    const data = await res.json();
    cache.set(url, { data, timestamp: Date.now() });
    return data;
}

export async function searchShows(query) {
    if (!query || query.trim().length < 2) return [];
    const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US`;
    try {
        const data = await fetchWithCache(url);
        return data.results || [];
    } catch {
        return [];
    }
}

export async function getShowDetails(showId) {
    const url = `${TMDB_BASE_URL}/tv/${showId}?api_key=${TMDB_API_KEY}&language=en-US`;
    return fetchWithCache(url);
}

export async function getSeasonDetails(showId, seasonNumber) {
    const url = `${TMDB_BASE_URL}/tv/${showId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`;
    return fetchWithCache(url);
}

export async function searchMovies(query) {
    if (!query || query.trim().length < 2) return [];
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US`;
    try {
        const data = await fetchWithCache(url);
        return data.results || [];
    } catch {
        return [];
    }
}

export async function getMovieDetails(movieId) {
    const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`;
    return fetchWithCache(url);
}

export async function getTrendingMovies() {
    const url = `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`;
    try {
        const data = await fetchWithCache(url);
        return data.results || [];
    } catch {
        return [];
    }
}

export async function getMovieRecommendations(movieId) {
    const url = `${TMDB_BASE_URL}/movie/${movieId}/recommendations?api_key=${TMDB_API_KEY}&language=en-US`;
    try {
        const data = await fetchWithCache(url);
        return data.results || [];
    } catch {
        return [];
    }
}
