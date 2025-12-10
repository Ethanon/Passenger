import { Dialog } from './Dialog.js';
import { ModalBuilder } from '../utils/ModalBuilder.js';
import { DOMHelpers } from '../utils/DOMHelpers.js';
import { ThemeManager } from './ThemeManager.js';
import { FileType } from '../constants/FileTypes.js';

export class SettingsManager {
    constructor(preferencesService, driveService, dataStoreService, onDatabaseChanged, isLocalMode = false, databaseService = null) {
        this.preferencesService = preferencesService;
        this.driveService = driveService;
        this.dataStoreService = dataStoreService;
        this.onDatabaseChanged = onDatabaseChanged;
        this.isLocalMode = isLocalMode;
        this.databaseService = databaseService;
        this.dialog = new Dialog();
        this.modalBuilder = new ModalBuilder();
        this.themeManager = new ThemeManager(preferencesService);
        this.advancedExpanded = false;
        this.modalBody = null;
        this.Initialize();
    }

    Initialize() {
        document.getElementById('settings-button').addEventListener('click', () => this.Show());
    }

    Show() {
        const { body } = this.modalBuilder.Create({
            title: 'Settings',
            bodyId: 'settings-modal-body',
            onClose: null
        });
        this.modalBody = body;
        this.modalBuilder.Show();
        this.Render();
    }

    async Render() {
        this.modalBody.innerHTML = '';

        // Appearance Section with Theme
        this.RenderAppearanceSection();

        // Data Export Section
        if (this.databaseService) {
            this.RenderDataExportSection();
        }

        // Advanced Section (Collapsible)
        this.RenderAdvancedSection();

        // Info Section
        this.RenderInfoSection();
    }

    RenderAppearanceSection() {
        const { section } = DOMHelpers.createSection('Appearance');
        const { subsection } = DOMHelpers.createSubsection('Theme');
        
        const themeSelector = this.themeManager.CreateThemeSelector();
        subsection.appendChild(themeSelector);
        section.appendChild(subsection);
        
        this.modalBody.appendChild(section);
    }

    RenderDataExportSection() {
        this.modalBody.appendChild(DOMHelpers.createDivider());
        
        const { section } = DOMHelpers.createSection('Data Export');
        const exportButton = DOMHelpers.createButton(
            'Export Notes to CSV',
            'action-button export-csv-button',
            () => this.ExportNotesToCSV()
        );
        
        section.appendChild(exportButton);
        this.modalBody.appendChild(section);
    }

    RenderAdvancedSection() {
        this.modalBody.appendChild(DOMHelpers.createDivider());

        const section = DOMHelpers.createContainer('settings-section');

        // Advanced header (clickable)
        const header = DOMHelpers.createContainer('advanced-header');
        header.addEventListener('click', () => this.ToggleAdvanced());

        const title = DOMHelpers.createText('h3', 'Advanced', 'settings-section-title');
        const chevron = document.createElement('span');
        chevron.className = this.advancedExpanded ? 'chevron expanded' : 'chevron';
        chevron.innerHTML = '▼';

        DOMHelpers.appendChildren(header, title, chevron);
        section.appendChild(header);

        // Advanced content (collapsible)
        const content = DOMHelpers.createContainer(
            this.advancedExpanded ? 'advanced-content expanded' : 'advanced-content'
        );
        content.id = 'advanced-content';

        // Mode subsection
        content.appendChild(this.CreateModeSubsection());

        // Database subsection
        content.appendChild(this.CreateDatabaseSubsection());

        section.appendChild(content);
        this.modalBody.appendChild(section);
    }

    CreateModeSubsection() {
        const { subsection } = DOMHelpers.createSubsection('Mode');

        const modeBadge = DOMHelpers.createContainer(
            this.isLocalMode ? 'mode-badge local-mode' : 'mode-badge online-mode'
        );
        modeBadge.textContent = this.isLocalMode ? 'Local Testing Mode' : 'Google Drive Mode';

        const modeSubtitle = DOMHelpers.createText(
            'p',
            this.isLocalMode ? 'Data stored in browser' : 'Data synced to Google Drive',
            'mode-subtitle'
        );

        DOMHelpers.appendChildren(subsection, modeBadge, modeSubtitle);
        return subsection;
    }

