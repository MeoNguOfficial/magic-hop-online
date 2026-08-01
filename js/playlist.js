const MENU_BGM_URL = "https://an4sdmu4yskbqrq6.public.blob.vercel-storage.com/new-bg-menu.mp3";

function normalizeBeats(beats) {
    if (!beats) return null;
    let arr = null;
    if (Array.isArray(beats)) {
        arr = beats;
    } else if (typeof beats === 'string') {
        const trimmed = beats.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                arr = JSON.parse(trimmed);
            } catch (e) { }
        }
        if (!arr) {
            arr = trimmed.split(',').map(s => s.trim());
        }
    }
    if (Array.isArray(arr)) {
        return arr.map(Number).filter(n => !isNaN(n) && n >= 0).sort((a, b) => a - b);
    }
    return null;
}
window.normalizeBeats = normalizeBeats;

let playlistSource =
    [
        {
            name: "Dash",
            artist: "MDK",
            beatmapUrl: "beatmap/music_1.json"
        },
        {
            name: "Grossy Chill",
            artist: "Unknown",
            beatmapUrl: "beatmap/music_2.json"
        },
        {
            name: "Kawaikute Gomen (feat. chutan (cv saori hayami)) Hachimi Version",
            artist: "Unknown",
            beatmapUrl: "beatmap/music_3.json"
        },
        {
            name: "Stereo Madness Everyend style",
            artist: "ForeverBound, Dimrain47",
            beatmapUrl: "beatmap/music_4.json"
        },
        {
            name: "Rock It",
            artist: "PetrenjMusic",
            beatmapUrl: "beatmap/music_5.json"
        },
        {
            name: "Last Time",
            artist: "Killrude",
            beatmapUrl: "beatmap/music_6.json"
        },
        {
            name: "Sugar Crush Instrument",
            artist: "Bemax",
            beatmapUrl: "beatmap/music_7.json"
        },
        {
            name: "Girl Power",
            artist: "Dedicated Beats",
            beatmapUrl: "beatmap/music_8.json"
        },
        {
            name: "Pump da Club",
            artist: "Lost Harmories",
            beatmapUrl: "beatmap/music_9.json"
        },
        {
            name: "Symphony Heartbeat",
            artist: "Tape Machines feat. NeiNei",
            beatmapUrl: "beatmap/music_10.json"
        },
        {
            name: "A song with Fire in The Hole",
            artist: "m.s.v",
            beatmapUrl: "beatmap/music_11.json"
        },
        {
            name: "Cycles (Beta Version)",
            artist: "DJVJ, Community Cover",
            beatmapUrl: "beatmap/music_12.json"
        },
        {
            name: "A song with only Air Detected",
            artist: "m.s.v",
            beatmapUrl: "beatmap/music_13.json"
        },
        {
            name: "Thần Tài đến - Hachimi version",
            artist: "Unknown",
            beatmapUrl: "beatmap/music_14.json"
        },
        {
            name: "We wish your a Merry Christmas Funk",
            artist: "VHM4d",
            beatmapUrl: "beatmap/music_15.json"
        },
        {
            name: "Happy New Year Remix",
            artist: "Unknown",
            beatmapUrl: "beatmap/music_16.json"
        },
        {
            name: "Baby Shark Mufin Remix",
            artist: "Trap Music",
            beatmapUrl: "beatmap/music_17.json"
        },
        {
            name: "Japandee Remix",
            artist: "Japandee",
            beatmapUrl: "beatmap/music_18.json"
        },
        {
            name: "Awakening Short",
            artist: "Defqwop",
            beatmapUrl: "beatmap/music_19.json"
        },
        {
            name: "My Heart Short",
            artist: "Different Heaven, EH!DE",
            beatmapUrl: "beatmap/music_20.json"
        },
        {
            name: "The Spectre Full",
            artist: "Alan Walker",
            beatmapUrl: "beatmap/music_21.json"
        },
        {
            name: "Alone",
            artist: "Marshmello",
            beatmapUrl: "beatmap/music_22.json"
        },
        {
            name: "APT Boom Boom (Mix Version)",
            artist: "ROSÉ & Bruno Mars, Vengaboys",
            beatmapUrl: "beatmap/music_23.json"
        },
        {
            name: "The Spectre",
            artist: "Alan Walker",
            beatmapUrl: "beatmap/music_24.json"
        },
        {
            name: "Emotional EDM",
            artist: "7KEYS",
            beatmapUrl: "beatmap/music_25.json"
        },
        {
            name: "Got Me Feelings (Emotional EDM Full)",
            artist: "7KEYS",
            beatmapUrl: "beatmap/music_26.json"
        },
        {
            name: "sd_bbb (The Best Day)",
            artist: "Patricia Taxxon",
            beatmapUrl: "beatmap/music_27.json"
        },
        {
            name: "Castle",
            artist: "Got Me Harddope, Clarx",
            beatmapUrl: "beatmap/music_28.json"
        },
        {
            name: "Reality",
            artist: "Lost Frequencies",
            beatmapUrl: "beatmap/music_29.json"
        },
        {
            name: "Boogie",
            artist: "Joyful, Фрози, Zachz Winner",
            beatmapUrl: "beatmap/music_30.json"
        },
        {
            name: "Can't Slow Down",
            artist: "Reaktor Productions",
            beatmapUrl: "beatmap/music_31.json"
        },
        {
            name: "Witch Doctor",
            artist: "Cartoons",
            beatmapUrl: "beatmap/music_32.json"
        },
        {
            name: "If I Was Your Girlfriend",
            artist: "Mondays, Lucy",
            beatmapUrl: "beatmap/music_33.json"
        },
        {
            name: "Inspired Dubstep",
            artist: "Unknown",
            beatmapUrl: "beatmap/music_34.json"
        },
        {
            name: "Angels",
            artist: "Reaktor Productions",
            beatmapUrl: "beatmap/music_35.json"
        },
        {
            name: "Power Upbeat Rock",
            artist: "Unknown",
            beatmapUrl: "beatmap/music_36.json"
        },
        {
            name: "A song with Chicken Jockey",
            artist: "m.s.v",
            beatmapUrl: "beatmap/music_37.json"
        },
        {
            name: "TRILLIUM HARDTEKK",
            artist: "S3RL",
            beatmapUrl: "beatmap/music_38.json"
        },
        {
            name: "Movitation Indie Rock",
            artist: "Eternety Music",
            beatmapUrl: "beatmap/music_39.json"
        },
        {
            name: "Electroman Adventures Everyend Style",
            artist: "Waterflame, Dimrain47",
            beatmapUrl: "beatmap/music_40.json"
        },
        {
            name: "Aleph-0",
            artist: "Leaf",
            warning_alert: "Level nhịp dồn dập, có thể gây lag cho máy yếu",
            beatmapUrl: "beatmap/music_41.json"
        },
        {
            name: "Trillium (feat. Sara)",
            artist: "S3RL, Sara",
            beatmapUrl: "beatmap/music_42.json"
        },
        {
            name: "Never Be Alone",
            artist: "TheFatRat",
            beatmapUrl: "beatmap/music_43.json"
        },
        {
            name: "Custom music 1",
            artist: "Unknown",
            beatmapUrl: "beatmap/music_44.json"
        },
        {
            name: "Ai đưa em về",
            artist: "TIA",
            beatmapUrl: "beatmap/music_45.json"
        },
        {
            name: "Drum Tết",
            artist: "MeoNguOfficial",
            beatmapUrl: "beatmap/music_46.json"
        },
        {
            name: "Camedansen Custom Remix",
            artist: "Unknown",
            beatmapUrl: "beatmap/music_47.json"
        },
        {
            name: "HACHIMI MAMBO FUNK",
            artist: "36 KINGDOM",
            beatmapUrl: "beatmap/music_48.json"
        },
        {
            name: "Dead of the Night",
            artist: "Hallmore",
            beatmapUrl: "beatmap/music_49.json"
        },
        {
            name: "NOTHING TO LOSE",
            artist: "TWISTED",
            beatmapUrl: "beatmap/music_50.json"
        },
        {
            name: "Felix Navidad Remix",
            artist: "Unknown",
            beatmapUrl: "beatmap/music_51.json"
        },
        {
            name: "Delícia Tchu Tcha Tcha",
            artist: "Mike Noonlight",
            beatmapUrl: "beatmap/music_52.json"
        },
        {
            name: "Fast Rap 1",
            artist: "Yuno Miles",
            beatmapUrl: "beatmap/music_53.json"
        },
        {
            name: "TÌNH BẠN DIỆU KỲ",
            artist: "AMEE, RICKY STAR, LĂNG LD",
            beatmapUrl: "beatmap/music_54.json"
        },
        {
            name: "Custom Music 2",
            artist: "Unknown Artist",
            beatmapUrl: "beatmap/music_55.json"
        },
        {
            name: "Booyah Olé",
            artist: "Garena Free Fire, Selva, Brian Cohen",
            beatmapUrl: "beatmap/music_56.json"
        },
        {
            name: "The FIFA World Cup 26™ Theme",
            artist: "FIFA Sound",
            beatmapUrl: "beatmap/music_57.json"
        },
        {
            name: "Stick Together",
            artist: "Elijah N",
            beatmapUrl: "beatmap/music_58.json"
        },
        {
            name: "Monody",
            artist: "TheFatRat",
            beatmapUrl: "beatmap/music_59.json"
        },
        {
            name: "Như có Bác Hồ trong niềm vui đại thắng",
            artist: "Arrix Remix",
            warning_alert: "Level chỉ mang tính giải trí, không có mục đích chính trị",
            beatmapUrl: "beatmap/music_60.json"
        },
        {
            name: "Epic Dubstep Sport (Short Version)",
            artist: "MS Record",
            beatmapUrl: "beatmap/music_61.json"
        },
        {
            name: "Bang Bang Bang lil yappaminus b remix",
            artist: "lil yappa, BBpanzu",
            beatmapUrl: "beatmap/music_62.json"
        },
        {
            name: "LUNA BALA",
            artist: "Yb Wasg'ood, Ariis",
            beatmapUrl: "beatmap/music_63.json"
        },
        {
            name: "Crazy Frog",
            artist: "Axel",
            beatmapUrl: "beatmap/music_64.json"
        },
        {
            name: "Hai Phút Hơn",
            artist: "Pháo Music",
            beatmapUrl: "beatmap/music_65.json"
        },
        {
            name: "Custom Music 3",
            artist: "Unknown Artist",
            beatmapUrl: "beatmap/music_66.json"
        },
        {
            name: "Ai đưa em về - Minecraft Remix Edition",
            artist: "Unknown Artist",
            beatmapUrl: "beatmap/music_67.json"
        },
        {
            name: "Feelings Remix",
            artist: "Diviners & Azertion",
            beatmapUrl: "beatmap/music_68.json"
        },
        {
            name: "DJ As It's Your Last",
            artist: "Blackpink",
            beatmapUrl: "beatmap/music_69.json"
        },
        {
            name: "Lighters",
            artist: "Galantis, David Guetta",
            beatmapUrl: "beatmap/music_70.json"
        },
    ];
