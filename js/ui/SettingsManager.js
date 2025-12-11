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

        const { section } = DOMHelpers.createSection('Data Management');

        const importButton = DOMHelpers.createButton(
            'Import Database Records',
            'action-button import-records-button',
            () => this.ImportDatabaseRecords()
        );

        const exportButton = DOMHelpers.createButton(
            'Export Notes to CSV',
            'action-button export-csv-button',
            () => this.ExportNotesToCSV()
        );

        DOMHelpers.appendChildren(section, importButton, exportButton);
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

        // Sync Actions - show in both modes, disable in local mode
        const syncTitle = DOMHelpers.createText('h5', 'Sync Actions', 'settings-subsubsection-title');
        const syncButton = DOMHelpers.createButton(
            'Sync Now',
            'action-button',
            () => this.HandleManualSync()
        );

        if (this.isLocalMode) {
            syncButton.disabled = true;
            syncButton.style.opacity = '0.5';
            syncButton.style.cursor = 'not-allowed';
            syncButton.title = 'Sync not available in local mode';
        }

        DOMHelpers.appendChildren(subsection, syncTitle, syncButton);

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

    async ImportDatabaseRecords() {
        if (!this.databaseService) {
            await this.dialog.Confirm('Database service not available');
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.db,.sqlite,.sqlite3';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const arrayBuffer = await file.arrayBuffer();
            const success = await this.databaseService.ImportRecordsFromFile(arrayBuffer);

            if (success) {
                await this.dataStoreService.TriggerSync();
                await this.dialog.Confirm('Records imported and synced successfully!');
            } else {
                await this.dialog.Confirm('Failed to import records. Invalid database file.');
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
