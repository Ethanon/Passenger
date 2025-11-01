export class PreferencesService {
    constructor(driveService) {
        this.driveService = driveService;
        this.preferencesFileName = 'preferences.json';
        this.preferencesFileId = null;
        this.preferences = {
            databaseFileId: null,
            databaseFileName: 'passengers.db',
            lastModified: null,
            theme: 'system'
        };
    }

    async LoadPreferences() {
        try {
            const fileId = await this.driveService.FindPreferencesFile();
            
            if (!fileId) {
                return this.preferences;
            }

            this.preferencesFileId = fileId;
            const content = await this.driveService.DownloadPreferences(fileId);
            
            if (content) {
                this.preferences = { ...this.preferences, ...JSON.parse(content) };
            }
            
            return this.preferences;
        } catch (error) {
            console.error('Failed to load preferences:', error);
            return this.preferences;
        }
    }

    async SavePreferences() {
        try {
            this.preferences.lastModified = new Date().toISOString();
            const content = JSON.stringify(this.preferences, null, 2);
            
            const success = await this.driveService.UploadPreferences(
                content,
                this.preferencesFileId
            );
            
            if (success && !this.preferencesFileId) {
                this.preferencesFileId = await this.driveService.FindPreferencesFile();
            }
            
            return success;
        } catch (error) {
            console.error('Failed to save preferences:', error);
            return false;
        }
    }

    GetDatabaseFileId() {
        return this.preferences.databaseFileId;
    }

    GetDatabaseFileName() {
        return this.preferences.databaseFileName;
    }

    async SetDatabaseFile(fileId, fileName) {
        this.preferences.databaseFileId = fileId;
        this.preferences.databaseFileName = fileName;
        return await this.SavePreferences();
    }

    HasCustomDatabase() {
        return this.preferences.databaseFileId !== null;
    }

    async ClearDatabasePreference() {
        this.preferences.databaseFileId = null;
        this.preferences.databaseFileName = 'passengers.db';
        return await this.SavePreferences();
    }

    GetTheme() {
        return this.preferences.theme || 'system';
    }

    async SetTheme(theme) {
        this.preferences.theme = theme;
        return await this.SavePreferences();
    }
}