let playlist = [];
let nextCursor = null;
let hasMore = true;
let isLoadingMore = false;
let currentSearchTerm = '';
let currentPlaylistIndices = [];

async function refreshPlaylist(search = '', forceRefresh = true) {
    nextCursor = null;
    hasMore = true;
    isLoadingMore = false;
    currentSearchTerm = search;
    if (typeof playlistRenderStartIndex !== 'undefined') {
        playlistRenderStartIndex = 0;
    }

    await loadPlaylistData(search, forceRefresh);

    if (typeof renderSongList === 'function') {
        renderSongList(search, currentPlaylistIndices);
    }
}
window.refreshPlaylist = refreshPlaylist;



window.mergeIntoPlaylist = function (newMaps) {
    const processedMaps = newMaps.map(item => {
        const normalized = normalizeBeats(item.beats);
        return {
            ...item, // Kế thừa toàn bộ dữ liệu từ DB (url nhạc, beats, speed, bpm...)
            id: item.id,
            name: item.title || item.name,
            artist: item.artist || "Unknown",
            beats: normalized,
            beatmapUrl: item.file_url || item.beatmapUrl || (normalized ? null : `beatmap/music_${item.id}.json`),
            date_show: item.date_show || null,
            time_hide: item.time_hide || null,
            is_available: item.is_available ?? true,
            warning_alert: item.warning_alert || null
        };
    });

    const resultIndices = [];

    processedMaps.forEach(newMap => {
        let existingIndex = playlist.findIndex(m => m.id === newMap.id);
        const hasBeats = newMap.beats && Array.isArray(newMap.beats) && newMap.beats.length > 0;

        if (existingIndex === -1) {
            const newSong = {
                ...newMap,
                lazyUrl: newMap.beatmapUrl,
                loaded: hasBeats, // Nếu có beats từ DB thì coi như đã load
                isLoading: false,
                beats: hasBeats ? newMap.beats : [0, 1, 2, 3],
                no_fake_block: newMap.no_fake_block === true
            };
            playlist.push(newSong);
            existingIndex = playlist.length - 1;
        } else {
            // QUAN TRỌNG: Giữ lại beats/loaded cũ trước khi spread, vì newMap.beats
            // có thể là null (API danh sách không trả full beats) -> nếu để spread
            // ghi đè trực tiếp sẽ làm mất beats đã tải đúng trước đó, khiến game
            // rơi về beatmapBeats mặc định [0,1,2,3] (length 3s, beat sai) khi
            // thoát ra vào lại hoặc gọi refreshPlaylist/loadPlaylistData lần 2+.
            const prevBeats = playlist[existingIndex].beats;
            const prevLoaded = playlist[existingIndex].loaded;
            const prevNormalPassed = playlist[existingIndex].is_normal_mode_passed;
            const prevHardPassed = playlist[existingIndex].is_hard_mode_passed;
            const prevPassed = playlist[existingIndex].is_passed;

            playlist[existingIndex] = {
                ...playlist[existingIndex],
                ...newMap,
                lazyUrl: newMap.beatmapUrl,
                no_fake_block: newMap.no_fake_block === true,
                // Không cho newMap.beats=null/[] ghi đè dữ liệu cũ đã có sẵn
                beats: hasBeats ? newMap.beats : prevBeats,
                loaded: hasBeats ? true : prevLoaded,
                is_normal_mode_passed: newMap.is_normal_mode_passed ?? prevNormalPassed,
                is_hard_mode_passed: newMap.is_hard_mode_passed ?? prevHardPassed,
                is_passed: newMap.is_passed ?? prevPassed
            };
        }
        resultIndices.push(existingIndex);
    });

    return resultIndices;
};

