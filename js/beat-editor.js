const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const audio = document.getElementById("audio");

const playBtn = document.getElementById("playBtn");
const recordBtn = document.getElementById("recordBtn");
const addCurrentBtn = document.getElementById("addCurrentBtn");
const exportBtn = document.getElementById("exportBtn");
const undoBtn = document.getElementById("undoBtn");
const resetBtn = document.getElementById("resetBtn");
const autoGenerateBtn = document.getElementById("autoGenerateBtn");

const output = document.getElementById("output");
const beatCount = document.getElementById("beatCount");
const status = document.getElementById("status");
const timeLabel = document.getElementById("time");
const songName = document.getElementById("songName");
const flashOverlay = document.getElementById("flashOverlay");

const formatOneLineBtn = document.getElementById("formatOneLine");
const formatBeautifyBtn = document.getElementById("formatBeautify");
const importBtn = document.getElementById("importBtn");
let exportMode = "oneline";

const timelinePanel = document.getElementById("timelinePanel");
const timelineViewport = document.getElementById("timelineViewport");
const timelineContainer = document.getElementById("timelineContainer");
const timelinePlayhead = document.getElementById("timelinePlayhead");
const timelineBeats = document.getElementById("timelineBeats");
const durationInfo = document.getElementById("durationInfo");
const timelineRuler = document.getElementById("timelineRuler");

const zoomSlider = document.getElementById("zoomSlider");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomLabel = document.getElementById("zoomLabel");

const speedSlider = document.getElementById("speedSlider");
const speedOutBtn = document.getElementById("speedOutBtn");
const speedInBtn = document.getElementById("speedInBtn");
const speedLabel = document.getElementById("speedLabel");
const pitchToggleBtn = document.getElementById("pitchToggleBtn");
let playbackRate = 1.0;
let preservedPitch = true; // Mặc định bật (giữ nguyên cao độ)

const countdownOverlay = document.getElementById("countdownOverlay");
const countdownNumber = document.getElementById("countdownNumber");

const confirmModal = document.getElementById("confirmModal");
const confirmResetBtn = document.getElementById("confirmReset");
const cancelResetBtn = document.getElementById("cancelReset");

const alertModal = document.getElementById("alertModal");
const alertMessage = document.getElementById("alertMessage");
const alertTitle = document.getElementById("alertTitle");
const closeAlertBtn = document.getElementById("closeAlert");

const groupActionModal = document.getElementById("groupActionModal");
const groupActionSummary = document.getElementById("groupActionSummary");
const subdividePartsInput = document.getElementById("subdivideParts");
const shiftOffsetInput = document.getElementById("shiftOffset");
const btnGroupAlign = document.getElementById("btnGroupAlign");
const btnGroupShift = document.getElementById("btnGroupShift");
const closeGroupModal = document.getElementById("closeGroupModal");

const selectionIndicator = document.getElementById("selectionIndicator");
const selectionLabel = document.getElementById("selectionLabel");

const customContextMenu = document.getElementById("customContextMenu");
const ctxCopy = document.getElementById("ctxCopy");
const ctxPaste = document.getElementById("ctxPaste");
const ctxDelete = document.getElementById("ctxDelete");
const ctxGroupAlign = document.getElementById("ctxGroupAlign");
const ctxGroupShift = document.getElementById("ctxGroupShift");
const ctxSelectAll = document.getElementById("ctxSelectAll");
const ctxClearSelection = document.getElementById("ctxClearSelection");
const ctxAddBeatHere = document.getElementById("ctxAddBeatHere");

// Giao diện chuyển đổi Mode AI và BPM
const autoModelSelect = document.getElementById("autoModelSelect");
const aiParamsGroup = document.getElementById("aiParamsGroup");
const bpmParamsGroup = document.getElementById("bpmParamsGroup");

autoModelSelect.addEventListener("change", (e) => {
    if (e.target.value === "model_v5") {
        aiParamsGroup.style.display = "none";
        bpmParamsGroup.style.display = "grid";
    } else {
        aiParamsGroup.style.display = "grid";
        bpmParamsGroup.style.display = "none";
    }
});

let beats = [];
let recording = false;
let isCountingDown = false;
let currentFile = null;
let currentArrayBuffer = null;
let zoomLevel = 1;

let selectedBeatsIndices = new Set();
let clipboardBeats = [];
let lastTargetTimeForContext = 0;

let draggedMarker = null;
let isDragging = false;
let dragStartClientX = 0;
let dragInitialBeatsTime = [];

const dragSelectBox = document.getElementById("dragSelectBox");
let isDragSelecting = false;
let dragSelectStart = { x: 0, y: 0 };

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTickSound(frequency = 800, duration = 0.05) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function showNotification(msg, title = "Thông báo", isError = false) {
    alertTitle.textContent = title;
    alertTitle.style.color = isError ? "var(--danger)" : "var(--warning)";
    alertMessage.textContent = msg;
    alertModal.classList.add("active");
}

closeAlertBtn.onclick = () => alertModal.classList.remove("active");

