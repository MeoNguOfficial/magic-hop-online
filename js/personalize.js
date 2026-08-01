// ============================================================
//  personalize.js — Personalization Manager
// ============================================================

(function () {
    const PersonalizeManager = {
        init() {
            console.log("Personalize Manager initialized.");
            
            const radios = document.querySelectorAll('input[name="selected-bg-style"]');
            
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