async function loadPlaylistData(search = '', forceRefresh = false) {
    let indices = [];
    currentSearchTerm = search;
    try {
        if (window.ApiService) {
            const params = {};
            if (search) params.search = search;
            if (window.selectedArtistFilter) params.artist = window.selectedArtistFilter;
            if (window.selectedGenreFilter) params.genre = window.selectedGenreFilter;
            if (window.selectedCopyrightFilter) params.copyright_status = window.selectedCopyrightFilter;

            const options = forceRefresh ? { forceRefresh: true } : {};
            const apiResponse = await ApiService.getPublicBeatmaps(params, options);
            if (apiResponse.data?.meta) {
                nextCursor = apiResponse.data.meta.next_cursor;
                hasMore = apiResponse.data.meta.has_more;
            }

            // Lưu filter_options từ API vào biến toàn cục để dropdown dùng
            // Chỉ cập nhật khi không có bộ lọc nào đang active, đảm bảo luôn
            // có danh sách đầy đủ từ DB (không bị thu hẹp bởi query đã lọc).
            if (
                apiResponse.data?.filter_options &&
                !search &&
                !window.selectedArtistFilter &&
                !window.selectedGenreFilter &&
                !window.selectedCopyrightFilter
            ) {
                window.apiFilterOptions = apiResponse.data.filter_options;
            }

            const newMaps = apiResponse.data?.data || apiResponse.data || [];
            if (newMaps.length > 0) {
                indices = window.mergeIntoPlaylist(newMaps);
                console.log("[Playlist] Đã tải playlist từ API.");

                // Lưu vào IndexedDB để dùng khi offline
                if (typeof cachePlaylistToDB === 'function' && !search) {
                    cachePlaylistToDB(newMaps);
                }

                // Đồng bộ cờ passed từ server cho các bài nhạc vừa tải
                if (typeof window.preloadBackendAndPassedStatusOnStartup === 'function') {
                    window.preloadBackendAndPassedStatusOnStartup();
                }
            }


        }
    } catch (e) {
        console.warn("[Playlist] Không thể tải playlist từ API, thử tải từ DB Offline:", e);
        if (typeof getCachedPlaylistFromDB === 'function' && !search) {
            const cachedMaps = await getCachedPlaylistFromDB();
            if (cachedMaps && cachedMaps.length > 0) {
                indices = window.mergeIntoPlaylist(cachedMaps);
                console.log("[Playlist] Đã tải playlist từ IndexedDB (Offline).");
            }
        }
    }

    if (indices.length === 0 && !search) {
        indices = window.mergeIntoPlaylist(playlistSource);
    }

    currentPlaylistIndices = indices;
    return indices;
}