function formatMinutesSeconds(t) {
    if (isNaN(t)) return "00:00";
    const min = Math.floor(t / 60);
    const sec = Math.floor(t % 60);
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function togglePlayPause() {
    if (!audio.src) return;
    if (audio.paused) {
        audio.play();
        playBtn.textContent = "⏸ Tạm dừng";
    } else {
        audio.pause();
        playBtn.textContent = "▶ Phát";
    }
}

function playFromStart() {
    if (!audio.src) return;
    audio.currentTime = 0;
    if (audio.paused) {
        audio.play();
        playBtn.textContent = "⏸ Tạm dừng";
    }
}

function updateTime() {
    if (!isCountingDown) {
        const t = audio.currentTime;
        const min = Math.floor(t / 60);
        const sec = Math.floor(t % 60);
        const ms = Math.floor((t % 1) * 1000);

        if (!isDragging) {
            timeLabel.textContent =
                `${String(min).padStart(2, "0")}:` +
                `${String(sec).padStart(2, "0")}.` +
                `${String(ms).padStart(3, "0")}`;
        }

        const duration = audio.duration || 1;
        const percent = (t / duration) * 100;
        timelinePlayhead.style.left = `${Math.min(100, Math.max(0, percent))}%`;

        if (!audio.paused && !isDragging && !isDragSelecting) {
            const viewWidth = timelineViewport.clientWidth;
            const scrollLeft = timelineViewport.scrollLeft;
            const playheadPos = (percent / 100) * timelineContainer.clientWidth;

            if (playheadPos > scrollLeft + viewWidth - 80 || playheadPos < scrollLeft + 20) {
                timelineViewport.scrollLeft = playheadPos - 50;
            }
        }

        durationInfo.textContent = `${formatMinutesSeconds(t)} / ${formatMinutesSeconds(audio.duration)}`;
        checkAndHighlightBeats(t);
    }
    requestAnimationFrame(updateTime);
}

requestAnimationFrame(updateTime);

function checkAndHighlightBeats(currentTime) {
    const tolerance = 0.12;
    const markers = timelineBeats.querySelectorAll(".timeline-beat-marker");
    let hasBeatActive = false;

    markers.forEach(marker => {
        const beatTime = parseFloat(marker.dataset.time);
        if (currentTime >= beatTime && currentTime <= beatTime + tolerance) {
            if (!marker.classList.contains("active-beat")) {
                marker.classList.add("active-beat");
                hasBeatActive = true;
            }
        } else {
            marker.classList.remove("active-beat");
        }
    });

    if (hasBeatActive && !recording && !audio.paused) {
        triggerVisualFlash();
    }
}

function loadFile(file) {
    currentFile = file;
    const url = URL.createObjectURL(file);
    audio.src = url;
    songName.innerHTML = `🎵 <strong>${file.name}</strong>`;

    playBtn.disabled = false;
    recordBtn.disabled = false;
    addCurrentBtn.disabled = false;
    exportBtn.disabled = false;
    resetBtn.disabled = false;
    autoGenerateBtn.disabled = false;

    status.textContent = "Sẵn sàng";
    status.className = "";

    const reader = new FileReader();
    reader.onload = function (e) {
        currentArrayBuffer = e.target.result;
    };
    reader.readAsArrayBuffer(file);

    audio.addEventListener("loadedmetadata", () => {
        durationInfo.textContent = `00:00 / ${formatMinutesSeconds(audio.duration)}`;
        applyZoom();
        applyPlaybackRate();
    });
}

dropZone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", e => {
    if (e.target.files[0]) loadFile(e.target.files[0]);
});

dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("drag"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag"));
dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("drag");
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
});

playBtn.onclick = () => togglePlayPause();

speedSlider.addEventListener("input", (e) => { playbackRate = parseFloat(e.target.value); applyPlaybackRate(); });
speedOutBtn.onclick = () => { if (playbackRate > 0.25) { playbackRate = Math.max(0.25, parseFloat((playbackRate - 0.05).toFixed(2))); speedSlider.value = playbackRate; applyPlaybackRate(); } };
speedInBtn.onclick = () => { if (playbackRate < 2.0) { playbackRate = Math.min(2.0, parseFloat((playbackRate + 0.05).toFixed(2))); speedSlider.value = playbackRate; applyPlaybackRate(); } };

pitchToggleBtn.onclick = () => {
    preservedPitch = !preservedPitch;
    pitchToggleBtn.classList.toggle("active", preservedPitch);
    pitchToggleBtn.title = preservedPitch
        ? "Bật/tắt giữ nguyên cao độ giọng (Preserved Pitch). Khi BẬT: tốc độ thay đổi nhưng giọng không bị biến dạng."
        : "Bật/tắt giữ nguyên cao độ giọng (Preserved Pitch). Khi TẮT: cao độ giọng sẽ thay đổi theo tốc độ (hiệu ứng giọng chipmunk/robot).";
    applyPlaybackRate();
};

function applyPlaybackRate() {
    speedLabel.textContent = `Tốc độ: ${playbackRate.toFixed(2)}x`;
    audio.playbackRate = playbackRate;
    // preservesPitch được hỗ trợ bởi hầu hết trình duyệt hiện đại (Chrome, Firefox, Safari)
    if (typeof audio.preservesPitch !== "undefined") {
        audio.preservesPitch = preservedPitch;
    } else if (typeof audio.mozPreservesPitch !== "undefined") {
        audio.mozPreservesPitch = preservedPitch; // Firefox cũ
    }
}

zoomSlider.addEventListener("input", (e) => { zoomLevel = parseFloat(e.target.value); applyZoom(); });
zoomOutBtn.onclick = () => { if (zoomLevel > 1) { zoomLevel = Math.max(1, zoomLevel - 1); zoomSlider.value = zoomLevel; applyZoom(); } };
zoomInBtn.onclick = () => { if (zoomLevel < 30) { zoomLevel = Math.min(30, zoomLevel + 1); zoomSlider.value = zoomLevel; applyZoom(); } };

timelineViewport.addEventListener("wheel", (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
        const zoomStep = 0.5;
        let newZoom = zoomLevel;
        if (e.deltaY < 0) newZoom = Math.min(30, zoomLevel + zoomStep);
        else newZoom = Math.max(1, zoomLevel - zoomStep);

        if (newZoom !== zoomLevel) {
            const rect = timelineContainer.getBoundingClientRect();
            const mouseXRel = e.clientX - rect.left;
            const percentX = mouseXRel / rect.width;
            zoomLevel = newZoom;
            zoomSlider.value = zoomLevel;
            applyZoom();
            const newRect = timelineContainer.getBoundingClientRect();
            const newMouseXRel = percentX * newRect.width;
            timelineViewport.scrollLeft = newMouseXRel - (e.clientX - timelineViewport.getBoundingClientRect().left);
        }
    }
}, { passive: false });

function applyZoom() {
    zoomLabel.textContent = `Zoom: ${zoomLevel}x`;
    timelineContainer.style.width = `${zoomLevel * 100}%`;
    renderRuler();
    renderTimelineMarkers();
}

