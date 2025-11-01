export class LocalStorageService {
    constructor(storageKey) {
        this.storageKey = storageKey;
        this.preferencesService = null;
    }

    SetPreferencesService(preferencesService) {
        this.preferencesService = preferencesService;
    }

    UpdateStorageKey(newKey) {
        this.storageKey = newKey;
    }

    async DownloadDatabase() {
        try {
            const base64Data = localStorage.getItem(this.storageKey);
            
            if (!base64Data) return null;

            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            return bytes.buffer;
        } catch (error) {
            console.error('Failed to download database from localStorage:', error);
            return null;
        }
    }

    async UploadDatabase(databaseBuffer) {
        try {
            const bytes = new Uint8Array(databaseBuffer);
            let binaryString = '';
            
            for (let i = 0; i < bytes.length; i++) {
                binaryString += String.fromCharCode(bytes[i]);
            }
            
            const base64Data = btoa(binaryString);
            localStorage.setItem(this.storageKey, base64Data);
            
            return true;
        } catch (error) {
            console.error('Failed to upload database to localStorage:', error);
            return false;
        }
    }

    async SyncDatabase(databaseBuffer) {
        return await this.UploadDatabase(databaseBuffer);
    }

    ClearDatabase() {
        localStorage.removeItem(this.storageKey);
    }

    ExportDatabase() {
        const base64Data = localStorage.getItem(this.storageKey);
        return base64Data || '';
    }

    ImportDatabase(base64Data) {
        try {
            localStorage.setItem(this.storageKey, base64Data);
            return true;
        } catch (error) {
            console.error('Failed to import database:', error);
            return false;
        }
    }

    async ListDatabaseFiles() {
        if (!this.preferencesService) return [];
        
        const databases = this.preferencesService.GetAvailableDatabases();
        return databases.map(db => ({
            id: db.key,
            name: db.name,
            modifiedTime: db.created
        }));
    }

    async DownloadDatabaseById(databaseKey) {
        const originalKey = this.storageKey;
        this.storageKey = databaseKey;
        const result = await this.DownloadDatabase();
        this.storageKey = originalKey;
        return result;
    }

    async GetFileName(databaseKey) {
        if (!this.preferencesService) return '';
        
        const databases = this.preferencesService.GetAvailableDatabases();
        const db = databases.find(d => d.key === databaseKey);
        return db ? db.name : '';
    }

    async CreateNewDatabase(name) {
        if (!this.preferencesService) return null;
        
        const key = await this.preferencesService.CreateNewDatabase(name);
        return key;
    }

    async ImportDatabaseFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const bytes = new Uint8Array(arrayBuffer);
                    let binaryString = '';
                    
                    for (let i = 0; i < bytes.length; i++) {
                        binaryString += String.fromCharCode(bytes[i]);
                    }
                    
                    const base64Data = btoa(binaryString);
                    const success = this.ImportDatabase(base64Data);
                    resolve(success);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    ExportDatabaseFile(fileName = 'database.db') {
        const base64Data = this.ExportDatabase();
        if (!base64Data) return false;

        try {
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const blob = new Blob([bytes], { type: 'application/x-sqlite3' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Failed to export database file:', error);
            return false;
        }
    }
}