async function loadMoreSongs() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (isLoadingMore || !hasMore || !nextCursor) {
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }

    isLoadingMore = true;
    if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerText = typeof t === 'function' ? t('msg_loading') : 'Đang tải...';
    }

    try {
        const params = { cursor: nextCursor };
        if (currentSearchTerm) params.search = currentSearchTerm;
        if (window.selectedArtistFilter) params.artist = window.selectedArtistFilter;
        if (window.selectedGenreFilter) params.genre = window.selectedGenreFilter;
        if (window.selectedCopyrightFilter) params.copyright_status = window.selectedCopyrightFilter;

        const apiResponse = await ApiService.getPublicBeatmaps(params);
        const newMaps = apiResponse.data?.data || [];

        if (apiResponse.data?.meta) {
            nextCursor = apiResponse.data.meta.next_cursor;
            hasMore = apiResponse.data.meta.has_more;
        } else {
            hasMore = false;
        }

        const indices = window.mergeIntoPlaylist(newMaps);
        currentPlaylistIndices.push(...indices);

        if (typeof window.preloadBackendAndPassedStatusOnStartup === 'function') {
            window.preloadBackendAndPassedStatusOnStartup();
        }

        // Cập nhật thêm vào cache offline để tránh mất dữ liệu mới kéo
        if (typeof cachePlaylistToDB === 'function' && !currentSearchTerm && typeof getCachedPlaylistFromDB === 'function') {
            const existingMaps = await getCachedPlaylistFromDB() || [];
            const existingIds = new Set(existingMaps.map(m => m.id));
            const mapsToCache = [...existingMaps, ...newMaps.filter(m => !existingIds.has(m.id))];
            cachePlaylistToDB(mapsToCache);
        }

        // QUAN TRỌNG: Cần gán false cho cờ tải TRƯỚC KHI gọi hàm render giao diện.
        // Nếu không, song-selector.js sẽ tưởng đang tải và xóa vĩnh viễn nút "Tải Thêm".
        isLoadingMore = false;

        // Trượt cửa sổ hiển thị xuống cuối để thấy dữ liệu mới
        if (typeof playlistRenderStartIndex !== 'undefined' && typeof PLAYLIST_MAX_VISIBLE !== 'undefined') {
            playlistRenderStartIndex = Math.max(0, currentPlaylistIndices.length - PLAYLIST_MAX_VISIBLE);
        }

        // Render lại toàn bộ danh sách với dữ liệu mới
        if (typeof renderSongList === 'function') {
            renderSongList(currentSearchTerm, currentPlaylistIndices);
        }

    } catch (e) {
        console.error("Failed to load more songs:", e);
        if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerText = typeof t === 'function' ? t('msg_error_retry') : 'Lỗi, thử lại';
        }
    } finally {
        isLoadingMore = false;
        // Hàm renderSongList sẽ tự động tạo lại nút "Tải thêm" nếu cần,
        // nên không cần xử lý bật/tắt nút ở đây.
    }
}