function renderRuler() {
    timelineRuler.innerHTML = "";
    const duration = audio.duration;
    if (!duration || isNaN(duration)) return;

    let step = 5;
    if (zoomLevel > 3) step = 2;
    if (zoomLevel > 7) step = 1;
    if (zoomLevel > 11) step = 0.5;
    if (zoomLevel > 18) step = 0.25;
    if (zoomLevel > 24) step = 0.1;

    for (let t = 0; t < duration; t += step) {
        const percent = (t / duration) * 100;
        const mark = document.createElement("div");
        mark.className = "ruler-mark";
        mark.style.left = `${percent}%`;
        mark.textContent = step < 1 ? `${t.toFixed(2)}s` : `${Math.floor(t)}s`;
        timelineRuler.appendChild(mark);
    }
}

function clearSelection() {
    selectedBeatsIndices.clear();
    updateSelectionIndicator();
}

function updateSelectionIndicator() {
    if (selectedBeatsIndices.size > 0) {
        selectionIndicator.style.display = "flex";
        selectionLabel.textContent = `Đã chọn: ${selectedBeatsIndices.size}`;
    } else {
        selectionIndicator.style.display = "none";
    }

    const markers = timelineBeats.querySelectorAll(".timeline-beat-marker");
    markers.forEach((marker) => {
        const index = parseInt(marker.dataset.index);
        if (selectedBeatsIndices.has(index)) marker.classList.add("selected-beat");
        else marker.classList.remove("selected-beat");
    });
}

timelineContainer.addEventListener("mousedown", (e) => {
    if (!audio.src) return;
    if (e.button === 0) hideContextMenu();

    if (e.target === timelineContainer || e.target === timelineRuler) {
        if (!e.shiftKey && !e.ctrlKey) clearSelection();
        isDragSelecting = true;
        const rect = timelineContainer.getBoundingClientRect();
        dragSelectStart.x = e.clientX - rect.left;
        dragSelectStart.y = e.clientY - rect.top;

        dragSelectBox.style.left = `${dragSelectStart.x}px`;
        dragSelectBox.style.top = `${dragSelectStart.y}px`;
        dragSelectBox.style.width = `0px`;
        dragSelectBox.style.height = `0px`;
        dragSelectBox.style.display = "block";
    }
});

document.addEventListener("mousemove", (e) => {
    if (isDragSelecting) {
        const rect = timelineContainer.getBoundingClientRect();
        let currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        let currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

        const x = Math.min(dragSelectStart.x, currentX);
        const y = Math.min(dragSelectStart.y, currentY);
        const width = Math.abs(dragSelectStart.x - currentX);
        const height = Math.abs(dragSelectStart.y - currentY);

        dragSelectBox.style.left = `${x}px`;
        dragSelectBox.style.top = `${y}px`;
        dragSelectBox.style.width = `${width}px`;
        dragSelectBox.style.height = `${height}px`;

        const duration = audio.duration || 1;
        const markers = timelineBeats.querySelectorAll(".timeline-beat-marker");
        markers.forEach((marker) => {
            const index = parseInt(marker.dataset.index);
            const markerLeft = (parseFloat(marker.dataset.time) / duration) * rect.width;
            if (markerLeft >= x && markerLeft <= x + width) selectedBeatsIndices.add(index);
            else if (!e.shiftKey && !e.ctrlKey) selectedBeatsIndices.delete(index);
        });
        updateSelectionIndicator();
    }
});

document.addEventListener("mouseup", (e) => {
    if (isDragSelecting) {
        isDragSelecting = false;
        dragSelectBox.style.display = "none";
        const rect = timelineContainer.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const width = Math.abs(dragSelectStart.x - currentX);

        if (width < 3 && (e.target === timelineContainer || e.target === timelineRuler)) {
            const clickX = dragSelectStart.x;
            const percent = clickX / rect.width;
            audio.currentTime = percent * audio.duration;

            if (audio.paused) {
                const t = audio.currentTime;
                const min = Math.floor(t / 60);
                const sec = Math.floor(t % 60);
                const ms = Math.floor((t % 1) * 1000);
                timeLabel.textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
                timelinePlayhead.style.left = `${percent * 100}%`;
            }
        }
    }
});

timelineContainer.addEventListener("dblclick", (e) => {
    if (!audio.src || (e.target !== timelineContainer && e.target !== timelineRuler)) return;
    const rect = timelineContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const t = Number((clickX / rect.width * audio.duration).toFixed(3));

    if (t >= 0 && t <= audio.duration) {
        beats.push(t);
        beats.sort((a, b) => a - b);
        clearSelection();
        updateBeatList();
        playTickSound(1000, 0.05);
    }
});

recordBtn.onclick = () => {
    if (isCountingDown) return;
    audio.pause(); audio.currentTime = 0; playBtn.textContent = "▶ Phát";
    isCountingDown = true;
    countdownOverlay.classList.add("active");

    let count = 3;
    showCountdownValue(count);
    const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) showCountdownValue(count);
        else if (count === 0) showCountdownValue("GHI!");
        else {
            clearInterval(countdownInterval);
            countdownOverlay.classList.remove("active");
            isCountingDown = false;
            startRecording();
        }
    }, 1000);
};

function showCountdownValue(val) {
    countdownNumber.classList.remove("show");
    void countdownNumber.offsetWidth;
    countdownNumber.textContent = val;
    countdownNumber.classList.add("show");
    if (val === "GHI!") playTickSound(1200, 0.15);
    else playTickSound(600, 0.08);
}

function startRecording() {
    beats = [0]; recording = true; clearSelection();
    status.textContent = "🔴 Đang ghi beat... (Nhấn phím F, J, Z hoặc X để thêm nhịp gốc)";
    status.className = "active";
    updateBeatList();
    undoBtn.disabled = false;
    audio.currentTime = 0; audio.play(); playBtn.textContent = "⏸ Tạm dừng";
}

addCurrentBtn.onclick = () => {
    if (!audio.src) return;
    const t = Number(audio.currentTime.toFixed(3));
    if (beats.length > 0 && Math.abs(t - beats[beats.length - 1]) < 0.03) return;
    beats.push(t); beats.sort((a, b) => a - b);
    updateBeatList(); playTickSound(800, 0.05); triggerVisualFlash();
};

