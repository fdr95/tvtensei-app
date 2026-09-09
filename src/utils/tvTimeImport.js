import JSZip from 'jszip';
import Papa from 'papaparse';
import { doc, writeBatch } from "firebase/firestore";
import { db } from '../services/firebase';
import { TMDB_BASE_URL, TMDB_API_KEY, getShowDetails } from '../services/tmdb';

export async function importTvTimeZip(file, currentUid, onStatusUpdate) {
    if (!file || !currentUid) return;

    onStatusUpdate("Scanning ZIP archive...");

    const zip = new JSZip();
    const contents = await zip.loadAsync(file);

    const extractedData = { followedShows: new Set(), seenEpisodes: new Map(), filesScanned: [] };
    const showNameKeys = ['tv_show_name', 'series_name', 'show_name', 'name', 'tvshow'];
    const seasonKeys = ['episode_season_number', 'season_number', 'season'];
    const episodeKeys = ['episode_number', 'episode', 'ep_number'];

    for (const [filename, zipEntry] of Object.entries(contents.files)) {
        if (zipEntry.dir || filename.includes('__MACOSX') || !filename.toLowerCase().endsWith('.csv')) continue;
        extractedData.filesScanned.push(filename);
        onStatusUpdate(`Analyzing file: ${filename}...`);

        let csvText = await zipEntry.async("text");
        csvText = csvText.replace(/^\uFEFF/, '');

        const parsed = await new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: 'greedy',
                transformHeader: h => h.replace(/["'\\]/g, '').trim().toLowerCase(),
                complete: (res) => resolve(res.data),
                error: (err) => reject(err)
            });
        });

        if (!parsed || parsed.length === 0) continue;

        const headers = Object.keys(parsed[0]);
        const showKey = headers.find(h => showNameKeys.includes(h)) || headers.find(h => h.includes('show') || h.includes('name'));
        const seasonKey = headers.find(h => seasonKeys.includes(h)) || headers.find(h => h.includes('season') && !h.includes('id'));
        const epKey = headers.find(h => episodeKeys.includes(h)) || headers.find(h => h.includes('episode') && !h.includes('season') && !h.includes('id'));

        for (const row of parsed) {
            let showName = showKey ? row[showKey] : null;
            if (!showName) continue;
            showName = showName.trim();
            extractedData.followedShows.add(showName);

            if (seasonKey && epKey) {
                const seasonNum = parseInt(row[seasonKey], 10);
                const epNum = parseInt(row[epKey], 10);
                if (!isNaN(seasonNum) && !isNaN(epNum)) {
                    const compositeKey = `${showName}-S${seasonNum}E${epNum}`;
                    if (!extractedData.seenEpisodes.has(compositeKey)) {
                        extractedData.seenEpisodes.set(compositeKey, { showName, seasonNum, epNum });
                    }
                }
            }
        }
    }

    const uniqueShowsArray = Array.from(extractedData.followedShows);
    const seenEpisodesArray = Array.from(extractedData.seenEpisodes.values());

    if (uniqueShowsArray.length === 0 && seenEpisodesArray.length === 0) {
        throw new Error("CSV files read successfully, but no valid shows or episodes were found.");
    }

    onStatusUpdate(`Found ${uniqueShowsArray.length} unique shows. Searching TMDB...`);

    const showIdMap = new Map();
    let processed = 0;

    for (const showName of uniqueShowsArray) {
        processed++;
        if (processed % 5 === 0) {
            onStatusUpdate(`Syncing TMDB: ${processed}/${uniqueShowsArray.length} shows...`);
        }

        const cleanName = showName.replace(/\s\(\d{4}\)$/, '').trim();
        try {
            let res = await fetch(`${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanName)}&language=en-US`);
            let data = await res.json();
            if (data.results && data.results.length > 0) {
                showIdMap.set(showName, data.results[0]);
            } else if (cleanName.includes(':')) {
                res = await fetch(`${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanName.split(':')[0])}&language=en-US`);
                data = await res.json();
                if (data.results && data.results.length > 0) {
                    showIdMap.set(showName, data.results[0]);
                }
            }
        } catch {}
        await new Promise(r => setTimeout(r, 100));
    }

    onStatusUpdate(`Saving to Firebase...`);
    let batch = writeBatch(db);
    let batchCount = 0;
    let totalShowsImported = 0;
    let totalEpsImported = 0;

    for (const showName of uniqueShowsArray) {
        const foundShow = showIdMap.get(showName);
        if (foundShow) {
            let totalEps = null;
            let showStatus = null;
            try {
                const dataDetail = await getShowDetails(foundShow.id);
                totalEps = dataDetail.number_of_episodes;
                showStatus = dataDetail.status;
            } catch {}

            batch.set(doc(db, 'users', currentUid, 'shows', foundShow.id.toString()), {
                name: foundShow.name,
                poster_path: foundShow.poster_path || null,
                added_at: new Date().toISOString(),
                rating: 0,
                total_episodes: totalEps || null,
                show_status: showStatus || null,
                hidden_from_watch_next: false
            }, { merge: true });

            batchCount++;
            totalShowsImported++;
            if (batchCount >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
            }
        }
    }

    for (const ep of seenEpisodesArray) {
        const foundShow = showIdMap.get(ep.showName);
        if (foundShow) {
            const compositeId = `${foundShow.id}_S${ep.seasonNum}E${ep.epNum}`;
            batch.set(doc(db, 'users', currentUid, 'watched_episodes', compositeId), {
                show_id: foundShow.id,
                season_number: ep.seasonNum,
                episode_number: ep.epNum,
                runtime: 0,
                watched_at: new Date().toISOString()
            }, { merge: true });

            batchCount++;
            totalEpsImported++;
            if (batchCount >= 400) {
                onStatusUpdate(`Saved ${totalEpsImported} episodes to Firebase...`);
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
            }
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    if (totalShowsImported === 0 && totalEpsImported === 0) {
        throw new Error(`Data extracted, but no matching shows found on TMDB.`);
    }

    return {
        filesCount: extractedData.filesScanned.length,
        showsCount: totalShowsImported,
        episodesCount: totalEpsImported
    };
}