/**
 * Cập nhật văn bản trạng thái loading (Hỗ trợ cả Intro và Music loader)
 */
function updateLoadingStatus(key) {
    const text = typeof t === 'function' ? t(key) : key;
    const introStatus = document.getElementById('loading-status');
    const musicStatus = document.getElementById('loading-music-status');
    if (introStatus) introStatus.innerText = text;
    if (musicStatus) musicStatus.innerText = text;
}

async function ensureSongLoaded(index, forceCheck = false) {
    const song = playlist[index];
    if (!song) return song;

    // Nếu bài hát đã có sẵn dữ liệu beats hợp lệ thì bỏ qua bước tải JSON.
    // Lưu ý: kiểm tra trực tiếp song.beats.length > 0 (không chỉ dựa vào cờ
    // song.loaded), vì cờ loaded có thể bị mắc kẹt ở true trong khi beats đã
    // bị merge/ghi đè thành null/[] ở mergeIntoPlaylist -> nếu chỉ check loaded
    // sẽ khiến game không bao giờ tải lại / đọc lại cache JSON, rơi về
    // beatmapBeats mặc định [0,1,2,3] (length 3s, beat sai).
    if (song.beats && Array.isArray(song.beats) && song.beats.length > 4) {
        if (!song.loaded) song.loaded = true; // đồng bộ lại cờ nếu lệch
        return song;
    }

    if (!song.lazyUrl) return song;

    if (song.isLoading) {
        while (song.isLoading) await new Promise(r => setTimeout(r, 50));
        return playlist[index];
    }

    // 1. Kiểm tra Cache địa phương trước
    const cachedData = typeof getCachedJson === 'function' ? await getCachedJson(song.lazyUrl) : null;

    if (!cachedData) {
        // TRƯỜNG HỢP 1: CHƯA CÓ FILE LOCAL -> Bắt đầu tải
        updateLoadingStatus('msg_map_downloading');
        return await downloadBeatmap(index);
    } else {
        // TRƯỜNG HỢP 2: ĐÃ CÓ FILE LOCAL -> Gán dữ liệu để chơi ngay
        // Bỏ điều kiện !song.loaded ở đây: nếu đã rơi đến nhánh này thì beats
        // hiện tại của song chưa hợp lệ (xem điều kiện return sớm phía trên),
        // nên luôn ưu tiên gán lại từ cachedData bất kể cờ loaded đang là gì.
        if (Array.isArray(cachedData)) {
            song.beats = normalizeBeats(cachedData) || [0, 1, 2, 3];
        } else {
            Object.assign(song, cachedData);
            if (cachedData.beats) {
                song.beats = normalizeBeats(cachedData.beats) || [0, 1, 2, 3];
            } else if (!song.beats || song.beats.length <= 4) {
                song.beats = [0, 1, 2, 3];
            }
            song.date_show = song.date_show ?? null;
            song.time_hide = song.time_hide ?? null;
            song.is_available = song.is_available ?? true;
        }
        song.loaded = true;

        // 2. Kiểm tra Version/Hash (ETag) ngầm nếu có mạng
        if (navigator.onLine) {
            if (forceCheck) {
                updateLoadingStatus('msg_checking_map');
                await checkMapVersionInBackground(index, true);
            } else {
                checkMapVersionInBackground(index);
            }
        }
        return song;
    }
}