function addBeat() {
    const t = Number(audio.currentTime.toFixed(3));
    if (beats.length > 0 && Math.abs(t - beats[beats.length - 1]) < 0.03) return;
    beats.push(t); beats.sort((a, b) => a - b);
    updateBeatList(); playTickSound(800, 0.05); triggerVisualFlash();
}

function triggerVisualFlash() {
    flashOverlay.classList.add("active"); timeLabel.classList.add("flash");
    setTimeout(() => { flashOverlay.classList.remove("active"); timeLabel.classList.remove("flash"); }, 65);
}

function undoLastBeat() {
    if (beats.length > 1) { beats.pop(); clearSelection(); updateBeatList(); }
}

function renderTimelineMarkers() {
    timelineBeats.innerHTML = "";
    const duration = audio.duration || 1;

    beats.forEach((beatTime, index) => {
        if (beatTime === 0 && index === 0) return;
        const percent = (beatTime / duration) * 100;
        if (percent > 100) return;

        const marker = document.createElement("div");
        marker.className = "timeline-beat-marker";
        if (selectedBeatsIndices.has(index)) marker.classList.add("selected-beat");

        marker.style.left = `${percent}%`;
        marker.dataset.time = beatTime;
        marker.dataset.index = index;

        const tooltip = document.createElement("div");
        tooltip.className = "marker-tooltip";
        tooltip.textContent = `${beatTime.toFixed(3)}s`;
        marker.appendChild(tooltip);

        marker.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            e.stopPropagation(); hideContextMenu();

            if (!e.shiftKey && !e.ctrlKey && !selectedBeatsIndices.has(index)) {
                clearSelection(); selectedBeatsIndices.add(index);
            } else if (e.shiftKey || e.ctrlKey) {
                if (selectedBeatsIndices.has(index)) selectedBeatsIndices.delete(index);
                else selectedBeatsIndices.add(index);
            } else selectedBeatsIndices.add(index);

            updateSelectionIndicator(); playTickSound(900, 0.03);
            isDragging = true; draggedMarker = marker;
            dragStartClientX = e.clientX; dragInitialBeatsTime = [...beats];
        });

        marker.addEventListener("contextmenu", (e) => {
            e.preventDefault(); e.stopPropagation();
            if (!selectedBeatsIndices.has(index)) {
                clearSelection(); selectedBeatsIndices.add(index); updateSelectionIndicator();
            }
            lastTargetTimeForContext = beatTime;
            showContextMenu(e.clientX, e.clientY, true);
        });

        timelineBeats.appendChild(marker);
    });
}

document.addEventListener("mousemove", (e) => {
    if (!isDragging || !draggedMarker) return;
    const duration = audio.duration || 1;
    const rect = timelineContainer.getBoundingClientRect();
    const deltaX = e.clientX - dragStartClientX;
    const deltaTime = (deltaX / rect.width) * duration;

    selectedBeatsIndices.forEach((index) => {
        const initialTime = dragInitialBeatsTime[index];
        if (initialTime === undefined) return;
        let newTime = Math.max(0, Math.min(duration, Number((initialTime + deltaTime).toFixed(3))));

        const marker = timelineBeats.querySelector(`.timeline-beat-marker[data-index="${index}"]`);
        if (marker) {
            marker.style.left = `${(newTime / duration) * 100}%`;
            const tooltip = marker.querySelector(".marker-tooltip");
            if (tooltip) tooltip.textContent = `${newTime.toFixed(3)}s`;
        }

        if (parseInt(draggedMarker.dataset.index) === index) {
            const min = Math.floor(newTime / 60); const sec = Math.floor(newTime % 60); const ms = Math.floor((newTime % 1) * 1000);
            timeLabel.textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
        }
    });
});

document.addEventListener("mouseup", (e) => {
    if (isDragging && draggedMarker) {
        const duration = audio.duration || 1;
        const rect = timelineContainer.getBoundingClientRect();
        const deltaX = e.clientX - dragStartClientX;
        const deltaTime = (deltaX / rect.width) * duration;

        const updatedIndicesValue = [];
        selectedBeatsIndices.forEach((index) => {
            const initialTime = dragInitialBeatsTime[index];
            if (initialTime !== undefined) {
                let newTime = Math.max(0, Math.min(duration, Number((initialTime + deltaTime).toFixed(3))));
                beats[index] = newTime; updatedIndicesValue.push(newTime);
            }
        });

        beats.sort((a, b) => a - b);
        selectedBeatsIndices.clear();
        updatedIndicesValue.forEach((val) => {
            const newIdx = beats.indexOf(val);
            if (newIdx !== -1) selectedBeatsIndices.add(newIdx);
        });

        isDragging = false; draggedMarker = null;
        updateBeatList(); playTickSound(700, 0.05);
    }
});

importBtn.onclick = () => {
    const rawData = output.value.trim();
    if (!rawData) { showNotification("Khung văn bản trống. Vui lòng nhập chuỗi JSON Beatmap vào!", "Lỗi nhập liệu", true); return; }
    try {
        const parsedData = JSON.parse(rawData);
        if (parsedData && Array.isArray(parsedData.beats)) {
            const newBeats = parsedData.beats.map(Number).filter(t => !isNaN(t) && t >= 0);
            if (audio.duration && newBeats.some(t => t > audio.duration)) showNotification("Cảnh báo: Có mốc beat vượt quá độ dài bài hát.", "Lưu ý");
            beats = newBeats.sort((a, b) => a - b);
            clearSelection(); updateBeatList(); playTickSound(1000, 0.08);
            status.textContent = "Đã cập nhật danh sách beat từ JSON thành công!"; status.className = "active";
            setTimeout(() => { if (!recording) { status.textContent = "Sẵn sàng"; status.className = ""; } }, 3000);
        } else showNotification("Cấu trúc JSON thiếu thuộc tính 'beats'. Ví dụ: {\"beats\": [1.2, 3.4]}", "Định dạng sai", true);
    } catch (err) { showNotification("Không thể phân tích cú pháp chuỗi JSON này.", "Lỗi cú pháp JSON", true); }
};

