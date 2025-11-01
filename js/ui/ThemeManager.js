/**
 * Manages application theme (light/dark/system)
 */
export class ThemeManager {
    constructor(preferencesService) {
        this.preferencesService = preferencesService;
        this.themes = [
            { value: 'system', title: 'System', description: 'Follow system preference' },
            { value: 'light', title: 'Light', description: 'Always use light mode' },
            { value: 'dark', title: 'Dark', description: 'Always use dark mode' }
        ];
    }

    /**
     * Gets the current theme setting
     * @returns {string} Current theme value
     */
    GetCurrentTheme() {
        return this.preferencesService.GetTheme();
    }

    /**
     * Changes the theme and applies it
     * @param {string} theme - Theme value (system, light, dark)
     */
    ChangeTheme(theme) {
        this.preferencesService.SetTheme(theme);
        this.ApplyTheme(theme);
    }

    /**
     * Applies the theme to the document
     * @param {string} theme - Theme value to apply
     */
    ApplyTheme(theme) {
        const html = document.documentElement;
        if (theme === 'system') {
            html.removeAttribute('data-theme');
        } else {
            html.setAttribute('data-theme', theme);
        }
    }

    /**
     * Creates a theme selector UI component
     * @returns {HTMLDivElement} Theme options container
     */
    CreateThemeSelector() {
        const themeOptions = document.createElement('div');
        themeOptions.className = 'theme-options';

        const currentTheme = this.GetCurrentTheme();

        this.themes.forEach(theme => {
            const option = this.CreateThemeOption(theme, currentTheme);
            themeOptions.appendChild(option);
        });

        return themeOptions;
    }

    /**
     * Creates a single theme option element
     * @param {Object} theme - Theme configuration
     * @param {string} currentTheme - Currently selected theme
     * @returns {HTMLLabelElement} Theme option element
     */
    CreateThemeOption(theme, currentTheme) {
        const option = document.createElement('label');
        option.className = 'theme-option';
        if (currentTheme === theme.value) {
            option.classList.add('selected');
        }

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'theme';
        radio.value = theme.value;
        radio.checked = currentTheme === theme.value;
        radio.addEventListener('change', () => {
            this.ChangeTheme(theme.value);
            this.UpdateSelectedState(theme.value);
        });

        const label = document.createElement('div');
        label.className = 'theme-option-label';

        const title = document.createElement('div');
        title.className = 'theme-option-title';
        title.textContent = theme.title;

        const description = document.createElement('div');
        description.className = 'theme-option-description';
        description.textContent = theme.description;

        label.appendChild(title);
        label.appendChild(description);

        option.appendChild(radio);
        option.appendChild(label);

        return option;
    }

    /**
     * Updates the selected state of theme options
     * @param {string} selectedTheme - The theme that should be selected
     */
    UpdateSelectedState(selectedTheme) {
        const options = document.querySelectorAll('.theme-option');
        options.forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio.value === selectedTheme) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    /**
     * Initializes the theme on app startup
     */
    Initialize() {
        const currentTheme = this.GetCurrentTheme();
        this.ApplyTheme(currentTheme);
    }
}