async function downloadBeatmap(index, forceEtag = null) {
    const song = playlist[index];
    if (!song || !song.lazyUrl) {
        if (song) song.loaded = true;
        return song;
    }
    song.isLoading = true;

    updateLoadingStatus('msg_map_downloading');

    if (typeof renderSongList === 'function') renderSongList();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
        const response = await fetch(song.lazyUrl, { signal: controller.signal, mode: 'cors' });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        // Lưu ETag để đối chiếu version lần sau
        const etag = forceEtag || response.headers.get('ETag');
        if (etag) localStorage.setItem(`map_etag_${song.lazyUrl}`, etag);

        if (Array.isArray(data)) {
            song.beats = normalizeBeats(data) || [0, 1, 2, 3];
        } else {
            Object.assign(song, data);
            if (data.beats) {
                song.beats = normalizeBeats(data.beats) || [0, 1, 2, 3];
            } else if (!song.beats || song.beats.length <= 4) {
                song.beats = [0, 1, 2, 3];
            }
            song.date_show = song.date_show ?? null;
            song.time_hide = song.time_hide ?? null;
            song.is_available = song.is_available ?? true;
        }

        song.loaded = true;
        if (typeof cacheJson === 'function') await cacheJson(song.lazyUrl, data);

        console.log(`[PWA] Map Downloaded/Updated: ${song.name}`);
    } catch (error) {
        clearTimeout(timeoutId);
        console.error("[Playlist] Lỗi tải beatmap:", error);

        // Hiển thị thông báo lỗi và dừng loading nếu đang trong màn hình nạp nhạc
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay && loadingOverlay.style.display !== 'none') {
            loadingOverlay.style.display = 'none';
            isSongLoadingCancelled = true; // Ngăn global.js chạy tiếp vào game
            if (typeof showCyberModal === 'function') {
                showCyberModal({
                    title: t('msg_map_error_title'),
                    message: t('msg_map_error_desc'),
                    type: 'alert'
                });
            }
        }
    } finally {
        song.isLoading = false;
        if (typeof renderSongList === 'function') renderSongList();
    }
    return song;
}

async function checkMapVersionInBackground(index, isBlocking = false) {
    const song = playlist[index];
    if (!song || !song.lazyUrl) return;
    try {
        const response = await fetch(song.lazyUrl, { method: 'HEAD', mode: 'cors' });
        const newEtag = response.headers.get('ETag');
        const oldEtag = localStorage.getItem(`map_etag_${song.lazyUrl}`);

        if (newEtag && oldEtag && newEtag !== oldEtag) {
            console.log(`[PWA] New version detected for ${song.name}, updating...`);
            await downloadBeatmap(index, newEtag);
        }
    } catch (e) { }
}