formatOneLineBtn.onclick = () => { exportMode = "oneline"; formatOneLineBtn.classList.add("active"); formatBeautifyBtn.classList.remove("active"); updateBeatList(); };
formatBeautifyBtn.onclick = () => { exportMode = "beautify"; formatBeautifyBtn.classList.add("active"); formatOneLineBtn.classList.remove("active"); updateBeatList(); };

function updateBeatList() {
    beatCount.textContent = `Beat: ${beats.length}`;
    const dataObj = { song: currentFile ? currentFile.name : "", beats: beats };
    output.value = exportMode === "oneline" ? JSON.stringify(dataObj) : JSON.stringify(dataObj, null, 2);
    renderTimelineMarkers(); updateSelectionIndicator();
}

// --- NHÓM HOẠT ĐỘNG (Ctrl + G) ---

/**
 * Quick Align: Căn đều ngay lập tức beat trong vùng chọn
 * Dùng số phần chia từ input subdivideParts (mặc định 4)
 * Không mở modal - áp dụng thẳng
 */
function quickGroupAlign() {
    if (selectedBeatsIndices.size < 2) {
        showNotification("Hãy chọn ít nhất 2 mốc beat để căn đều!", "Lưu ý chọn mốc");
        return;
    }
    const indices = Array.from(selectedBeatsIndices).sort((a, b) => a - b);
    const startTime = beats[indices[0]], endTime = beats[indices[indices.length - 1]], totalSpan = endTime - startTime;
    if (totalSpan <= 0) {
        showNotification("Độ dài khoảng thời gian phải > 0s!", "Lỗi căn đều", true);
        return;
    }

    // Thông minh: đếm số beat trong vùng chọn để tự tính số phần chia
    // Nếu chọn N beat → chia N-1 khoảng → vẫn ra đúng N beat phân đều
    // Fallback: nếu chỉ chọn đúng 2 beat (chỉ đầu/cuối) → dùng subdividePartsInput
    const autoCount = indices.length;
    const parts = autoCount > 2 ? autoCount - 1 : (parseInt(subdividePartsInput.value) || 4);

    const newSubbeats = [];
    for (let i = 0; i <= parts; i++) newSubbeats.push(Number((startTime + (totalSpan * (i / parts))).toFixed(3)));

    const leftPart = beats.slice(0, indices[0]), rightPart = beats.slice(indices[indices.length - 1] + 1);
    beats = [...leftPart, ...newSubbeats, ...rightPart].sort((a, b) => a - b);
    selectedBeatsIndices.clear();
    newSubbeats.forEach(val => { const idx = beats.indexOf(val); if (idx !== -1) selectedBeatsIndices.add(idx); });

    updateBeatList(); playTickSound(1000, 0.15);
    const modeLabel = autoCount > 2 ? `${autoCount} beat → ${parts} khoảng đều` : `${parts} khoảng chia`;
    status.textContent = `⚡ Căn đều: ${modeLabel} · ${startTime.toFixed(3)}s → ${endTime.toFixed(3)}s`;
    status.className = "active";
    setTimeout(() => { if (!recording) { status.textContent = "Sẵn sàng"; status.className = ""; } }, 3000);
}

function openGroupActions() {
    if (selectedBeatsIndices.size < 2) { showNotification("Hãy chọn ít nhất 2 mốc beat để thực hiện!", "Lưu ý chọn mốc"); return; }
    groupActionSummary.innerHTML = `Đang chọn: <strong>${selectedBeatsIndices.size} beat</strong>. Nhịp đầu: <strong>${beats[Math.min(...selectedBeatsIndices)].toFixed(3)}s</strong>, Nhịp cuối: <strong>${beats[Math.max(...selectedBeatsIndices)].toFixed(3)}s</strong>.`;
    groupActionModal.classList.add("active");
}
closeGroupModal.onclick = () => groupActionModal.classList.remove("active");

btnGroupAlign.onclick = () => {
    const parts = parseInt(subdividePartsInput.value);
    if (isNaN(parts) || parts < 1) { showNotification("Vui lòng nhập số lượng khoảng chia hợp lệ!", "Lỗi nhập", true); return; }
    const indices = Array.from(selectedBeatsIndices).sort((a, b) => a - b);
    const startTime = beats[indices[0]], endTime = beats[indices[indices.length - 1]], totalSpan = endTime - startTime;
    if (totalSpan <= 0) { showNotification("Độ dài khoảng thời gian phải > 0s!", "Lỗi căn đều", true); return; }

    const newSubbeats = [];
    for (let i = 0; i <= parts; i++) newSubbeats.push(Number((startTime + (totalSpan * (i / parts))).toFixed(3)));

    const leftPart = beats.slice(0, indices[0]), rightPart = beats.slice(indices[indices.length - 1] + 1);
    beats = [...leftPart, ...newSubbeats, ...rightPart].sort((a, b) => a - b);
    selectedBeatsIndices.clear();
    newSubbeats.forEach(val => { const idx = beats.indexOf(val); if (idx !== -1) selectedBeatsIndices.add(idx); });

    updateBeatList(); playTickSound(1000, 0.15); groupActionModal.classList.remove("active");
    showNotification(`Đã phân phối căn đều vùng chọn thành ${parts} khoảng chia nhịp.`, "Căn đều hoàn tất");
};

btnGroupShift.onclick = () => {
    const shiftMs = parseFloat(shiftOffsetInput.value);
    if (isNaN(shiftMs)) { showNotification("Vui lòng nhập số mili-giây hợp lệ!", "Lỗi nhập", true); return; }
    const shiftSeconds = shiftMs / 1000, duration = audio.duration || 9999;
    const updatedTimes = [];
    selectedBeatsIndices.forEach((index) => {
        let newTime = Math.max(0, Math.min(duration, Number((beats[index] + shiftSeconds).toFixed(3))));
        beats[index] = newTime; updatedTimes.push(newTime);
    });
    beats.sort((a, b) => a - b);
    selectedBeatsIndices.clear();
    updatedTimes.forEach((val) => { const newIdx = beats.indexOf(val); if (newIdx !== -1) selectedBeatsIndices.add(newIdx); });
    updateBeatList(); playTickSound(800, 0.1); groupActionModal.classList.remove("active");
};

