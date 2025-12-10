import { FileType } from '../constants/FileTypes.js';

export class PreferencesService {
    constructor(driveService) {
        this.driveService = driveService;
        this.preferencesKey = 'app-preferences';
        this.preferencesVersion = 2;
        this.localDBSequenceNumber = -1;
        this.serverDBSequenceNumber = -1;
        this.preferences = {
            version: 2,
            files: {
                [FileType.DATABASE]: { id: null, name: 'passengers.db' },
                [FileType.CSV]: { id: null, name: 'notes-export.csv' },
                [FileType.PREFERENCES]: { id: null, name: 'preferences.json' }
            },
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
            this.preferences = this.GetLocalPreferences();
            this.localDBSequenceNumber = this.preferences.databaseSequenceNumber;

            const prefsFile = this.preferences.files[FileType.PREFERENCES];
            const prefsFileId = await this.driveService.FindFileInFolder(prefsFile.name);

            if (prefsFileId) {
                this.preferences.files[FileType.PREFERENCES].id = prefsFileId;
                const content = await this.driveService.DownloadTextFile(prefsFileId);
                if (content) {
                    const remotePreferences = JSON.parse(content);
                    this.serverDBSequenceNumber = remotePreferences.databaseSequenceNumber;
                    this.preferences = { ...this.preferences, ...remotePreferences };
                }
            }

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

            const prefsFile = this.preferences.files[FileType.PREFERENCES];
            const success = await this.driveService.UploadJsonFile(
                content,
                prefsFile.name,
                prefsFile.id
            );

            if (success && !prefsFile.id) {
                const newFileId = await this.driveService.FindFileInFolder(prefsFile.name);
                if (newFileId) {
                    this.preferences.files[FileType.PREFERENCES].id = newFileId;
                }
            }

            return success;
        } catch (error) {
            console.error('Failed to save preferences:', error);
            return false;
        }
    }

    GetLocalPreferences() {
        const preferences = localStorage.getItem(this.preferencesKey);
        if (!preferences) return this.preferences;

        const parsed = JSON.parse(preferences);

        // Version check - if version doesn't match, use defaults
        if (!parsed.version || parsed.version !== this.preferencesVersion) {
            console.log('Preferences version mismatch or missing. Using defaults.');
            return this.preferences;
        }

        return parsed;
    }

    SetLocalPreferences(content) {
        localStorage.setItem(this.preferencesKey, content);
    }

    GetFile(fileType) {
        return this.preferences.files[fileType] || { id: null, name: null };
    }

    async SetFile(fileType, id, name = null) {
        if (!this.preferences.files[fileType]) {
            this.preferences.files[fileType] = {};
        }
        this.preferences.files[fileType].id = id;
        if (name) this.preferences.files[fileType].name = name;
        return await this.SavePreferences(true);
    }

    GetDatabaseSequenceNumber() {
        return this.preferences.databaseSequenceNumber;
    }

    async SetDatabaseSequenceNumber(seqNumber) {
        this.preferences.databaseSequenceNumber = seqNumber;
        return await this.SavePreferences(true);
    }

    HasCustomDatabase() {
        return this.preferences.files[FileType.DATABASE].id !== null;
    }

    async ClearDatabasePreference() {
        this.preferences.files[FileType.DATABASE].id = null;
        this.preferences.files[FileType.DATABASE].name = 'passengers.db';
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
