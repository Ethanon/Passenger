export class PreferencesService {
    constructor(driveService) {
        this.driveService = driveService;
        this.preferencesFileName = 'preferences.json';
        this.preferencesKey = 'app-preferences';
        this.preferencesFileId = null;
        this.localDBSequenceNumber = -1;
        this.serverDBSequenceNumber = -1;
        this.preferences = {
            databaseFileId: null,
            databaseFileName: 'passengers.db',
            csvFileId: null,
            csvFileName: 'notes-export.csv',
            databaseSequenceNumber: -1,
            lastModified: null,
            theme: 'system'
        };
    }

    async downloadPreferences(fileId) {
        try {
            const stored = localStorage.getItem(fileId);
            if (stored) {
                this.preferences = JSON.parse(stored);
            } else {
                this.InitializeDefaultDatabase();
            }
            return this.preferences;
        } catch (error) {
            console.error('Failed to load local preferences:', error);            
            return { };
        }
    }

    async LoadPreferences() {
        try {
            // get local or default preferences first
            this.preferences = this.GetLocalPreferences();
            this.localDBSequenceNumber = this.preferences.databaseSequenceNumber;
            this.preferencesFileId = await this.driveService.FindFileInFolder(this.preferencesFileName);
            
            if (this.preferencesFileId) {
                // download remote preferences and merge
                const content = await this.driveService.DownloadTextFile(this.preferencesFileId);
                if (content) {
                    // downloaded preferences always override local ones
                    const remotePreferences = JSON.parse(content);
                    this.serverDBSequenceNumber = remotePreferences.databaseSequenceNumber;
                    this.preferences = { ...this.preferences, ...remotePreferences };
                }
            }
            
            // returns the downloaded preferences or the loca/default ones
            return this.preferences;
        } catch (error) {
            console.error('Failed to load preferences:', error);
            return this.preferences;
        }
    }

    HasDatabase() {
        return this.localDBSequenceNumber >= 0 || this.serverDBSequenceNumber >= 0;
    }

    DatabaseRequiresSync() {
        return this.localDBSequenceNumber > this.serverDBSequenceNumber;
    }

    UseLocalDatabase() {
        return this.localDBSequenceNumber == this.serverDBSequenceNumber;
    }
    
    async SavePreferences(localOnly = false) {
        try {            
            this.preferences.lastModified = new Date().toISOString();
            const content = JSON.stringify(this.preferences, null, 2);

            await this.SetLocalPreferences(content);

            if (localOnly) return true;
            
            // then attempt to save to remote drive
            const success = await this.driveService.UploadJsonFile(
                content,
                this.preferencesFileName,
                this.preferencesFileId // null is ok - it will create a new file
            );
            
            // verify that we saved the file id
            if (success && !this.preferencesFileId) {
                // get the new file id generated for this file
                this.preferencesFileId = await this.driveService.FindPreferencesFile(this.preferencesFileName);                
            }
            
            return success;
        } catch (error) {
            console.error('Failed to save preferences:', error);
            return false;
        }
    }

    GetLocalPreferences() {
        const preferences = localStorage.getItem(this.preferencesKey);
        // if we have local preferences stored, use them, else use defaults
        return preferences ? JSON.parse(preferences) : this.preferences;
    }

    SetLocalPreferences(content) {
        localStorage.setItem(this.preferencesKey, content);
    }

    GetDatabaseSequenceNumber() {
        return this.preferences.databaseSequenceNumber;
    }

    async SetDatabaseSequenceNumber(seqNumber) {
        this.preferences.databaseSequenceNumber = seqNumber;
        return await this.SavePreferences(true);
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
        return await this.SavePreferences(true);
    }

    GetCsvFileId() {
        return this.preferences.csvFileId;
    }

    GetCsvFileName() {
        return this.preferences.csvFileName;
    }

    async SetCsvFile(fileId, fileName) {
        this.preferences.csvFileId = fileId;
        this.preferences.csvFileName = fileName;
        return await this.SavePreferences(true);
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
        return await this.SavePreferences(true);
    }

    GetLocalDatabaseKey() {
        return 'app-database';
    }

    IncrementDatabaseSequenceNumber() {
        const current = this.preferences.databaseSequenceNumber || 0;
        this.preferences.databaseSequenceNumber = current + 1;
        this.SavePreferences(true);
    }
}