function copySelectedBeats() {
    if (selectedBeatsIndices.size === 0) return;
    const selectedTimes = Array.from(selectedBeatsIndices).map(index => beats[index]).sort((a, b) => a - b);
    clipboardBeats = selectedTimes.map(t => Number((t - selectedTimes[0]).toFixed(3)));
    status.textContent = `📋 Đã sao chép ${selectedBeatsIndices.size} mốc beat!`; status.className = "active"; playTickSound(1100, 0.08);
    setTimeout(() => { if (!recording) { status.textContent = "Sẵn sàng"; status.className = ""; } }, 3000);
}

function pasteBeats(targetTime) {
    if (clipboardBeats.length === 0) { showNotification("Clipboard trống!", "Lưu ý"); return; }
    const duration = audio.duration || 9999, newPastedBeats = [];
    clipboardBeats.forEach(offset => {
        const t = Number((targetTime + offset).toFixed(3));
        if (t >= 0 && t <= duration) newPastedBeats.push(t);
    });
    if (newPastedBeats.length > 0) {
        beats = [...beats, ...newPastedBeats].sort((a, b) => a - b);
        selectedBeatsIndices.clear();
        newPastedBeats.forEach(val => { const idx = beats.indexOf(val); if (idx !== -1) selectedBeatsIndices.add(idx); });
        updateBeatList(); playTickSound(1000, 0.12);
        status.textContent = `📥 Đã dán ${newPastedBeats.length} mốc beat mới!`; status.className = "active";
        setTimeout(() => { if (!recording) { status.textContent = "Sẵn sàng"; status.className = ""; } }, 3000);
    }
}

// --- CÁC MÔ HÌNH PHÂN TÍCH NHỊP TỰ ĐỘNG (AI / FILTERS / BPM) ---

function detectPeaksFromEnergy(energyArray, frameSize, sampleRate, minDistanceSamples, thresholdMult) {
    const detectedBeats = [];
    const localWindowSize = 15;
    let lastBeatSample = -minDistanceSamples;

    for (let i = 0; i < energyArray.length; i++) {
        const startWin = Math.max(0, i - localWindowSize);
        const endWin = Math.min(energyArray.length - 1, i + localWindowSize);
        let sumLocal = 0;
        for (let w = startWin; w <= endWin; w++) sumLocal += energyArray[w];

        const localAverage = sumLocal / (endWin - startWin + 1);
        const currentEnergy = energyArray[i];
        const samplePos = i * frameSize;

        if (currentEnergy > localAverage * thresholdMult && currentEnergy > 0.003) {
            const prevEnergy = i > 0 ? energyArray[i - 1] : 0;
            const nextEnergy = i < energyArray.length - 1 ? energyArray[i + 1] : 0;

            if (currentEnergy >= prevEnergy && currentEnergy >= nextEnergy) {
                if (samplePos - lastBeatSample >= minDistanceSamples) {
                    detectedBeats.push(Number((samplePos / sampleRate).toFixed(3)));
                    lastBeatSample = samplePos;
                }
            }
        }
    }
    return detectedBeats;
}

