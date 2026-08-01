// ============================================================
// copyright_check.js — Xử lý logic kiểm tra bản quyền bài hát
// ============================================================

function setupCopyrightCheck(songName, songArtist, copyrightStatus) {
    const copyrightBtn = document.getElementById('copyright-check-btn');
    
    if (copyrightBtn) {
        const stopProp = (e) => e.stopPropagation();
        copyrightBtn.addEventListener('click', (e) => {
            stopProp(e);
            
            let extraMsg = '';
            const statusLower = copyrightStatus ? copyrightStatus.toLowerCase() : '';
            if (statusLower.includes('copyright') || statusLower.includes('credit need')) {
                extraMsg = typeof t === 'function' ? t('credit_suggest') : '* Khuyên bạn nên Ghi nguồn (Credit) bài hát trước khi đăng video lên MXH.';
            }
            
            const titleText = typeof t === 'function' ? t('copyright_title') : "BẢN QUYỀN";
            const songLbl = typeof t === 'function' ? t('lbl_song') : "Bài hát";
            const artistLbl = typeof t === 'function' ? t('lbl_artist') : "Nghệ sĩ";
            const statusLbl = typeof t === 'function' ? t('lbl_copyright_status') : "Trạng thái bản quyền";
            
            if (typeof showCyberModal === 'function') {
                let statusColorClass = 'text-yellow-400';
                if (copyrightStatus) {
                    if (statusLower.includes('no copyright') || statusLower.includes('free') || statusLower.includes('safe') || statusLower.includes('non-copyright')) {
                        statusColorClass = 'text-green-400';
                    } else if (statusLower.includes('copyright') || statusLower.includes('credit need')) {
                        statusColorClass = 'text-red-400';
                    }
                }
                
                const extraHtml = extraMsg ? `<div class="mt-4 text-[11px] text-gray-400 border-t border-cyan-500/20 pt-3 leading-relaxed text-left font-sans">${extraMsg}</div>` : '';

                const messageHtml = `
                    <div class="text-left font-orbitron space-y-2.5">
                        <div class="flex border-b border-cyan-500/10 pb-2">
                            <span class="text-cyan-400 font-bold w-20 shrink-0">${songLbl}:</span>
                            <span class="text-white font-semibold min-w-0 break-words">${songName}</span>
                        </div>
                        <div class="flex border-b border-cyan-500/10 pb-2">
                            <span class="text-cyan-400 font-bold w-20 shrink-0">${artistLbl}:</span>
                            <span class="text-white font-semibold min-w-0 break-words">${songArtist}</span>
                        </div>
                        <div class="flex flex-col gap-1 pt-1">
                            <span class="text-cyan-400 font-bold">${statusLbl}:</span>
                            <span class="${statusColorClass} font-bold uppercase tracking-wider text-xs">${copyrightStatus || ''}</span>
                        </div>
                        ${extraHtml}
                    </div>
                `;
                
                showCyberModal({
                    title: titleText,
                    message: messageHtml,
                    type: 'alert'
                });
            } else {
                const alertMsg = extraMsg ? `\n\n${extraMsg}` : '';
                alert(`${titleText}\n\n${songLbl}: ${songName}\n${artistLbl}: ${songArtist}\n\n${statusLbl}: ${copyrightStatus || ''}${alertMsg}`);
            }
        });
        ['mousedown', 'touchstart', 'dblclick'].forEach(evt => copyrightBtn.addEventListener(evt, stopProp));
    }
}