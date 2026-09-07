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
            };

            // Set initial state from global/localStorage
            radios.forEach(radio => {
                if (radio.value === selectedBackground) {
                    radio.checked = true;
                }
                
                radio.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        selectedBackground = e.target.value;
                        localStorage.setItem('selectedBackground', selectedBackground);
                        updateUI();
                        
                        // Notify Three.js to update the visual background
                        if (typeof window.updateBackgroundStyle === 'function') {
                            window.updateBackgroundStyle();
                        }
                    }
                });
            });

            ballColorRadios.forEach(radio => {
                if (radio.value === selectedBallColor) {
                    radio.checked = true;
                }

                radio.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        selectedBallColor = e.target.value;
                        localStorage.setItem('selectedBallColor', selectedBallColor);
                        updateUI();

                        // Notify Three.js to update the ball color instantly
                        if (typeof window.updateBallCustomization === 'function') {
                            window.updateBallCustomization();
                        }
                    }
                });
            });

            ballPatternRadios.forEach(radio => {
                if (radio.value === selectedBallPattern) {
                    radio.checked = true;
                }

                radio.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        selectedBallPattern = e.target.value;
                        localStorage.setItem('selectedBallPattern', selectedBallPattern);
                        updateUI();

                        // Notify Three.js to update the ball pattern instantly
                        if (typeof window.updateBallCustomization === 'function') {
                            window.updateBallCustomization();
                        }
                    }
                });
            });

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