autoGenerateBtn.onclick = async () => {
    if (!currentFile && !audio.src) {
        showNotification("Vui lòng tải nhạc lên trước!", "Thiếu dữ liệu", true);
        return;
    }

    const selectedModel = document.getElementById("autoModelSelect").value;

    // ---- XỬ LÝ MODEL V5: TẠO BEAT THEO BPM CỐ ĐỊNH (Không cần giải mã, chạy siêu tốc) ----
    if (selectedModel === "model_v5") {
        const bpm = parseFloat(document.getElementById("autoBpmVal").value);
        const offset = parseFloat(document.getElementById("autoBpmOffset").value) || 0;

        if (isNaN(bpm) || bpm <= 0) {
            showNotification("Vui lòng nhập số BPM hợp lệ lớn hơn 0!", "Lỗi thông số", true);
            return;
        }

        // Cần độ dài bài hát để biết rải tới đâu
        const duration = audio.duration || 0;
        if (duration === 0) {
            showNotification("Chưa nhận diện được độ dài bài hát. Xin hãy nhấn nút Phát bài hát một cái rồi thử lại.", "Lỗi tải âm thanh", true);
            return;
        }

        // Tính toán khoảng cách giữa các nhịp
        const interval = 60 / bpm;
        let detectedBeats = [];

        // Rải nhịp từ thời điểm offset cho tới hết bài
        for (let t = offset; t <= duration; t += interval) {
            detectedBeats.push(Number(t.toFixed(3)));
        }

        if (detectedBeats.length > 0) {
            beats = detectedBeats.sort((a, b) => a - b);
            clearSelection(); updateBeatList(); playTickSound(1000, 0.15);
            status.textContent = `⚡ Tạo thành công ${detectedBeats.length} mốc beat với tốc độ ${bpm} BPM.`;
            status.className = "active";
            showNotification(`Đã rải đều tắp ${detectedBeats.length} nhịp tính từ giây thứ ${offset}!`, "Hoàn tất BPM");
        }

        // Dừng hàm tại đây, không tiếp tục chạy phân tích bằng AI bên dưới
        return;
    }

    // ---- XỬ LÝ MODEL V1-V4: PHÂN TÍCH AI (Cần giải mã AudioBuffer) ----
    if (!currentArrayBuffer) {
        showNotification("Chưa đọc được dữ liệu gốc âm thanh, hãy tải file lên lại!", "Lỗi dữ liệu", true);
        return;
    }

    if (selectedModel === "model_v2" && typeof Meyda === "undefined") {
        showNotification("Thư viện Meyda.js từ CDN chưa được tải thành công. Hãy kiểm tra mạng hoặc chọn Model khác.", "Lỗi CDN", true);
        return;
    }

    status.textContent = "⚡ Đang xử lý âm thanh bằng mô hình phân tích AI...";
    status.className = "active";
    autoGenerateBtn.disabled = true;

    setTimeout(async () => {
        try {
            const decodeCtx = new (window.AudioContext || window.webkitAudioContext)();
            const bufferCopy = currentArrayBuffer.slice(0);
            const decodedBuffer = await decodeCtx.decodeAudioData(bufferCopy);

            const channelData = decodedBuffer.getChannelData(0);
            const sampleRate = decodedBuffer.sampleRate;

            const thresholdMultiplier = parseFloat(document.getElementById("autoThreshold").value) || 1.4;
            const minDistanceSec = parseFloat(document.getElementById("autoMinDist").value) || 0.25;
            const minDistanceSamples = minDistanceSec * sampleRate;

            let detectedBeats = [];

            if (selectedModel === "model_v1") {
                const frameSize = 1024;
                const energyValues = [];
                for (let i = 0; i < channelData.length; i += frameSize) {
                    let sum = 0;
                    const limit = Math.min(i + frameSize, channelData.length);
                    for (let j = i; j < limit; j++) sum += channelData[j] * channelData[j];
                    energyValues.push(sum / frameSize);
                }
                detectedBeats = detectPeaksFromEnergy(energyValues, frameSize, sampleRate, minDistanceSamples, thresholdMultiplier);

            } else if (selectedModel === "model_v2") {
                const frameSize = 1024;
                const customFeaturesArray = [];
                for (let i = 0; i < channelData.length - frameSize; i += frameSize) {
                    const frame = channelData.subarray(i, i + frameSize);
                    const features = Meyda.extract(['energy', 'zcr'], frame);
                    const compositeScore = (features.energy || 0) * (features.zcr || 0) * 10;
                    customFeaturesArray.push(compositeScore);
                }
                detectedBeats = detectPeaksFromEnergy(customFeaturesArray, frameSize, sampleRate, minDistanceSamples, thresholdMultiplier);

            } else if (selectedModel === "model_v3") {
                const offlineCtx = new OfflineAudioContext(1, decodedBuffer.length, decodedBuffer.sampleRate);
                const source = offlineCtx.createBufferSource();
                source.buffer = decodedBuffer;

                const filter = offlineCtx.createBiquadFilter();
                filter.type = "highpass";
                filter.frequency.value = 1500;

                source.connect(filter);
                filter.connect(offlineCtx.destination);
                source.start();

                const renderedBuffer = await offlineCtx.startRendering();
                const filteredData = renderedBuffer.getChannelData(0);

                const frameSize = 1024;
                const energyValues = [];
                for (let i = 0; i < filteredData.length; i += frameSize) {
                    let sum = 0;
                    const limit = Math.min(i + frameSize, filteredData.length);
                    for (let j = i; j < limit; j++) sum += filteredData[j] * filteredData[j];
                    energyValues.push(sum / frameSize);
                }
                detectedBeats = detectPeaksFromEnergy(energyValues, frameSize, sampleRate, minDistanceSamples, thresholdMultiplier);

            } else if (selectedModel === "model_v4") {
                const frameSize = 512;
                const energies = [];

                for (let i = 0; i < channelData.length - frameSize; i += frameSize) {
                    let sum = 0;
                    for (let j = 0; j < frameSize; j++) {
                        sum += channelData[i + j] * channelData[i + j];
                    }
                    energies.push(Math.sqrt(sum / frameSize));
                }

                const novelty = [0];
                for (let i = 1; i < energies.length; i++) {
                    const diff = Math.max(0, energies[i] - energies[i - 1]);
                    novelty.push(diff);
                }

                const localWindow = 20;
                let lastBeatSample = -minDistanceSamples;

                for (let i = 0; i < novelty.length; i++) {
                    let sumLocal = 0;
                    const startWin = Math.max(0, i - localWindow);
                    const endWin = Math.min(novelty.length - 1, i + localWindow);
                    for (let w = startWin; w <= endWin; w++) sumLocal += novelty[w];

                    const localAvg = sumLocal / (endWin - startWin + 1);
                    const currentVal = novelty[i];
                    const samplePos = i * frameSize;

                    if (currentVal > localAvg * thresholdMultiplier && currentVal > 0.001) {
                        const prevVal = i > 0 ? novelty[i - 1] : 0;
                        const nextVal = i < novelty.length - 1 ? novelty[i + 1] : 0;

                        if (currentVal >= prevVal && currentVal >= nextVal) {
                            if (samplePos - lastBeatSample >= minDistanceSamples) {
                                detectedBeats.push(Number((samplePos / sampleRate).toFixed(3)));
                                lastBeatSample = samplePos;
                            }
                        }
                    }
                }
            }

            // Cập nhật kết quả lên UI cho AI Model
            if (detectedBeats.length > 0) {
                beats = detectedBeats.sort((a, b) => a - b);
                clearSelection(); updateBeatList(); playTickSound(1000, 0.15);
                status.textContent = `⚡ Phân tích thành công! Tạo ${detectedBeats.length} mốc beat mới.`; status.className = "active";
                showNotification(`AI đã phân tích và tìm thấy ${detectedBeats.length} điểm rơi nhịp beat nhạc!`, "Phân tích thành công");
            } else {
                showNotification("Không tìm thấy nhịp beat nào. Hãy thử tăng/giảm 'Độ nhạy phân tích' hoặc thử Mô hình khác.", "Kết quả trống");
                status.textContent = "Sẵn sàng"; status.className = "";
            }
        } catch (err) {
            console.error(err);
            showNotification("Quá trình xử lý âm thanh thất bại.", "Lỗi phân tích", true);
            status.textContent = "Lỗi hệ thống phân tích"; status.className = "";
        } finally {
            autoGenerateBtn.disabled = false;
        }
    }, 100);
};

// --- CHUỘT PHẢI ---
timelineContainer.addEventListener("contextmenu", (e) => {
    if (!audio.src) return; e.preventDefault();
    const rect = timelineContainer.getBoundingClientRect();
    lastTargetTimeForContext = Number(((e.clientX - rect.left) / rect.width * audio.duration).toFixed(3));
    showContextMenu(e.clientX, e.clientY, false);
});

