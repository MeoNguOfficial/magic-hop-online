// ============================================================
//  ui-animations.js — Hệ thống điều phối UI Animation thống nhất
//  Tuân thủ 100% thiết lập uiAnimationsEnabled / body.disable-animations
// ============================================================

(function () {
    const _trackedElements = new Set();

    function trackTarget(el) {
        if (el && typeof el === 'object') {
            _trackedElements.add(el);
        }
    }

    function nextToken(el) {
        if (!el) return 0;
        const token = (el._uiAnimToken || 0) + 1;
        el._uiAnimToken = token;
        return token;
    }

    function readSavedSetting() {
        try {
            if (typeof window.uiAnimationsEnabled !== 'undefined') {
                return !!window.uiAnimationsEnabled;
            }
            if (typeof uiAnimationsEnabled !== 'undefined') {
                return !!uiAnimationsEnabled;
            }
            const raw = localStorage.getItem('uiAnimationsEnabled');
            if (raw === null) return true;
            return JSON.parse(raw) !== false;
        } catch (e) {
            return true;
        }
    }

    function isEnabled() {
        if (typeof document !== 'undefined' && document.body && document.body.classList.contains('disable-animations')) {
            return false;
        }
        return readSavedSetting();
    }

    function canAnime() {
        return isEnabled() && typeof anime !== 'undefined';
    }

    function clearInlineMotion(el) {
        if (!el || !el.style) return;
        if (typeof anime !== 'undefined' && typeof anime.remove === 'function') {
            anime.remove(el);
        }
        el.style.opacity = '';
        el.style.transform = '';
        el.style.pointerEvents = '';
    }

    function sync(enabledOverride) {
        const enabled = (typeof enabledOverride === 'boolean') ? enabledOverride : readSavedSetting();
        if (typeof window !== 'undefined') {
            window.uiAnimationsEnabled = enabled;
        }
        if (typeof document !== 'undefined') {
            if (document.body) {
                document.body.classList.toggle('disable-animations', !enabled);
            }
            if (document.documentElement) {
                document.documentElement.classList.toggle('disable-animations', !enabled);
            }
        }
        if (!enabled) {
            _trackedElements.forEach((el) => {
                if (el && el.isConnected) {
                    nextToken(el);
                    clearInlineMotion(el);
                } else {
                    _trackedElements.delete(el);
                }
            });
        }
        return enabled;
    }

    /**
     * Hiệu ứng mở Modal (Backdrop + Inner Card + Optional Staggered Items)
     */
    function showModal(backdropEl, cardEl, opts = {}) {
        if (!backdropEl) return;

        const targetCard = cardEl || backdropEl.firstElementChild;
        const displayMode = opts.display || 'flex';
        const isAlreadyVisible =
            !backdropEl.classList.contains('hidden') &&
            backdropEl.style.display === displayMode &&
            parseFloat(getComputedStyle(backdropEl).opacity || '1') > 0.5;

        const token = nextToken(backdropEl);
        if (targetCard) nextToken(targetCard);

        trackTarget(backdropEl);
        if (targetCard) trackTarget(targetCard);

        clearInlineMotion(backdropEl);
        if (targetCard) clearInlineMotion(targetCard);

        backdropEl.classList.remove('hidden', 'modal-closing', 'modal-opening');
        backdropEl.style.display = displayMode;

        if (!isAlreadyVisible && canAnime()) {
            backdropEl.style.opacity = '0';
            anime({
                targets: backdropEl,
                opacity: [0, 1],
                duration: opts.backdropDuration || 260,
                easing: 'easeOutCubic',
                complete: () => {
                    if (backdropEl._uiAnimToken === token) {
                        backdropEl.style.opacity = '';
                    }
                }
            });

            if (targetCard) {
                targetCard.style.opacity = '0';
                anime({
                    targets: targetCard,
                    opacity: [0, 1],
                    translateY: [opts.y ?? 16, 0],
                    scale: [opts.scaleFrom ?? 0.93, 1],
                    duration: opts.duration || 340,
                    easing: opts.easing || 'easeOutExpo',
                    complete: () => {
                        if (backdropEl._uiAnimToken === token) {
                            targetCard.style.opacity = '';
                            targetCard.style.transform = '';
                        }
                    }
                });

                if (opts.staggerSelector) {
                    staggerChildren(targetCard, opts.staggerSelector, {
                        startDelay: opts.staggerStart ?? 90,
                        step: opts.staggerStep ?? 30,
                        y: 8,
                        duration: 240,
                        maxAnimated: opts.maxAnimated || 12
                    });
                }
            }
        } else {
            backdropEl.style.opacity = '1';
            if (targetCard) {
                targetCard.style.opacity = '';
                targetCard.style.transform = '';
            }
        }
    }

    /**
     * Hiệu ứng đóng Modal mượt mà + chống race condition khi mở lại nhanh
     */
    function hideModal(backdropEl, cardEl, opts = {}) {
        if (!backdropEl) {
            if (typeof opts.onComplete === 'function') opts.onComplete();
            return;
        }

        const targetCard = cardEl || backdropEl.firstElementChild;
        const useHiddenClass = opts.useHiddenClass !== false;
        const token = nextToken(backdropEl);
        if (targetCard) nextToken(targetCard);

        trackTarget(backdropEl);
        if (targetCard) trackTarget(targetCard);

        const isVisible =
            !backdropEl.classList.contains('hidden') &&
            backdropEl.style.display !== 'none';

        const finalize = () => {
            if (backdropEl._uiAnimToken !== token) return;
            clearInlineMotion(backdropEl);
            if (targetCard) clearInlineMotion(targetCard);
            if (useHiddenClass) backdropEl.classList.add('hidden');
            backdropEl.style.display = 'none';
            if (typeof opts.onComplete === 'function') opts.onComplete();
        };

        if (isVisible && canAnime()) {
            anime.remove([backdropEl, targetCard]);
            if (targetCard) {
                anime({
                    targets: targetCard,
                    opacity: 0,
                    translateY: opts.exitY ?? 10,
                    scale: opts.exitScale ?? 0.94,
                    duration: opts.exitDuration || 190,
                    easing: 'easeInQuad'
                });
            }
            anime({
                targets: backdropEl,
                opacity: 0,
                duration: opts.exitDuration || 210,
                easing: 'easeInQuad',
                complete: finalize
            });
        } else {
            finalize();
        }
    }

    /**
     * Hiệu ứng chuyển Panel / Sub-tab (Cross-slide có hướng + subtle scale + stagger đồng pha)
     */
    function switchPanel(panelEl, opts = {}) {
        if (!panelEl) return;

        const token = nextToken(panelEl);
        trackTarget(panelEl);
        clearInlineMotion(panelEl);
        panelEl.classList.remove('hidden');

        if (!canAnime()) {
            panelEl.style.opacity = '1';
            panelEl.style.transform = '';
            if (opts.staggerSelector) {
                staggerChildren(panelEl, opts.staggerSelector, { instant: true });
            }
            return;
        }

        const dir = typeof opts.direction === 'number' && opts.direction !== 0
            ? (opts.direction > 0 ? 1 : -1)
            : 0;
        const axis = (dir !== 0 || opts.axis === 'x') ? 'translateX' : 'translateY';
        const offset = typeof opts.offset === 'number'
            ? opts.offset
            : (dir !== 0 ? 24 * dir : (axis === 'translateX' ? -14 : 12));

        const animProps = {
            targets: panelEl,
            opacity: [0, 1],
            scale: [opts.scaleFrom ?? 0.988, 1],
            duration: opts.duration || 280,
            easing: opts.easing || 'easeOutCubic',
            complete: () => {
                if (panelEl._uiAnimToken === token) {
                    panelEl.style.opacity = '';
                    panelEl.style.transform = '';
                }
            }
        };
        animProps[axis] = [offset, 0];
        if (dir !== 0 && typeof opts.yOffset === 'number' && opts.yOffset !== 0) {
            animProps.translateY = [opts.yOffset, 0];
        }

        panelEl.style.opacity = '0';
        anime(animProps);

        if (opts.staggerSelector) {
            staggerChildren(panelEl, opts.staggerSelector, {
                startDelay: opts.staggerStart ?? 30,
                step: opts.staggerStep ?? 22,
                x: opts.staggerX ?? (dir !== 0 ? 10 * dir : 0),
                y: opts.staggerY ?? 8,
                scaleFrom: opts.staggerScaleFrom ?? 0.975,
                duration: opts.staggerDuration || 250,
                maxAnimated: opts.maxAnimated || 16
            });
        }
    }

    /**
     * Stagger danh sách card/hàng (tự giới hạn maxAnimated để không gây giật lag)
     */
    function staggerChildren(containerEl, selector, opts = {}) {
        if (!containerEl) return;
        let nodes = [];
        try {
            nodes = selector ? Array.from(containerEl.querySelectorAll(selector)) : Array.from(containerEl.children);
        } catch (e) {
            nodes = Array.from(containerEl.children);
        }
        if (!nodes.length) return;

        const maxAnimated = opts.maxAnimated || 18;
        const animatedNodes = nodes.slice(0, maxAnimated);
        const instantNodes = nodes.slice(maxAnimated);

        instantNodes.forEach(clearInlineMotion);

        if (opts.instant || !canAnime()) {
            animatedNodes.forEach(clearInlineMotion);
            return;
        }

        animatedNodes.forEach((n) => {
            nextToken(n);
            trackTarget(n);
            clearInlineMotion(n);
            n.style.opacity = '0';
        });

        const tokenMap = animatedNodes.map((n) => n._uiAnimToken);
        const animConfig = {
            targets: animatedNodes,
            opacity: [0, 1],
            translateY: [opts.y ?? 10, 0],
            scale: [opts.scaleFrom ?? 0.975, 1],
            duration: opts.duration || 260,
            delay: anime.stagger(opts.step ?? 26, { start: opts.startDelay ?? 15 }),
            easing: opts.easing || 'easeOutCubic',
            complete: () => {
                animatedNodes.forEach((n, idx) => {
                    if (n._uiAnimToken === tokenMap[idx]) {
                        n.style.opacity = '';
                        n.style.transform = '';
                    }
                });
            }
        };
        if (typeof opts.x === 'number' && opts.x !== 0) {
            animConfig.translateX = [opts.x, 0];
        }

        anime(animConfig);
    }

    /**
     * Hiệu ứng mở Dropdown / Context Menu
     */
    function openDropdown(el, opts = {}) {
        if (!el) return;
        const token = nextToken(el);
        trackTarget(el);
        clearInlineMotion(el);
        el.classList.remove('hidden');
        if (opts.display) el.style.display = opts.display;

        if (!canAnime()) {
            el.style.opacity = '';
            el.style.transform = '';
            return;
        }

        el.style.opacity = '0';
        anime({
            targets: el,
            opacity: [0, 1],
            translateY: [opts.y ?? -8, 0],
            scale: [opts.scaleFrom ?? 0.96, 1],
            duration: opts.duration || 180,
            easing: 'easeOutCubic',
            complete: () => {
                if (el._uiAnimToken === token) {
                    el.style.opacity = '';
                    el.style.transform = '';
                }
            }
        });
    }

    /**
     * Hiệu ứng đóng Dropdown / Context Menu
     */
    function closeDropdown(el, opts = {}) {
        if (!el) return;
        if (el.classList.contains('hidden') && el.style.display === 'none') return;

        const token = nextToken(el);
        trackTarget(el);

        const finalize = () => {
            if (el._uiAnimToken !== token) return;
            clearInlineMotion(el);
            el.classList.add('hidden');
            if (opts.hideDisplay) el.style.display = 'none';
            if (typeof opts.onComplete === 'function') opts.onComplete();
        };

        if (!canAnime()) {
            finalize();
            return;
        }

        anime.remove(el);
        anime({
            targets: el,
            opacity: 0,
            translateY: opts.exitY ?? -6,
            scale: opts.exitScale ?? 0.96,
            duration: opts.exitDuration || 140,
            easing: 'easeInQuad',
            complete: finalize
        });
    }

    /**
     * Micro-interaction nẩy nhẹ khi chọn card / swatch / nút
     */
    function popElement(el, opts = {}) {
        if (!el || !canAnime()) return;
        const token = nextToken(el);
        trackTarget(el);
        anime.remove(el);
        anime({
            targets: el,
            scale: [0.95, opts.peakScale || 1.03, 1],
            duration: opts.duration || 260,
            easing: 'easeOutBack',
            complete: () => {
                if (el._uiAnimToken === token) {
                    el.style.transform = '';
                }
            }
        });
    }

    /**
     * Hiệu ứng vào / ra cho Toast thông báo nổi
     */
    function toastIn(el, opts = {}) {
        if (!el) return;
        const token = nextToken(el);
        trackTarget(el);
        clearInlineMotion(el);

        if (!canAnime()) {
            el.style.opacity = '1';
            return;
        }

        el.style.opacity = '0';
        anime({
            targets: el,
            opacity: [0, 1],
            translateY: [opts.y ?? 16, 0],
            scale: [0.94, 1],
            duration: opts.duration || 260,
            easing: 'easeOutCubic',
            complete: () => {
                if (el._uiAnimToken === token) {
                    el.style.transform = '';
                }
            }
        });
    }

    function toastOut(el, onComplete, opts = {}) {
        if (!el) {
            if (typeof onComplete === 'function') onComplete();
            return;
        }
        const token = nextToken(el);
        trackTarget(el);
        const finalize = () => {
            if (el._uiAnimToken !== token) return;
            if (typeof onComplete === 'function') onComplete();
        };
        if (!canAnime()) {
            el.style.opacity = '0';
            finalize();
            return;
        }
        anime.remove(el);
        anime({
            targets: el,
            opacity: 0,
            translateY: opts.exitY ?? 12,
            scale: 0.95,
            duration: opts.exitDuration || 220,
            easing: 'easeInQuad',
            complete: finalize
        });
    }

    /**
     * Thanh chỉ báo Neon trượt mượt dưới thanh Nav / Sub-tab đang active
     */
    function resolveEl(target) {
        if (!target) return null;
        if (typeof target === 'string' && typeof document !== 'undefined') {
            return document.querySelector(target);
        }
        return target;
    }

    function animateTabIndicator(containerOrSelector, activeBtn, opts = {}) {
        const containerEl = resolveEl(containerOrSelector);
        if (!containerEl || !activeBtn || typeof document === 'undefined') return;

        const variant = opts.variant || 'subtab';
        containerEl.classList.add('has-tab-indicator');

        let indicator = containerEl.querySelector(':scope > .ui-tab-indicator');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.className = `ui-tab-indicator ${variant === 'main' ? 'ui-tab-indicator--main' : 'ui-tab-indicator--sub'}`;
            indicator.setAttribute('aria-hidden', 'true');
            containerEl.appendChild(indicator);
        }

        const targetLeft = activeBtn.offsetLeft || 0;
        const targetWidth = activeBtn.offsetWidth || 0;
        if (targetWidth <= 0) return;

        if (opts.autoScroll !== false && containerEl.scrollWidth > containerEl.clientWidth) {
            const btnLeft = targetLeft;
            const btnRight = btnLeft + targetWidth;
            const viewLeft = containerEl.scrollLeft;
            const viewRight = viewLeft + containerEl.clientWidth;
            if (btnLeft < viewLeft + 10 || btnRight > viewRight - 10) {
                const targetScroll = Math.max(0, btnLeft - (containerEl.clientWidth - targetWidth) / 2);
                if (typeof containerEl.scrollTo === 'function') {
                    containerEl.scrollTo({
                        left: targetScroll,
                        behavior: (!opts.instant && canAnime()) ? 'smooth' : 'auto'
                    });
                } else {
                    containerEl.scrollLeft = targetScroll;
                }
            }
        }

        const token = nextToken(indicator);
        trackTarget(indicator);

        if (opts.instant || !indicator._initialized || !canAnime()) {
            if (typeof anime !== 'undefined' && typeof anime.remove === 'function') {
                anime.remove(indicator);
            }
            indicator.style.opacity = '1';
            indicator.style.width = `${targetWidth}px`;
            indicator.style.transform = `translateX(${targetLeft}px)`;
            indicator._initialized = true;
            return;
        }

        indicator._initialized = true;
        anime.remove(indicator);
        anime({
            targets: indicator,
            translateX: targetLeft,
            width: targetWidth,
            opacity: 1,
            duration: opts.duration || (variant === 'main' ? 320 : 280),
            easing: 'easeOutExpo',
            complete: () => {
                if (indicator._uiAnimToken === token) {
                    indicator.style.opacity = '1';
                }
            }
        });

        if (opts.popButton) {
            if (variant === 'main') {
                const svgEl = activeBtn.querySelector('svg');
                if (svgEl) {
                    const svgToken = nextToken(svgEl);
                    trackTarget(svgEl);
                    anime.remove(svgEl);
                    anime({
                        targets: svgEl,
                        translateY: [0, -3, 0],
                        scale: [0.85, 1.18, 1],
                        duration: 320,
                        easing: 'easeOutBack',
                        complete: () => {
                            if (svgEl._uiAnimToken === svgToken) {
                                svgEl.style.transform = '';
                            }
                        }
                    });
                }
            } else {
                popElement(activeBtn, { peakScale: 1.05, duration: 220 });
            }
        }
    }

    function syncAllTabIndicators(instant = true) {
        if (typeof document === 'undefined') return;
        const specs = [
            { container: '.main-nav-tabs-container', btnSelector: '.nav-btn.active', variant: 'main' },
            { container: '.personalize-tabs-container', btnSelector: '.tab-btn.active', variant: 'subtab' },
            { container: '.settings-tabs-container', btnSelector: '.tab-btn.active', variant: 'subtab' }
        ];
        specs.forEach((spec) => {
            const cEl = document.querySelector(spec.container);
            if (!cEl || cEl.offsetWidth <= 0) return;
            const activeBtn = cEl.querySelector(spec.btnSelector);
            if (activeBtn && activeBtn.offsetWidth > 0) {
                animateTabIndicator(cEl, activeBtn, { variant: spec.variant, instant, autoScroll: false, popButton: false });
            }
        });
    }

    /**
     * Điều phối chuyển Nav / Sub-tab thống nhất (chỉ báo trượt + fade/slide out nhanh + slide/stagger in theo hướng)
     */
    function switchDirectionalTab(config = {}) {
        const containerEl = resolveEl(config.tabsContainer);
        const buttons = Array.from(config.buttons || []).filter(Boolean);
        const targetBtn = config.targetBtn || null;
        const panes = Array.from(config.panes || []).filter(Boolean);
        const targetPane = config.targetPane || null;
        if (!targetPane) return { changed: false, direction: 0 };

        const variant = config.variant || 'subtab';
        const activeClasses = Array.isArray(config.activeClasses) ? config.activeClasses : ['active'];
        const inactiveClasses = Array.isArray(config.inactiveClasses) ? config.inactiveClasses : [];

        const isBtnActive = (b) => activeClasses.every(cls => b.classList.contains(cls));
        const prevBtn = config.prevBtn || buttons.find(isBtnActive) || null;
        const prevPane = panes.find(p => p !== targetPane && !p.classList.contains('hidden')) || null;

        let prevIdx = prevBtn ? buttons.indexOf(prevBtn) : -1;
        if (prevIdx < 0 && prevPane) prevIdx = panes.indexOf(prevPane);
        const nextIdx = targetBtn ? buttons.indexOf(targetBtn) : panes.indexOf(targetPane);

        const isAlreadyActive = prevBtn === targetBtn && !targetPane.classList.contains('hidden');
        const direction = (prevIdx >= 0 && nextIdx >= 0 && prevIdx !== nextIdx)
            ? (nextIdx > prevIdx ? 1 : -1)
            : 1;

        buttons.forEach((b) => {
            activeClasses.forEach(cls => b.classList.remove(cls));
            inactiveClasses.forEach(cls => b.classList.add(cls));
        });
        if (targetBtn) {
            inactiveClasses.forEach(cls => targetBtn.classList.remove(cls));
            activeClasses.forEach(cls => targetBtn.classList.add(cls));
        }

        if (isAlreadyActive) {
            if (containerEl && targetBtn) {
                animateTabIndicator(containerEl, targetBtn, { variant, popButton: true, instant: false });
            }
            return { changed: false, direction: 0 };
        }

        if (containerEl && targetBtn) {
            animateTabIndicator(containerEl, targetBtn, { variant, popButton: true, instant: false });
        }

        const groupHost = containerEl || targetPane.parentElement || targetPane;
        const switchToken = ((groupHost && groupHost._tabSwitchToken) || 0) + 1;
        if (groupHost) groupHost._tabSwitchToken = switchToken;

        const exitDuration = config.exitDuration ?? (variant === 'main' ? 95 : 85);
        const enterDuration = config.duration ?? (variant === 'main' ? 210 : 190);
        const exitOffset = config.exitOffset ?? (variant === 'main' ? 20 : 16);
        const enterOffset = config.slideOffset ?? (variant === 'main' ? 24 : 20);

        const commitEnter = () => {
            if (groupHost && groupHost._tabSwitchToken !== switchToken) return;

            if (typeof config.onBeforeShow === 'function') {
                config.onBeforeShow(targetPane, targetBtn);
            }

            panes.forEach((pane) => {
                if (!pane || pane === targetPane) return;
                clearInlineMotion(pane);
                pane.classList.add('hidden');
                pane.classList.remove('active');
            });

            if (config.scrollContainer) {
                const sc = resolveEl(config.scrollContainer);
                if (sc) sc.scrollTop = 0;
            }

            const staggerSel = typeof config.getStaggerSelector === 'function'
                ? config.getStaggerSelector(targetPane)
                : config.staggerSelector;

            targetPane.classList.add('active');
            switchPanel(targetPane, {
                axis: 'x',
                direction,
                offset: enterOffset * direction,
                yOffset: variant === 'main' ? 3 : 0,
                scaleFrom: variant === 'main' ? 0.986 : 0.99,
                duration: enterDuration,
                staggerSelector: staggerSel || null,
                staggerX: 8 * direction,
                staggerY: 5,
                staggerStart: 15,
                staggerStep: config.staggerStep ?? 18,
                staggerDuration: 200,
                maxAnimated: config.maxAnimated || 14
            });

            if (typeof config.onAfterShow === 'function') {
                config.onAfterShow(targetPane, targetBtn, direction);
            }
        };

        if (!prevPane || !canAnime()) {
            commitEnter();
            return { changed: true, direction };
        }

        // Ẩn ngay các pane thừa khác, chỉ giữ lại prevPane đang thoát để fade/slide out cực nhanh
        panes.forEach((pane) => {
            if (!pane || pane === prevPane || pane === targetPane) return;
            clearInlineMotion(pane);
            pane.classList.add('hidden');
            pane.classList.remove('active');
        });
        clearInlineMotion(targetPane);
        targetPane.classList.add('hidden');
        targetPane.classList.remove('active');

        const exitToken = nextToken(prevPane);
        trackTarget(prevPane);
        anime.remove(prevPane);
        prevPane.style.pointerEvents = 'none';

        anime({
            targets: prevPane,
            opacity: 0,
            translateX: -exitOffset * direction,
            scale: 0.99,
            duration: exitDuration,
            easing: 'easeInQuad',
            complete: () => {
                if (prevPane._uiAnimToken === exitToken) {
                    clearInlineMotion(prevPane);
                    prevPane.classList.add('hidden');
                    prevPane.classList.remove('active');
                }
                commitEnter();
            }
        });

        return { changed: true, direction };
    }

    /**
     * Khóa thanh tab con chỉ cuộn/kéo theo phương ngang (hỗ trợ cả touch mobile & mouse/wheel PC)
     */
    function bindHorizontalScrollOnly(target) {
        const el = resolveEl(target);
        if (!el || el._hScrollBound) return;
        el._hScrollBound = true;

        el.style.overflowX = 'auto';
        el.style.overflowY = 'hidden';
        el.style.touchAction = 'pan-x';

        el.addEventListener('scroll', () => {
            if (el.scrollTop !== 0) el.scrollTop = 0;
        }, { passive: true });

        el.addEventListener('wheel', (e) => {
            if (el.scrollWidth <= el.clientWidth) return;
            const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
            if (delta !== 0) {
                e.preventDefault();
                el.scrollLeft += delta;
            }
        }, { passive: false });

        let isDown = false;
        let startX = 0;
        let startScrollLeft = 0;
        let touchStartX = 0;

        el.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isDown = true;
            el._wasDragged = false;
            startX = e.pageX - el.offsetLeft;
            startScrollLeft = el.scrollLeft;
        });

        const endMouseDrag = () => {
            if (!isDown) return;
            isDown = false;
            setTimeout(() => { el._wasDragged = false; }, 30);
        };
        el.addEventListener('mouseleave', endMouseDrag);
        if (typeof window !== 'undefined') {
            window.addEventListener('mouseup', endMouseDrag);
            window.addEventListener('blur', endMouseDrag);
        }

        el.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            const x = e.pageX - el.offsetLeft;
            if (Math.abs(x - startX) > 4) {
                el._wasDragged = true;
            }
            el.scrollLeft = startScrollLeft - (x - startX) * 1.5;
        });

        el.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches.length > 0) {
                touchStartX = e.touches[0].clientX;
                el._wasDragged = false;
            }
        }, { passive: true });

        el.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length > 0) {
                if (Math.abs(e.touches[0].clientX - touchStartX) > 6) {
                    el._wasDragged = true;
                }
            }
        }, { passive: true });

        const clearTouchDrag = () => {
            setTimeout(() => { el._wasDragged = false; }, 40);
        };
        el.addEventListener('touchend', clearTouchDrag, { passive: true });
        el.addEventListener('touchcancel', clearTouchDrag, { passive: true });

        el.addEventListener('click', (e) => {
            if (el._wasDragged) {
                e.stopPropagation();
                e.preventDefault();
            }
        }, true);
    }

    window.UIAnimator = {
        isEnabled,
        canAnime,
        sync,
        clearInlineMotion,
        showModal,
        hideModal,
        switchPanel,
        staggerChildren,
        animateTabIndicator,
        syncAllTabIndicators,
        switchDirectionalTab,
        bindHorizontalScrollOnly,
        openDropdown,
        closeDropdown,
        popElement,
        toastIn,
        toastOut
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        let _resizeRaf = 0;
        window.addEventListener('resize', () => {
            if (_resizeRaf) return;
            const raf = window.requestAnimationFrame || ((fn) => setTimeout(fn, 16));
            _resizeRaf = raf(() => {
                _resizeRaf = 0;
                syncAllTabIndicators(true);
            });
        });
    }

    // Đồng bộ class + tab indicator + cuộn ngang sub-tabs ngay khi script nạp (sớm nhất có thể)
    const _initAnimator = () => {
        sync();
        syncAllTabIndicators(true);
        bindHorizontalScrollOnly('.personalize-tabs-container');
        bindHorizontalScrollOnly('.settings-tabs-container');
        bindHorizontalScrollOnly('#account-subtabs');
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _initAnimator);
    } else {
        _initAnimator();
    }
})();
