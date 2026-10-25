# German Translation Guide

This project now supports multiple languages, with German (Deutsch) as the default language and English as an alternative.

## How It Works

### Files
- **`translations.json`** - Contains all translated text for both languages
- **`i18n.js`** - Internationalization module that handles language switching and translation lookup
- **`index.html`** - Main page with language selector dropdown

### Language Selection
- Users can switch languages using the language dropdown in the header
- The preferred language is stored in browser's `localStorage` and persists across sessions
- Default language is German (de)

## Adding Translations to HTML Elements

To add translations to any HTML element, use the `data-i18n` attribute:

```html
<!-- Text content -->
<h1 data-i18n="header.title">Meine IT-Journey-Tools</h1>

<!-- Input placeholder -->
<textarea data-i18n="bionic.placeholder" placeholder="..."></textarea>

<!-- Button text -->
<button data-i18n="buttons.convertToBionic">In Bionic Reading umwandeln</button>
```

The attribute value uses dot notation to reference the translation key in `translations.json`:
- `header.title` → `translations[language].header.title`

## Translation Structure in JSON

The `translations.json` file is organized hierarchically:

```json
{
  "en": {
    "header": {
      "title": "My IT Journey Tools",
      "description": "..."
    },
    "tools": { ... },
    "buttons": { ... }
  },
  "de": {
    "header": {
      "title": "Meine IT-Journey-Tools",
      "description": "..."
    },
    ...
  }
}
```

## Adding a New Language

1. Add a new language section to `translations.json`:

```json
{
  "fr": {
    "header": {
      "title": "Mes outils IT Journey",
      ...
    }
  }
}
```

2. Add the language option to the language selector in `index.html`:

```html
<select id="language-select">
  <option value="de">Deutsch</option>
  <option value="en">English</option>
  <option value="fr">Français</option>
</select>
```

3. Use `i18n.setLanguage('fr')` to test the new language.

## Using the i18n Module in JavaScript

```javascript
// Get translated text
const title = i18n.t('header.title');

// Set language
i18n.setLanguage('de'); // or 'en'

// Get current language
const currentLang = i18n.getLanguage();

// Trigger translation of all data-i18n elements
i18n.applyTranslations();
```

## Current Supported Languages

| Code | Language |
|------|----------|
| de   | Deutsch  |
| en   | English  |

## Tools Translated

- ✅ Main Hub (index.html)
- ✅ Bionic Reading Converter
- ⚠️ Color Contrast Checker (UI support, content auto-generated)
- ⏳ Flash Hero (Coming soon)
- ⏳ Up to the Star (Coming soon)

## Best Practices

1. Keep translation keys consistent and organized
2. Use descriptive key names (e.g., `buttons.convertToBionic` instead of `btn1`)
3. Test both languages when adding new features
4. Update all language variants when adding new translations
5. Use `data-i18n` attributes for static content and `i18n.t()` for dynamic content
