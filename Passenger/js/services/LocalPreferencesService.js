export class LocalPreferencesService {
    constructor() {
        this.preferencesKey = 'app-preferences';
        this.preferences = {
            currentDatabaseKey: 'bus-passenger-notes-db',
            availableDatabases: []
        };
    }

    async LoadPreferences() {
        try {
            const stored = localStorage.getItem(this.preferencesKey);
            if (stored) {
                this.preferences = JSON.parse(stored);
            } else {
                this.InitializeDefaultDatabase();
            }
            return this.preferences;
        } catch (error) {
            console.error('Failed to load local preferences:', error);
            this.InitializeDefaultDatabase();
            return this.preferences;
        }
    }

    InitializeDefaultDatabase() {
        this.preferences.availableDatabases = [{
            key: 'bus-passenger-notes-db',
            name: 'Default Database',
            created: new Date().toISOString()
        }];
        this.SavePreferences();
    }

    async SavePreferences() {
        try {
            localStorage.setItem(this.preferencesKey, JSON.stringify(this.preferences));
            return true;
        } catch (error) {
            console.error('Failed to save local preferences:', error);
            return false;
        }
    }

    GetDatabaseFileId() {
        return this.preferences.currentDatabaseKey;
    }

    GetDatabaseFileName() {
        const db = this.preferences.availableDatabases.find(
            d => d.key === this.preferences.currentDatabaseKey
        );
        return db ? db.name : 'Default Database';
    }

    async SetDatabaseFile(databaseKey, databaseName) {
        this.preferences.currentDatabaseKey = databaseKey;
        
        const exists = this.preferences.availableDatabases.find(d => d.key === databaseKey);
        if (!exists) {
            this.preferences.availableDatabases.push({
                key: databaseKey,
                name: databaseName,
                created: new Date().toISOString()
            });
        }
        
        return await this.SavePreferences();
    }

    HasCustomDatabase() {
        return this.preferences.currentDatabaseKey !== 'bus-passenger-notes-db';
    }

    async ClearDatabasePreference() {
        this.preferences.currentDatabaseKey = 'bus-passenger-notes-db';
        return await this.SavePreferences();
    }

    GetAvailableDatabases() {
        return this.preferences.availableDatabases;
    }

    async CreateNewDatabase(name) {
        const key = `bus-db-${Date.now()}`;
        this.preferences.availableDatabases.push({
            key: key,
            name: name,
            created: new Date().toISOString()
        });
        await this.SavePreferences();
        return key;
    }
}