    CreateDatabaseSubsection() {
        const { subsection } = DOMHelpers.createSubsection('Database');

        const currentDbLabel = DOMHelpers.createText('p', 'Current Database:', 'settings-label');
        const currentDbValue = DOMHelpers.createText(
            'p',
            this.preferencesService.GetFile(FileType.DATABASE).name,
            'settings-value'
        );

        DOMHelpers.appendChildren(subsection, currentDbLabel, currentDbValue);

        // Sync Actions (Online Mode only)
        if (!this.isLocalMode) {
            const syncTitle = DOMHelpers.createText('h5', 'Sync Actions', 'settings-subsubsection-title');
            const syncButton = DOMHelpers.createButton(
                'Sync Now',
                'action-button',
                () => this.HandleManualSync()
            );
            DOMHelpers.appendChildren(subsection, syncTitle, syncButton);
        }

        // Database Management (Local Mode only)
        if (this.isLocalMode) {
            const managementTitle = DOMHelpers.createText('h5', 'Database Management', 'settings-subsubsection-title');
            const managementButtons = DOMHelpers.createButtonGrid();

            const createButton = DOMHelpers.createButton(
                'Create New Database',
                'action-button',
                () => this.CreateNewDatabase()
            );

            const importButton = DOMHelpers.createButton(
                'Import Database',
                'action-button secondary',
                () => this.ImportDatabase()
            );

            const exportButton = DOMHelpers.createButton(
                'Export Database',
                'action-button secondary',
                () => this.ExportDatabase()
            );

            DOMHelpers.appendChildren(managementButtons, createButton, importButton, exportButton);
            DOMHelpers.appendChildren(subsection, managementTitle, managementButtons);
        }

        return subsection;
    }

    RenderInfoSection() {
        this.modalBody.appendChild(DOMHelpers.createDivider());

        const infoSection = DOMHelpers.createContainer('settings-info-section');

        const designedBy = DOMHelpers.createText('p', 'Designed and built by James McDuffie', 'info-text');
        const copyright = DOMHelpers.createText('p', '© 2025 All rights reserved', 'info-text');
        const inspiration = DOMHelpers.createText('p', 'Design inspiration by Steve Hamel', 'info-text');

        DOMHelpers.appendChildren(infoSection, designedBy, copyright, inspiration);
        this.modalBody.appendChild(infoSection);
    }

    ToggleAdvanced() {
        this.advancedExpanded = !this.advancedExpanded;
        const content = document.getElementById('advanced-content');
        const chevron = document.querySelector('.chevron');
        
        if (this.advancedExpanded) {
            content.classList.add('expanded');
            chevron.classList.add('expanded');
        } else {
            content.classList.remove('expanded');
            chevron.classList.remove('expanded');
        }
    }

    async ShowDatabasePicker() {
        this.modalBody.innerHTML = '<p class="settings-loading">Loading databases...</p>';

        const databases = await this.driveService.ListDatabaseFiles();
        this.modalBody.innerHTML = '';

        const backButton = DOMHelpers.createButton('← Back', 'action-button secondary', () => this.Render());
        const title = DOMHelpers.createText('h3', 'Select Database', 'settings-section-title');

        DOMHelpers.appendChildren(this.modalBody, backButton, title);

        if (databases.length === 0) {
            const emptyMessage = DOMHelpers.createText('p', 'No database files found in Google Drive', 'empty-state');
            this.modalBody.appendChild(emptyMessage);
            return;
        }

        const list = DOMHelpers.createContainer('database-list');

        databases.forEach(db => {
            const item = DOMHelpers.createContainer('database-item');
            const info = DOMHelpers.createContainer('database-info');

            const name = DOMHelpers.createText('div', db.name, 'database-name');
            const modified = DOMHelpers.createText(
                'div',
                new Date(db.modifiedTime).toLocaleDateString(),
                'database-modified'
            );

            DOMHelpers.appendChildren(info, name, modified);

            const selectBtn = DOMHelpers.createButton(
                'Select',
                'control-button',
                () => this.SelectDatabase(db.id, db.name)
            );

            DOMHelpers.appendChildren(item, info, selectBtn);
            list.appendChild(item);
        });

        this.modalBody.appendChild(list);
    }

    async SelectDatabase(fileId, fileName) {
        const confirmed = await this.dialog.Confirm(
            `Switch to database "${fileName}"? The application will reload.`
        );

        if (confirmed) {
            await this.preferencesService.SetFile(FileType.DATABASE, fileId, fileName);
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
        const fileName = this.preferencesService.GetFile(FileType.DATABASE).name.replace(/\s+/g, '-') + '.db';
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

    async HandleManualSync() {
        if (this.isLocalMode || !this.dataStoreService) return;
        await this.dataStoreService.SyncToCloud();
    }

    Hide() {
        this.modalBuilder.Hide();
    }
}
