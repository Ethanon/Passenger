import { Dialog } from './Dialog.js';

export class SettingsManager {
    constructor(preferencesService, driveService, onDatabaseChanged, isLocalMode = false, databaseService = null) {
        this.preferencesService = preferencesService;
        this.driveService = driveService;
        this.onDatabaseChanged = onDatabaseChanged;
        this.isLocalMode = isLocalMode;
        this.databaseService = databaseService;
        this.dialog = new Dialog();
        this.modal = null;
        this.Initialize();
    }

    Initialize() {
        document.getElementById('settings-button').addEventListener('click', () => this.Show());
    }

    Show() {
        this.CreateModal();
        this.Render();
    }

    CreateModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        
        const header = document.createElement('div');
        header.className = 'modal-header';
        
        const title = document.createElement('h2');
        title.textContent = 'Settings';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'close-button';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => this.Hide());
        
        header.appendChild(title);
        header.appendChild(closeButton);
        
        const body = document.createElement('div');
        body.className = 'modal-body';
        body.id = 'settings-modal-body';
        
        content.appendChild(header);
        content.appendChild(body);
        this.modal.appendChild(content);
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.Hide();
            }
        });
        
        document.body.appendChild(this.modal);
    }

    async Render() {
        const body = document.getElementById('settings-modal-body');
        body.innerHTML = '';

        // Appearance Section
        const appearanceSection = document.createElement('div');
        appearanceSection.className = 'settings-section';

        const appearanceTitle = document.createElement('h3');
        appearanceTitle.textContent = 'Appearance';
        appearanceTitle.className = 'settings-section-title';

        const themeSubsection = document.createElement('div');
        themeSubsection.className = 'settings-subsection';

        const themeTitle = document.createElement('h4');
        themeTitle.className = 'settings-subsection-title';
        themeTitle.textContent = 'Theme';

        const themeOptions = document.createElement('div');
        themeOptions.className = 'theme-options';

        const currentTheme = this.preferencesService.GetTheme();

        const themes = [
            { value: 'system', title: 'System', description: 'Follow system preference' },
            { value: 'light', title: 'Light', description: 'Always use light mode' },
            { value: 'dark', title: 'Dark', description: 'Always use dark mode' }
        ];

        themes.forEach(theme => {
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
            radio.addEventListener('change', () => this.ChangeTheme(theme.value));

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

            themeOptions.appendChild(option);
        });

        themeSubsection.appendChild(themeTitle);
        themeSubsection.appendChild(themeOptions);

        appearanceSection.appendChild(appearanceTitle);
        appearanceSection.appendChild(themeSubsection);

        body.appendChild(appearanceSection);

        const divider1 = document.createElement('hr');
        divider1.className = 'settings-divider';
        body.appendChild(divider1);

        const modeSection = document.createElement('div');
        modeSection.className = 'settings-section';

        const modeTitle = document.createElement('h3');
        modeTitle.textContent = 'Mode';
        modeTitle.className = 'settings-section-title';

        const modeBadge = document.createElement('div');
        modeBadge.className = this.isLocalMode ? 'mode-badge local-mode' : 'mode-badge online-mode';
        modeBadge.textContent = this.isLocalMode ? 'Local Testing Mode' : 'Google Drive Mode';

        const modeSubtitle = document.createElement('p');
        modeSubtitle.className = 'mode-subtitle';
        modeSubtitle.textContent = this.isLocalMode 
            ? 'Data stored in browser' 
            : 'Data synced to Google Drive';

        modeSection.appendChild(modeTitle);
        modeSection.appendChild(modeBadge);
        modeSection.appendChild(modeSubtitle);

        body.appendChild(modeSection);

        const divider = document.createElement('hr');
        divider.className = 'settings-divider';
        body.appendChild(divider);

        const section = document.createElement('div');
        section.className = 'settings-section';

        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = 'Database';
        sectionTitle.className = 'settings-section-title';

        const currentDbLabel = document.createElement('p');
        currentDbLabel.className = 'settings-label';
        currentDbLabel.textContent = 'Current Database:';

        const currentDbValue = document.createElement('p');
        currentDbValue.className = 'settings-value';
        currentDbValue.textContent = this.preferencesService.GetDatabaseFileName();

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'settings-buttons';

        const selectButton = document.createElement('button');
        selectButton.className = 'action-button';
        selectButton.textContent = 'Select Different Database';
        selectButton.addEventListener('click', () => this.ShowDatabasePicker());

        buttonContainer.appendChild(selectButton);

        if (this.isLocalMode) {
            const createButton = document.createElement('button');
            createButton.className = 'action-button';
            createButton.textContent = 'Create New Database';
            createButton.addEventListener('click', () => this.CreateNewDatabase());

            const exportButton = document.createElement('button');
            exportButton.className = 'action-button secondary';
            exportButton.textContent = 'Export Database';
            exportButton.addEventListener('click', () => this.ExportDatabase());

            const importButton = document.createElement('button');
            importButton.className = 'action-button secondary';
            importButton.textContent = 'Import Database';
            importButton.addEventListener('click', () => this.ImportDatabase());

            buttonContainer.appendChild(createButton);
            buttonContainer.appendChild(exportButton);
            buttonContainer.appendChild(importButton);
        }

        if (this.databaseService) {
            const exportCSVButton = document.createElement('button');
            exportCSVButton.className = 'action-button secondary';
            exportCSVButton.textContent = 'Export Notes to CSV';
            exportCSVButton.addEventListener('click', () => this.ExportNotesToCSV());
            buttonContainer.appendChild(exportCSVButton);
        }

        const resetButton = document.createElement('button');
        resetButton.className = 'action-button secondary';
        resetButton.textContent = 'Reset to Default';
        resetButton.addEventListener('click', () => this.ResetToDefault());

        if (!this.preferencesService.HasCustomDatabase()) {
            resetButton.disabled = true;
            resetButton.style.opacity = '0.5';
        }

        buttonContainer.appendChild(resetButton);

        section.appendChild(sectionTitle);
        section.appendChild(currentDbLabel);
        section.appendChild(currentDbValue);

        body.appendChild(section);

        const selectionSection = document.createElement('div');
        selectionSection.className = 'settings-subsection';
        
        const selectionTitle = document.createElement('h4');
        selectionTitle.className = 'settings-subsection-title';
        selectionTitle.textContent = 'Database Selection';
        
        const selectionButtons = document.createElement('div');
        selectionButtons.className = 'settings-button-grid';
        selectionButtons.appendChild(selectButton);
        selectionButtons.appendChild(resetButton);
        
        selectionSection.appendChild(selectionTitle);
        selectionSection.appendChild(selectionButtons);
        body.appendChild(selectionSection);

        if (this.isLocalMode) {
            const managementSection = document.createElement('div');
            managementSection.className = 'settings-subsection';
            
            const managementTitle = document.createElement('h4');
            managementTitle.className = 'settings-subsection-title';
            managementTitle.textContent = 'Database Management';
            
            const managementButtons = document.createElement('div');
            managementButtons.className = 'settings-button-grid';
            
            const createButton = document.createElement('button');
            createButton.className = 'action-button';
            createButton.textContent = 'Create New Database';
            createButton.addEventListener('click', () => this.CreateNewDatabase());

            const importButton = document.createElement('button');
            importButton.className = 'action-button secondary';
            importButton.textContent = 'Import Database';
            importButton.addEventListener('click', () => this.ImportDatabase());

            const exportButton = document.createElement('button');
            exportButton.className = 'action-button secondary';
            exportButton.textContent = 'Export Database';
            exportButton.addEventListener('click', () => this.ExportDatabase());

            managementButtons.appendChild(createButton);
            managementButtons.appendChild(importButton);
            managementButtons.appendChild(exportButton);
            
            managementSection.appendChild(managementTitle);
            managementSection.appendChild(managementButtons);
            body.appendChild(managementSection);
        }

        if (this.databaseService) {
            const exportSection = document.createElement('div');
            exportSection.className = 'settings-subsection';
            
            const exportTitle = document.createElement('h4');
            exportTitle.className = 'settings-subsection-title';
            exportTitle.textContent = 'Data Export';
            
            const exportButtons = document.createElement('div');
            exportButtons.className = 'settings-button-grid';
            
            const exportCSVButton = document.createElement('button');
            exportCSVButton.className = 'action-button secondary';
            exportCSVButton.textContent = 'Export Notes to CSV';
            exportCSVButton.addEventListener('click', () => this.ExportNotesToCSV());
            
            exportButtons.appendChild(exportCSVButton);
            
            exportSection.appendChild(exportTitle);
            exportSection.appendChild(exportButtons);
            body.appendChild(exportSection);
        }
    }

    async ShowDatabasePicker() {
        const body = document.getElementById('settings-modal-body');
        body.innerHTML = '<p class="settings-loading">Loading databases...</p>';

        const databases = await this.driveService.ListDatabaseFiles();

        body.innerHTML = '';

        const backButton = document.createElement('button');
        backButton.className = 'action-button secondary';
        backButton.textContent = '← Back';
        backButton.addEventListener('click', () => this.Render());

        const title = document.createElement('h3');
        title.className = 'settings-section-title';
        title.textContent = 'Select Database';

        body.appendChild(backButton);
        body.appendChild(title);

        if (databases.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'empty-state';
            emptyMessage.textContent = 'No database files found in Google Drive';
            body.appendChild(emptyMessage);
            return;
        }

        const list = document.createElement('div');
        list.className = 'database-list';

        databases.forEach(db => {
            const item = document.createElement('div');
            item.className = 'database-item';

            const info = document.createElement('div');
            info.className = 'database-info';

            const name = document.createElement('div');
            name.className = 'database-name';
            name.textContent = db.name;

            const modified = document.createElement('div');
            modified.className = 'database-modified';
            modified.textContent = new Date(db.modifiedTime).toLocaleDateString();

            info.appendChild(name);
            info.appendChild(modified);

            const selectBtn = document.createElement('button');
            selectBtn.className = 'control-button';
            selectBtn.textContent = 'Select';
            selectBtn.addEventListener('click', () => this.SelectDatabase(db.id, db.name));

            item.appendChild(info);
            item.appendChild(selectBtn);
            list.appendChild(item);
        });

        body.appendChild(list);
    }

    async SelectDatabase(fileId, fileName) {
        const confirmed = await this.dialog.Confirm(
            `Switch to database "${fileName}"? The application will reload.`
        );

        if (confirmed) {
            await this.preferencesService.SetDatabaseFile(fileId, fileName);
            this.Hide();
            if (this.onDatabaseChanged) {
                this.onDatabaseChanged();
            }
        }
    }

    async ResetToDefault() {
        const confirmed = await this.dialog.Confirm(
            'Reset to default database? The application will reload.'
        );

        if (confirmed) {
            await this.preferencesService.ClearDatabasePreference();
            this.Hide();
            if (this.onDatabaseChanged) {
                this.onDatabaseChanged();
            }
        }
    }

    async CreateNewDatabase() {
        const name = await this.dialog.Prompt('Enter new database name:');
        if (name) {
            const key = await this.driveService.CreateNewDatabase(name);
            if (key) {
                await this.SelectDatabase(key, name);
            }
        }
    }

    async ExportDatabase() {
        const fileName = this.preferencesService.GetDatabaseFileName().replace(/\s+/g, '-') + '.db';
        const success = this.driveService.ExportDatabaseFile(fileName);
        if (success) {
            await this.dialog.Confirm('Database exported successfully!');
        }
    }

    async ImportDatabase() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.db,.sqlite,.sqlite3';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const name = await this.dialog.Prompt('Enter name for imported database:', file.name.replace(/\.[^/.]+$/, ''));
                if (name) {
                    const key = await this.driveService.CreateNewDatabase(name);
                    if (key) {
                        this.driveService.UpdateStorageKey(key);
                        const success = await this.driveService.ImportDatabaseFile(file);
                        if (success) {
                            await this.SelectDatabase(key, name);
                        }
                    }
                }
            }
        };
        
        input.click();
    }

    async ExportNotesToCSV() {
        if (!this.databaseService) {
            await this.dialog.Confirm('Database service not available');
            return;
        }

        const csvContent = this.databaseService.ExportNotesToCSV();
        
        if (!csvContent || csvContent === 'Passenger Name,Date,Time of Day,Note,Created At,Updated At\n') {
            await this.dialog.Confirm('No notes found to export');
            return;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const fileName = `bus-notes-${new Date().toISOString().split('T')[0]}.csv`;
        
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        await this.dialog.Confirm(`Notes exported successfully to ${fileName}`);
    }

    ChangeTheme(theme) {
        this.preferencesService.SetTheme(theme);
        this.ApplyTheme(theme);
        
        // Update selected state
        const options = document.querySelectorAll('.theme-option');
        options.forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio.value === theme) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    ApplyTheme(theme) {
        const html = document.documentElement;
        if (theme === 'system') {
            html.removeAttribute('data-theme');
        } else {
            html.setAttribute('data-theme', theme);
        }
    }

    Hide() {
        if (this.modal) {
            document.body.removeChild(this.modal);
            this.modal = null;
        }
    }
}
