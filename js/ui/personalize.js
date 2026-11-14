// ============================================================
//  personalize.js — Personalization Manager
// ============================================================

(function () {
    const PersonalizeManager = {
        init() {
            console.log("Personalize Manager initialized.");

            const radios = document.querySelectorAll('input[name="selected-bg-style"]');
            const ballColorRadios = document.querySelectorAll('input[name="selected-ball-color"]');
            const ballPatternRadios = document.querySelectorAll('input[name="selected-ball-pattern"]');
            const environmentRadios = document.querySelectorAll('input[name="selected-environment"]');
            const pulseStyleRadios = document.querySelectorAll('input[name="selected-pulse-style"]');
            const pulseCards = document.querySelectorAll('.bp-card[data-pulse-style]');
            const boundaryParticleStyleRadios = document.querySelectorAll('input[name="selected-boundary-particle-style"]');
            const boundaryParticleCards = document.querySelectorAll('.bp-card[data-particle-style]');

            const updateUI = () => {
                radios.forEach(radio => {
                    const card = radio.closest('.bg-option-card');
                    if (!card) return;
                    const dot = card.querySelector('.radio-dot div');
                    const border = card.querySelector('.radio-dot');

                    if (radio.checked) {
                        card.classList.add('border-cyan-400', 'shadow-[0_0_15px_rgba(6,182,212,0.15)]', 'bg-cyan-950/20');
                        card.classList.remove('border-cyan-500/20');
                        if (dot) {
                            dot.classList.remove('scale-0');
                            dot.classList.add('scale-100');
                        }
                        if (border) {
                            border.classList.add('border-cyan-400');
                            border.classList.remove('border-gray-600');
                        }
                    } else {
                        card.classList.remove('border-cyan-400', 'shadow-[0_0_15px_rgba(6,182,212,0.15)]', 'bg-cyan-950/20');
                        card.classList.add('border-cyan-500/20');
                        if (dot) {
                            dot.classList.remove('scale-100');
                            dot.classList.add('scale-0');
                        }
                        if (border) {
                            border.classList.remove('border-cyan-400');
                            border.classList.add('border-gray-600');
                        }
                    }
                });

                ballColorRadios.forEach(radio => {
                    const label = radio.closest('label');
                    const ring = label.querySelector('.ring-indicator');
                    if (radio.checked) {
                        label.classList.add('border-cyan-400');
                        label.classList.remove('border-gray-600');
                        if (ring) {
                            ring.classList.remove('scale-0', 'opacity-0');
                            ring.classList.add('scale-100', 'opacity-100');
                        }
                    } else {
                        label.classList.remove('border-cyan-400');
                        label.classList.add('border-gray-600');
                        if (ring) {
                            ring.classList.add('scale-0', 'opacity-0');
                            ring.classList.remove('scale-100', 'opacity-100');
                        }
                    }
                });

                ballPatternRadios.forEach(radio => {
                    const card = radio.closest('.bg-option-card');
                    if (!card) return;
                    const dot = card.querySelector('.radio-dot div');
                    const border = card.querySelector('.radio-dot');

                    if (radio.checked) {
                        card.classList.add('border-cyan-400', 'shadow-[0_0_15px_rgba(6,182,212,0.15)]', 'bg-cyan-950/20');
                        card.classList.remove('border-cyan-500/20');
                        if (dot) {
                            dot.classList.remove('scale-0');
                            dot.classList.add('scale-100');
                        }
                        if (border) {
                            border.classList.add('border-cyan-400');
                            border.classList.remove('border-gray-600');
                        }
                    } else {
                        card.classList.remove('border-cyan-400', 'shadow-[0_0_15px_rgba(6,182,212,0.15)]', 'bg-cyan-950/20');
                        card.classList.add('border-cyan-500/20');
                        if (dot) {
                            dot.classList.remove('scale-100');
                            dot.classList.add('scale-0');
                        }
                        if (border) {
                            border.classList.remove('border-cyan-400');
                            border.classList.add('border-gray-600');
                        }
                    }
                });

                environmentRadios.forEach(radio => {
                    const card = radio.closest('.bg-option-card');
                    if (!card) return;
                    const dot = card.querySelector('.radio-dot div');
                    const border = card.querySelector('.radio-dot');

                    if (radio.checked) {
                        card.classList.add('border-cyan-400', 'shadow-[0_0_15px_rgba(6,182,212,0.15)]', 'bg-cyan-950/20');
                        card.classList.remove('border-cyan-500/20');
                        if (dot) {
                            dot.classList.remove('scale-0');
                            dot.classList.add('scale-100');
                        }
                        if (border) {
                            border.classList.add('border-cyan-400');
                            border.classList.remove('border-gray-600');
                        }
                    } else {
                        card.classList.remove('border-cyan-400', 'shadow-[0_0_15px_rgba(6,182,212,0.15)]', 'bg-cyan-950/20');
                        card.classList.add('border-cyan-500/20');
                        if (dot) {
                            dot.classList.remove('scale-100');
                            dot.classList.add('scale-0');
                        }
                        if (border) {
                            border.classList.remove('border-cyan-400');
                            border.classList.add('border-gray-600');
                        }
                    }
                });

                pulseCards.forEach(card => {
                    const style = card.dataset.pulseStyle;
                    const isSelected = (style === selectedPulseStyle);
                    card.classList.toggle('on', isSelected);
                    card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
                    const radio = card.querySelector('input[name="selected-pulse-style"]');
                    if (radio) {
                        radio.checked = isSelected;
                    }
                });

                boundaryParticleCards.forEach(card => {
                    const style = card.dataset.particleStyle;
                    const isSelected = (style === selectedBoundaryParticleStyle);
                    card.classList.toggle('on', isSelected);
                    card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
                    const radio = card.querySelector('input[name="selected-boundary-particle-style"]');
                    if (radio) {
                        radio.checked = isSelected;
                    }
                });
            };

            const syncSettingFromStorage = (storageKey, fallbackValue) => {
                const stored = localStorage.getItem(storageKey);
                return (stored !== null && stored !== '') ? stored : fallbackValue;
            };

            selectedBackground = syncSettingFromStorage('selectedBackground', typeof selectedBackground !== 'undefined' ? selectedBackground : 'default');
            selectedBallColor = syncSettingFromStorage('selectedBallColor', typeof selectedBallColor !== 'undefined' ? selectedBallColor : 'dynamic');
            selectedBallPattern = syncSettingFromStorage('selectedBallPattern', typeof selectedBallPattern !== 'undefined' ? selectedBallPattern : 'solid');
            selectedEnvironment = syncSettingFromStorage('selectedEnvironment', typeof selectedEnvironment !== 'undefined' ? selectedEnvironment : 'void');
            selectedPulseStyle = syncSettingFromStorage('selectedPulseStyle', typeof selectedPulseStyle !== 'undefined' ? selectedPulseStyle : 'wave');
            selectedBoundaryParticleStyle = syncSettingFromStorage('selectedBoundaryParticleStyle', typeof selectedBoundaryParticleStyle !== 'undefined' ? selectedBoundaryParticleStyle : 'wave');

            window.selectedBackground = selectedBackground;
            window.selectedBallColor = selectedBallColor;
            window.selectedBallPattern = selectedBallPattern;
            window.selectedEnvironment = selectedEnvironment;
            window.selectedPulseStyle = selectedPulseStyle;
            window.selectedBoundaryParticleStyle = selectedBoundaryParticleStyle;

            const bindRadioGroup = (radioList, currentValue, storageKey, setGlobal, onApply) => {
                let found = false;
                radioList.forEach(radio => {
                    if (radio.value === currentValue) {
                        radio.checked = true;
                        found = true;
                    }
                    if (!radio._personalizeBound) {
                        radio._personalizeBound = true;
                        radio.addEventListener('change', (e) => {
                            if (e.target.checked) {
                                setGlobal(e.target.value);
                                localStorage.setItem(storageKey, e.target.value);
                                updateUI();
                                if (onApply) onApply();
                            }
                        });
                    }
                });
                if (!found && radioList.length > 0) {
                    const fallback = radioList[0].value;
                    radioList[0].checked = true;
                    setGlobal(fallback);
                    localStorage.setItem(storageKey, fallback);
                }
            };

            bindRadioGroup(
                radios,
                selectedBackground,
                'selectedBackground',
                (val) => { selectedBackground = val; window.selectedBackground = val; },
                () => { if (typeof window.updateBackgroundStyle === 'function') window.updateBackgroundStyle(); }
            );

            bindRadioGroup(
                ballColorRadios,
                selectedBallColor,
                'selectedBallColor',
                (val) => { selectedBallColor = val; window.selectedBallColor = val; },
                () => { if (typeof window.updateBallCustomization === 'function') window.updateBallCustomization(); }
            );

            bindRadioGroup(
                ballPatternRadios,
                selectedBallPattern,
                'selectedBallPattern',
                (val) => { selectedBallPattern = val; window.selectedBallPattern = val; },
                () => { if (typeof window.updateBallCustomization === 'function') window.updateBallCustomization(); }
            );

            bindRadioGroup(
                environmentRadios,
                selectedEnvironment,
                'selectedEnvironment',
                (val) => { selectedEnvironment = val; window.selectedEnvironment = val; },
                () => { if (typeof window.updateEnvironment === 'function') window.updateEnvironment(); }
            );

            const bindStyleGroup = (cards, radioList, datasetKey, currentValue, storageKey, setGlobal, onApply, fallbackDefault) => {
                cards.forEach(card => {
                    if (!card._personalizeBound) {
                        card._personalizeBound = true;
                        card.addEventListener('click', () => {
                            const style = card.dataset[datasetKey];
                            if (!style) return;
                            setGlobal(style);
                            localStorage.setItem(storageKey, style);
                            if (onApply) onApply();
                            updateUI();
                        });
                    }
                });

                let found = false;
                radioList.forEach(radio => {
                    if (radio.value === currentValue) {
                        radio.checked = true;
                        found = true;
                    }
                    if (!radio._personalizeBound) {
                        radio._personalizeBound = true;
                        radio.addEventListener('change', (e) => {
                            if (e.target.checked) {
                                setGlobal(e.target.value);
                                localStorage.setItem(storageKey, e.target.value);
                                if (onApply) onApply();
                                updateUI();
                            }
                        });
                    }
                });

                if (!found && (radioList.length > 0 || cards.length > 0)) {
                    setGlobal(fallbackDefault);
                    localStorage.setItem(storageKey, fallbackDefault);
                    if (onApply) onApply();
                }
            };

            bindStyleGroup(
                pulseCards,
                pulseStyleRadios,
                'pulseStyle',
                selectedPulseStyle,
                'selectedPulseStyle',
                (val) => { selectedPulseStyle = val; window.selectedPulseStyle = val; },
                () => { if (typeof window.initPulseStyleForBeatmap === 'function') window.initPulseStyleForBeatmap(); },
                'wave'
            );

            bindStyleGroup(
                boundaryParticleCards,
                boundaryParticleStyleRadios,
                'particleStyle',
                selectedBoundaryParticleStyle,
                'selectedBoundaryParticleStyle',
                (val) => { selectedBoundaryParticleStyle = val; window.selectedBoundaryParticleStyle = val; },
                () => { if (typeof window.initBoundaryParticleStyleForBeatmap === 'function') window.initBoundaryParticleStyleForBeatmap(); },
                'wave'
            );

            // Initialize UI styling
            updateUI();

            // Trigger translation on load to localize injected markup
            if (typeof applyTranslations === 'function') {
                applyTranslations();
            }
        }
    };

    window.PersonalizeManager = PersonalizeManager;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PersonalizeManager.init());
    } else {
        PersonalizeManager.init();
    }
})();
