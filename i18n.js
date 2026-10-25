// Internationalization (i18n) module
const i18n = (() => {
    // Force German as default if no preference exists
    const storedLanguage = localStorage.getItem('preferredLanguage');
    let currentLanguage = storedLanguage || 'de';
    let translations = {};

    // Load translations
    const loadTranslations = async () => {
        try {
            const response = await fetch('translations.json');
            translations = await response.json();
            applyTranslations();
            // Update language selector to match current language
            const selector = document.getElementById('language-select');
            if (selector) {
                selector.value = currentLanguage;
            }
        } catch (error) {
            console.error('Error loading translations:', error);
        }
    };

    // Get translated text
    const t = (key, defaultText = '') => {
        const keys = key.split('.');
        let value = translations[currentLanguage];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultText || key;
            }
        }

        return value || defaultText;
    };

    // Set language and apply translations
    const setLanguage = (lang) => {
        if (translations[lang]) {
            currentLanguage = lang;
            localStorage.setItem('preferredLanguage', lang);
            applyTranslations();
            document.documentElement.lang = lang;
        }
    };

    // Get current language
    const getLanguage = () => currentLanguage;

    // Apply translations to DOM elements with data-i18n attributes
    const applyTranslations = () => {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translated = t(key);

            if (element.tagName === 'TEXTAREA' || (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'textarea'))) {
                element.placeholder = translated;
            } else if (element.tagName === 'INPUT' && element.type === 'button') {
                element.value = translated;
            } else {
                element.textContent = translated;
            }
        });

        // Update title if present
        const titleElement = document.querySelector('[data-i18n-title]');
        if (titleElement) {
            const key = titleElement.getAttribute('data-i18n-title');
            document.title = t(key);
        }
    };

    // Initialize on DOM content loaded
    const init = () => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadTranslations);
        } else {
            loadTranslations();
        }
    };

    return {
        t,
        setLanguage,
        getLanguage,
        init,
        loadTranslations
    };
})();

// Initialize when script is loaded
i18n.init();
