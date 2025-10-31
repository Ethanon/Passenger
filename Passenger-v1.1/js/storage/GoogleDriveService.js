export class GoogleDriveService {
    constructor(authService) {
        this.authService = authService;
        this.folderId = null;
        this.databaseFileId = null;
        this.folderName = 'BusPassengerNotes';
        this.databaseFileName = 'passengers.db';
    }

    async EnsureFolderExists() {
        const token = await this.authService.GetAccessToken();
        if (!token) return false;

        try {
            const query = `name='${this.folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
            const searchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (!searchResponse.ok) {
                console.error('Folder search failed:', searchResponse.status);
                return false;
            }

            const searchData = await searchResponse.json();
            
            if (searchData.files && searchData.files.length > 0) {
                this.folderId = searchData.files[0].id;
                return true;
            }

            const createResponse = await fetch(
                'https://www.googleapis.com/drive/v3/files',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: this.folderName,
                        mimeType: 'application/vnd.google-apps.folder'
                    })
                }
            );

            if (!createResponse.ok) {
                console.error('Folder creation failed:', createResponse.status);
                return false;
            }

            const createData = await createResponse.json();
            this.folderId = createData.id;
            return true;
        } catch (error) {
            console.error('Failed to ensure folder exists:', error);
            return false;
        }
    }

    async FindDatabaseFile() {
        const token = await this.authService.GetAccessToken();
        if (!token) return null;

        await this.EnsureFolderExists();
        if (!this.folderId) return null;

        try {
            const query = `name='${this.databaseFileName}' and '${this.folderId}' in parents and trashed=false`;
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&fields=files(id,name)`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (!response.ok) {
                console.error('Database file search failed:', response.status);
                return null;
            }

            const data = await response.json();
            
            if (data.files && data.files.length > 0) {
                this.databaseFileId = data.files[0].id;
                console.log('Found database file:', this.databaseFileId);
                return this.databaseFileId;
            }

            console.log('No database file found in folder');
            return null;
        } catch (error) {
            console.error('Failed to find database file:', error);
            return null;
        }
    }

    async DownloadDatabase() {
        const token = await this.authService.GetAccessToken();
        if (!token) return null;

        await this.EnsureFolderExists();
        const fileId = await this.FindDatabaseFile();
        
        if (!fileId) return null;

        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (!response.ok) return null;

            const arrayBuffer = await response.arrayBuffer();
            return arrayBuffer;
        } catch (error) {
            console.error('Failed to download database:', error);
            return null;
        }
    }

    async UploadDatabase(databaseBuffer) {
        const token = await this.authService.GetAccessToken();
        if (!token) return false;

        await this.EnsureFolderExists();
        
        try {
            const metadata = {
                name: this.databaseFileName,
                mimeType: 'application/x-sqlite3',
                parents: [this.folderId]
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([databaseBuffer], { type: 'application/x-sqlite3' }));

            const fileId = await this.FindDatabaseFile();
            const url = fileId
                ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
                : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

            const method = fileId ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: form
            });

            if (!response.ok) return false;

            const data = await response.json();
            this.databaseFileId = data.id;
            return true;
        } catch (error) {
            console.error('Failed to upload database:', error);
            return false;
        }
    }

    async SyncDatabase(databaseBuffer) {
        return await this.UploadDatabase(databaseBuffer);
    }

    async FindPreferencesFile() {
        const token = await this.authService.GetAccessToken();
        if (!token || !this.folderId) return null;

        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='preferences.json' and '${this.folderId}' in parents and trashed=false`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            const data = await response.json();
            return data.files && data.files.length > 0 ? data.files[0].id : null;
        } catch (error) {
            console.error('Failed to find preferences file:', error);
            return null;
        }
    }

    async DownloadPreferences(fileId) {
        const token = await this.authService.GetAccessToken();
        if (!token) return null;

        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (!response.ok) return null;
            return await response.text();
        } catch (error) {
            console.error('Failed to download preferences:', error);
            return null;
        }
    }

    async UploadPreferences(content, fileId = null) {
        const token = await this.authService.GetAccessToken();
        if (!token) return false;

        await this.EnsureFolderExists();

        try {
            const metadata = {
                name: 'preferences.json',
                mimeType: 'application/json',
                parents: [this.folderId]
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([content], { type: 'application/json' }));

            const url = fileId
                ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
                : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

            const method = fileId ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: form
            });

            return response.ok;
        } catch (error) {
            console.error('Failed to upload preferences:', error);
            return false;
        }
    }

    async ListDatabaseFiles() {
        const token = await this.authService.GetAccessToken();
        if (!token) return [];

        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=mimeType='application/x-sqlite3' or name contains '.db'&fields=files(id,name,modifiedTime,owners)`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            const data = await response.json();
            return data.files || [];
        } catch (error) {
            console.error('Failed to list database files:', error);
            return [];
        }
    }

    async DownloadDatabaseById(fileId) {
        const token = await this.authService.GetAccessToken();
        if (!token) return null;

        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (!response.ok) return null;

            const arrayBuffer = await response.arrayBuffer();
            return arrayBuffer;
        } catch (error) {
            console.error('Failed to download database by ID:', error);
            return null;
        }
    }

    async GetFileName(fileId) {
        const token = await this.authService.GetAccessToken();
        if (!token) return '';

        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (!response.ok) return '';

            const data = await response.json();
            return data.name || '';
        } catch (error) {
            console.error('Failed to get file name:', error);
            return '';
        }
    }
}
