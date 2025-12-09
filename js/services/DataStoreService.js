export class DataStoreService {
    constructor(databaseService, driveService, preferencesService) {
        this.databaseService = databaseService;
        this.driveService = driveService;
        this.preferencesService = preferencesService;
        this.autoSaveTimers = new Map();
        this.pendingSync = false;
        this.syncInterval = null;
    }

    GetNotesForDate(date, timeOfDay) {
        if (!date || !timeOfDay) return [];
        return this.databaseService.GetNotesForDate(date, timeOfDay);
    }

    SaveNote(passengerId, date, timeOfDay, noteText) {
        if (!passengerId || !date || !timeOfDay) return false;
        
        const success = this.databaseService.SaveNote(passengerId, date, timeOfDay, noteText);
        
        if (success) {
            this.pendingSync = true;
        }
        
        return success;
    }

    AutoSaveNote(passengerId, date, timeOfDay, noteText) {
        const key = `${passengerId}-${date}-${timeOfDay}`;
        
        if (this.autoSaveTimers.has(key)) {
            clearTimeout(this.autoSaveTimers.get(key));
        }

        const timer = setTimeout(() => {
            this.SaveNote(passengerId, date, timeOfDay, noteText);
            this.autoSaveTimers.delete(key);
        }, 500);

        this.autoSaveTimers.set(key, timer);
    }

    TriggerSync() {
        this.pendingSync = true;
    }

    StartBackgroundSync() {
        if (this.syncInterval) return;

        this.syncInterval = setInterval(async () => {
            if (this.pendingSync) {
                await this.SyncToCloud();
            }
        }, 30000);
    }

    StopBackgroundSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async SyncToCloud() {
        const databaseBuffer = this.databaseService.ExportDatabase();

        if (databaseBuffer.length === 0) return false;

        // upload database and update preferences in cloud storage
        this.pendingSync = !(await this.driveService.SyncDatabase(databaseBuffer) && await this.preferencesService.SavePreferences(false));

        return !this.pendingSync;
    }

    GetNoteForPassenger(passengerId, date, timeOfDay) {
        const notes = this.GetNotesForDate(date, timeOfDay);
        return notes.find(n => n.passengerId === passengerId) || null;
    }

    HasPendingChanges() {
        return this.pendingSync || this.autoSaveTimers.size > 0;
    }
}