function showContextMenu(clientX, clientY, isClickedOnMarker) {
    customContextMenu.style.display = "block";
    const menuW = customContextMenu.offsetWidth || 220, menuH = customContextMenu.offsetHeight || 210;
    let posX = clientX, posY = clientY;
    if (clientX + menuW > window.innerWidth) posX = window.innerWidth - menuW - 10;
    if (clientY + menuH > window.innerHeight) posY = window.innerHeight - menuH - 10;
    customContextMenu.style.left = `${posX + window.scrollX}px`; customContextMenu.style.top = `${posY + window.scrollY}px`;

    if (selectedBeatsIndices.size > 0) {
        ctxCopy.classList.remove("disabled"); ctxDelete.classList.remove("disabled");
        if (selectedBeatsIndices.size >= 2) { ctxGroupAlign.classList.remove("disabled"); ctxGroupShift.classList.remove("disabled"); }
        else { ctxGroupAlign.classList.add("disabled"); ctxGroupShift.classList.add("disabled"); }
    } else {
        ctxCopy.classList.add("disabled"); ctxDelete.classList.add("disabled"); ctxGroupAlign.classList.add("disabled"); ctxGroupShift.classList.add("disabled");
    }
    if (clipboardBeats.length > 0) ctxPaste.classList.remove("disabled"); else ctxPaste.classList.add("disabled");
    ctxAddBeatHere.style.display = isClickedOnMarker ? "none" : "flex";
}

function hideContextMenu() { customContextMenu.style.display = "none"; }
document.addEventListener("mousedown", (e) => { if (!customContextMenu.contains(e.target)) hideContextMenu(); });

ctxCopy.onclick = (e) => { e.stopPropagation(); copySelectedBeats(); hideContextMenu(); };
ctxPaste.onclick = (e) => { e.stopPropagation(); pasteBeats(lastTargetTimeForContext); hideContextMenu(); };
ctxDelete.onclick = (e) => { e.stopPropagation(); if (selectedBeatsIndices.size > 0) { Array.from(selectedBeatsIndices).sort((a, b) => b - a).forEach((index) => { beats.splice(index, 1); }); clearSelection(); updateBeatList(); playTickSound(400, 0.1); } hideContextMenu(); };
ctxGroupAlign.onclick = (e) => { e.stopPropagation(); quickGroupAlign(); hideContextMenu(); };
ctxGroupShift.onclick = (e) => { e.stopPropagation(); openGroupActions(); hideContextMenu(); };
ctxSelectAll.onclick = (e) => { e.stopPropagation(); if (beats.length > 0) { selectedBeatsIndices.clear(); beats.forEach((_, index) => { if (index > 0) selectedBeatsIndices.add(index); }); updateSelectionIndicator(); playTickSound(1000, 0.05); } hideContextMenu(); };
ctxClearSelection.onclick = (e) => { e.stopPropagation(); clearSelection(); hideContextMenu(); };
ctxAddBeatHere.onclick = (e) => { e.stopPropagation(); const t = lastTargetTimeForContext; if (t >= 0 && t <= audio.duration) { beats.push(t); beats.sort((a, b) => a - b); clearSelection(); updateBeatList(); playTickSound(1000, 0.05); } hideContextMenu(); };

document.addEventListener("keydown", e => {
    const active = document.activeElement.tagName;
    if (active === "TEXTAREA" || active === "INPUT") return;
    const key = e.key.toLowerCase();

    if (e.code === "Space") { e.preventDefault(); togglePlayPause(); return; }
    if (e.ctrlKey && key === "g") { e.preventDefault(); openGroupActions(); return; }
    if (!e.ctrlKey && key === "e") { e.preventDefault(); quickGroupAlign(); return; }
    if (e.ctrlKey && e.key === "ArrowLeft") { e.preventDefault(); playFromStart(); return; }
    if (e.ctrlKey && key === "c") { e.preventDefault(); copySelectedBeats(); return; }
    if (e.ctrlKey && key === "v") { e.preventDefault(); if (audio.src) pasteBeats(audio.currentTime); return; }
    if (e.ctrlKey && key === "a") { e.preventDefault(); if (beats.length > 0) { selectedBeatsIndices.clear(); beats.forEach((_, index) => { if (index > 0) selectedBeatsIndices.add(index); }); updateSelectionIndicator(); playTickSound(1000, 0.05); } return; }
    if (e.key === "Escape") { e.preventDefault(); clearSelection(); hideContextMenu(); return; }

    if ((e.key === "Delete" || e.key === "Backspace") && selectedBeatsIndices.size > 0) {
        e.preventDefault(); Array.from(selectedBeatsIndices).sort((a, b) => b - a).forEach((index) => { beats.splice(index, 1); }); clearSelection(); updateBeatList(); playTickSound(400, 0.1); return;
    }
    if ((e.ctrlKey && key === "z") || key === "u") { e.preventDefault(); undoLastBeat(); return; }
    if (!e.ctrlKey && (key === "f" || key === "j" || key === "z" || key === "x")) { e.preventDefault(); addBeat(); return; }
});

undoBtn.onclick = () => undoLastBeat();

exportBtn.onclick = () => {
    const data = { song: currentFile ? currentFile.name : "", beats: beats };
    const jsonText = exportMode === "oneline" ? JSON.stringify(data) : JSON.stringify(data, null, 2);
    const blob = new Blob([jsonText], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = currentFile ? `${currentFile.name.split('.').slice(0, -1).join('.')}_beatmap.json` : "beatmap.json";
    a.click();
};

resetBtn.onclick = () => confirmModal.classList.add("active");
cancelResetBtn.onclick = () => confirmModal.classList.remove("active");
confirmResetBtn.onclick = () => {
    audio.pause(); audio.currentTime = 0; beats = []; recording = false; isCountingDown = false; clearSelection();
    timeLabel.textContent = "00:00.000"; status.textContent = "Sẵn sàng (Đã đặt lại danh sách beat)"; status.className = ""; beatCount.textContent = "Beat: 0"; output.value = ""; timelineBeats.innerHTML = "";
    playBtn.textContent = "▶ Phát"; undoBtn.disabled = true; confirmModal.classList.remove("active");
};

confirmModal.addEventListener("click", e => { if (e.target === confirmModal) confirmModal.classList.remove("active"); });
alertModal.addEventListener("click", e => { if (e.target === alertModal) alertModal.classList.remove("active"); });
groupActionModal.addEventListener("click", e => { if (e.target === groupActionModal) groupActionModal.classList.remove("active"); });