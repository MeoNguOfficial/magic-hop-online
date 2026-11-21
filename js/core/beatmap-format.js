// ============================================================
// beatmap-format.js — Chuẩn hóa & mở rộng định dạng Beatmap
// Hỗ trợ: Beat thường (number), Gạch Xoáy ([x]), Gạch Lướt ([start, end]),
// và Group Force Straight ("<a,b,c,...>" hoặc <a,b,c,...> chưa bọc ngoặc kép)
// ============================================================
(function (globalScope) {
    'use strict';

    function roundTime(val, round3) {
        return round3 ? Number(val.toFixed(3)) : val;
    }

    function splitTopLevelCommas(str) {
        const parts = [];
        let current = '';
        let squareDepth = 0;
        let angleDepth = 0;
        let inString = false;
        let escaped = false;

        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (inString) {
                current += ch;
                if (escaped) {
                    escaped = false;
                } else if (ch === '\\') {
                    escaped = true;
                } else if (ch === '"') {
                    inString = false;
                }
                continue;
            }
            if (ch === '"') {
                inString = true;
                current += ch;
                continue;
            }
            if (ch === '[') squareDepth++;
            else if (ch === ']' && squareDepth > 0) squareDepth--;
            else if (ch === '<') angleDepth++;
            else if (ch === '>' && angleDepth > 0) angleDepth--;
            else if (ch === ',' && squareDepth === 0 && angleDepth === 0) {
                const t = current.trim();
                if (t) parts.push(t);
                current = '';
                continue;
            }
            current += ch;
        }
        const last = current.trim();
        if (last) parts.push(last);
        return parts;
    }

    /**
     * Bọc các token <a,b,c,...> không có ngoặc kép bên ngoài chuỗi JSON thành chuỗi JSON hợp lệ "<a,b,c,...>"
     */
    function preprocessBeatmapJsonText(rawText) {
        if (typeof rawText !== 'string') return '';
        let out = '';
        let inString = false;
        let escaped = false;

        for (let i = 0; i < rawText.length; i++) {
            const ch = rawText[i];
            if (inString) {
                out += ch;
                if (escaped) {
                    escaped = false;
                } else if (ch === '\\') {
                    escaped = true;
                } else if (ch === '"') {
                    inString = false;
                }
                continue;
            }

            if (ch === '"') {
                inString = true;
                out += ch;
                continue;
            }

            if (ch === '<') {
                let endIdx = -1;
                let bracketDepth = 0;
                for (let j = i + 1; j < rawText.length; j++) {
                    const c = rawText[j];
                    if (c === '[') bracketDepth++;
                    else if (c === ']' && bracketDepth > 0) bracketDepth--;
                    else if (c === '{' || c === '}') break;
                    else if (c === '>' && bracketDepth === 0) {
                        endIdx = j;
                        break;
                    }
                }
                if (endIdx !== -1) {
                    const token = rawText.slice(i, endIdx + 1);
                    out += JSON.stringify(token);
                    i = endIdx;
                    continue;
                }
            }

            out += ch;
        }
        return out;
    }

    function parseBeatmapJsonText(rawText) {
        const preprocessed = preprocessBeatmapJsonText(rawText);
        return JSON.parse(preprocessed);
    }

    function parseScalarOrTupleBeat(item, round3 = false) {
        if (Array.isArray(item)) {
            if (item.length === 1) {
                const single = Number(item[0]);
                return (Number.isFinite(single) && single >= 0) ? [roundTime(single, round3)] : null;
            }
            if (item.length >= 2) {
                const start = Number(item[0]);
                const end = Number(item[item.length - 1]);
                if (Number.isFinite(start) && Number.isFinite(end) && end > start && start >= 0) {
                    return [roundTime(start, round3), roundTime(end, round3)];
                }
                return (Number.isFinite(start) && start >= 0) ? roundTime(start, round3) : null;
            }
            return null;
        }
        if (typeof item === 'string') {
            const t = item.trim();
            if (!t) return null;
            if (t.startsWith('[') && t.endsWith(']')) {
                try {
                    const parsed = JSON.parse(t);
                    if (Array.isArray(parsed)) return parseScalarOrTupleBeat(parsed, round3);
                } catch (e) { }
                return null;
            }
        }
        const n = Number(item);
        return (Number.isFinite(n) && n >= 0) ? roundTime(n, round3) : null;
    }

    function getBeatStartTime(item) {
        if (typeof item === 'string') {
            const members = parseForceStraightGroup(item, false);
            if (members && members.length > 0) {
                return getBeatStartTime(members[0]);
            }
            const n = Number(item);
            return Number.isFinite(n) ? n : 0;
        }
        return Array.isArray(item) ? (Number(item[0]) || 0) : (Number(item) || 0);
    }

    function getBeatEndTime(item) {
        if (typeof item === 'string') {
            const members = parseForceStraightGroup(item, false);
            if (members && members.length > 0) {
                return getBeatEndTime(members[members.length - 1]);
            }
            const n = Number(item);
            return Number.isFinite(n) ? n : 0;
        }
        return Array.isArray(item) ? (item.length >= 2 ? (Number(item[1]) || 0) : (Number(item[0]) || 0)) : (Number(item) || 0);
    }

    function parseForceStraightGroup(item, round3 = false) {
        if (typeof item !== 'string') return null;
        const trimmed = item.trim();
        if (!trimmed.startsWith('<') || !trimmed.endsWith('>')) return null;

        const inner = trimmed.slice(1, -1).trim();
        if (!inner) return null;

        const tokens = splitTopLevelCommas(inner);
        const members = [];
        for (let i = 0; i < tokens.length; i++) {
            const parsed = parseScalarOrTupleBeat(tokens[i], round3);
            if (parsed !== null) members.push(parsed);
        }
        if (members.length === 0) return null;

        members.sort((a, b) => getBeatStartTime(a) - getBeatStartTime(b));
        return members;
    }

    function isForceStraightGroup(item) {
        return parseForceStraightGroup(item, false) !== null;
    }

    function formatForceStraightGroup(members, round3 = false) {
        if (!Array.isArray(members) || members.length === 0) return null;
        const normalized = members
            .map(m => parseScalarOrTupleBeat(m, round3))
            .filter(m => m !== null)
            .sort((a, b) => getBeatStartTime(a) - getBeatStartTime(b));

        if (normalized.length === 0) return null;

        const tokens = normalized.map(m => {
            if (Array.isArray(m)) {
                return '[' + m.map(v => String(roundTime(Number(v), round3))).join(',') + ']';
            }
            return String(roundTime(Number(m), round3));
        });
        return '<' + tokens.join(',') + '>';
    }

    function normalizeBeatItem(item, round3 = false) {
        if (typeof item === 'string') {
            const members = parseForceStraightGroup(item, round3);
            if (members && members.length > 0) {
                return formatForceStraightGroup(members, round3);
            }
        }
        return parseScalarOrTupleBeat(item, round3);
    }

    function normalizeBeatsArray(beats, round3 = false) {
        if (!beats) return null;
        let arr = null;
        if (Array.isArray(beats)) {
            arr = beats;
        } else if (typeof beats === 'string') {
            const trimmed = beats.trim();
            if (!trimmed) return null;
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    arr = parseBeatmapJsonText(trimmed);
                } catch (e) { }
            }
            if (!arr) {
                arr = splitTopLevelCommas(trimmed);
            }
        }
        if (!Array.isArray(arr)) return null;

        return arr
            .map(item => normalizeBeatItem(item, round3))
            .filter(item => item !== null)
            .sort((a, b) => getBeatStartTime(a) - getBeatStartTime(b));
    }

    function expandBeatmapForRuntime(beats) {
        const expanded = [];
        const groupIds = [];
        if (!Array.isArray(beats) || beats.length === 0) {
            return { beats: expanded, groupIds };
        }

        let nextGroupId = 1;
        for (let i = 0; i < beats.length; i++) {
            const item = beats[i];
            const members = parseForceStraightGroup(item, false);
            if (members && members.length > 0) {
                const gid = nextGroupId++;
                for (let j = 0; j < members.length; j++) {
                    expanded.push(members[j]);
                    groupIds.push(gid);
                }
            } else {
                const scalarOrTuple = parseScalarOrTupleBeat(item, false);
                if (scalarOrTuple !== null) {
                    expanded.push(scalarOrTuple);
                    groupIds.push(0);
                }
            }
        }

        return { beats: expanded, groupIds };
    }

    function shiftScalarOrTupleBeat(item, deltaSeconds, maxDuration, round3 = true) {
        const dur = (typeof maxDuration === 'number' && maxDuration > 0) ? maxDuration : 9999;
        if (Array.isArray(item)) {
            if (item.length >= 2) {
                const span = item[1] - item[0];
                const newS = Math.max(0, Math.min(dur - span, roundTime(item[0] + deltaSeconds, round3)));
                const newE = roundTime(newS + span, round3);
                return [newS, newE];
            }
            if (item.length === 1) {
                const newT = Math.max(0, Math.min(dur, roundTime(item[0] + deltaSeconds, round3)));
                return [newT];
            }
        }
        return Math.max(0, Math.min(dur, roundTime(Number(item) + deltaSeconds, round3)));
    }

    function shiftBeatItem(item, deltaSeconds, maxDuration, round3 = true) {
        const members = parseForceStraightGroup(item, false);
        if (members && members.length > 0) {
            const shifted = members.map(m => shiftScalarOrTupleBeat(m, deltaSeconds, maxDuration, round3));
            return formatForceStraightGroup(shifted, round3);
        }
        return shiftScalarOrTupleBeat(item, deltaSeconds, maxDuration, round3);
    }

    function offsetBeatItemFromBase(item, baseTime) {
        const members = parseForceStraightGroup(item, false);
        if (members && members.length > 0) {
            return {
                __forceStraightOffsets: members.map(m => offsetScalarOrTupleFromBase(m, baseTime))
            };
        }
        return offsetScalarOrTupleFromBase(item, baseTime);
    }

    function offsetScalarOrTupleFromBase(item, baseTime) {
        if (Array.isArray(item)) {
            if (item.length >= 2) {
                return [roundTime(item[0] - baseTime, true), roundTime(item[1] - baseTime, true)];
            }
            if (item.length === 1) {
                return [roundTime(item[0] - baseTime, true)];
            }
        }
        return roundTime(Number(item) - baseTime, true);
    }

    function applyBaseOffsetToBeatItem(offsetItem, targetTime, maxDuration) {
        const dur = (typeof maxDuration === 'number' && maxDuration > 0) ? maxDuration : 9999;
        if (offsetItem && Array.isArray(offsetItem.__forceStraightOffsets)) {
            const shifted = [];
            for (let i = 0; i < offsetItem.__forceStraightOffsets.length; i++) {
                const applied = applyScalarOrTupleOffset(offsetItem.__forceStraightOffsets[i], targetTime, dur);
                if (applied !== null) shifted.push(applied);
            }
            return shifted.length > 0 ? formatForceStraightGroup(shifted, true) : null;
        }
        return applyScalarOrTupleOffset(offsetItem, targetTime, dur);
    }

    function applyScalarOrTupleOffset(offsetItem, targetTime, dur) {
        if (Array.isArray(offsetItem)) {
            if (offsetItem.length >= 2) {
                const s = roundTime(targetTime + offsetItem[0], true);
                const e = roundTime(targetTime + offsetItem[1], true);
                return (s >= 0 && e <= dur && e > s) ? [s, e] : null;
            }
            if (offsetItem.length === 1) {
                const t = roundTime(targetTime + offsetItem[0], true);
                return (t >= 0 && t <= dur) ? [t] : null;
            }
        }
        const t = roundTime(targetTime + Number(offsetItem), true);
        return (Number.isFinite(t) && t >= 0 && t <= dur) ? t : null;
    }

    const BeatmapFormat = {
        preprocessBeatmapJsonText,
        parseBeatmapJsonText,
        parseScalarOrTupleBeat,
        parseForceStraightGroup,
        isForceStraightGroup,
        formatForceStraightGroup,
        normalizeBeatItem,
        normalizeBeatsArray,
        expandBeatmapForRuntime,
        getBeatStartTime,
        getBeatEndTime,
        shiftBeatItem,
        offsetBeatItemFromBase,
        applyBaseOffsetToBeatItem
    };

    if (typeof window !== 'undefined') {
        window.BeatmapFormat = BeatmapFormat;
    }
    if (typeof globalThis !== 'undefined') {
        globalThis.BeatmapFormat = BeatmapFormat;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BeatmapFormat;
    }
})(typeof window !== 'undefined' ? window : globalThis);
