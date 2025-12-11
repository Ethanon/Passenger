import { ErrorLogger } from '../utils/ErrorLogger.js';

export class GoogleDriveService {
    constructor(authService) {
        this.authService = authService;
        this.folderId = null;
        this.databaseFileId = null;
        this.folderName = 'BusPassengerNotes';
        this.databaseFileName = 'passengers.db';
        this.preferencesFileName = 'preferences.json';
        this.driveApiBase = 'https://www.googleapis.com/drive/v3/files';
        this.driveUploadBase = 'https://www.googleapis.com/upload/drive/v3/files';
        this.sqliteMimeType = 'application/octet-stream';
        this.jsonMimeType = 'application/json';
        this.csvMimeType = 'text/csv';
        this.folderMimeType = 'application/vnd.google-apps.folder';
    }

    async AuthenticatedFetch(url, options = {}) {
        const token = await this.authService.GetAccessToken();
        if (!token) {
            ErrorLogger.Log('GoogleDrive', 'No access token available', { url });
            return null;
        }

        return await fetch(url, {
            ...options,
            headers: { 'Authorization': `Bearer ${token}`, ...options.headers }
        });
    }

    async EnsureFolderExists() {
        const token = await this.authService.GetAccessToken();
        if (!token) return false;

        const query = `name='${this.folderName}' and mimeType='${this.folderMimeType}' and trashed=false`;
        const searchResponse = await this.AuthenticatedFetch(
            `${this.driveApiBase}?q=${encodeURIComponent(query)}&spaces=drive`
        );

        if (!searchResponse?.ok) return false;
        const searchData = await searchResponse.json();
        
        if (searchData.files?.length > 0) {
            this.folderId = searchData.files[0].id;
            return true;
        }

        const createResponse = await this.AuthenticatedFetch(
            this.driveApiBase,
            {
                method: 'POST',
                headers: { 'Content-Type': this.jsonMimeType },
                body: JSON.stringify({
                    name: this.folderName,
                    mimeType: this.folderMimeType
                })
            }
        );

        if (!createResponse?.ok) {
            ErrorLogger.Log('GoogleDrive', 'Folder creation failed', { status: createResponse.status });
            return false;
        }
        const createData = await createResponse.json();
        this.folderId = createData.id;
        return true;
    }

    async FindFileInFolder(name) {
        await this.EnsureFolderExists();
        if (!this.folderId) return null;

        const query =
            `name='${name}' and ` +
            `'${this.folderId}' in parents and ` +
            `appProperties has { key='app' and value='BusPassengerNotes' } and ` +
            `trashed=false`;

        const response = await this.AuthenticatedFetch(
            `${this.driveApiBase}?q=${encodeURIComponent(query)}&spaces=drive&fields=files(id,name)`
        );

        if (!response?.ok) return null;
        const data = await response.json();
        return data.files?.[0]?.id || null;
    }

    async DownloadFile(fileId) {
        const response = await this.AuthenticatedFetch(
            `${this.driveApiBase}/${fileId}?alt=media`
        );
        
        return response?.ok ? await response.arrayBuffer() : null;
    }

    async DownloadTextFile(fileId) {
        const response = await this.AuthenticatedFetch(
            `${this.driveApiBase}/${fileId}?alt=media`
        );
        
        return response?.ok ? await response.text() : null;
    }

    IsValidSQLite(buffer) {
        const bytes = new Uint8Array(buffer);
        return bytes.length >= 16 && String.fromCharCode(...bytes.slice(0, 16)).startsWith('SQLite format 3');
    }

    async DownloadDatabase(databaseFileId, databaseFileName) {
        const token = await this.authService.GetAccessToken();
        if (!token) return null;

        var buffer = await this.DownloadFile(databaseFileId);
        if (!buffer) {
            const fileId = await this.FindFileInFolder(databaseFileName);
            if (!fileId) return null;
            buffer = await this.DownloadFile(fileId);
            if (!buffer) return null;
        }

        if (!this.IsValidSQLite(buffer)) {
            ErrorLogger.Log('GoogleDrive', 'Invalid SQLite file downloaded', { fileId: databaseFileId, size: buffer.byteLength });
            return null;
        }

        return buffer;
    }

    async UploadFile(content, fileName, mimeType, fileId = null) {
        await this.EnsureFolderExists();
        if (!this.folderId) return false;

        if(fileId) {
            const id = await this.FindFileInFolder(fileName);
            if (!id) fileId = null;
            else fileId = id;
        }

        const metadata = {
            name: fileName,
            mimeType: mimeType,
            appProperties: {
                app: 'BusPassengerNotes'
            }
        };

        if (this.folderId && !fileId) {
            metadata.parents = [this.folderId];
        }

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: this.jsonMimeType }));
        form.append('file', new Blob([content], { type: mimeType }));

        const response = await this.AuthenticatedFetch(
            `${this.driveUploadBase}${fileId ? `/${fileId}` : ''}?uploadType=multipart`,
            {
                method: fileId ? 'PATCH' : 'POST',
                body: form
            }
        );

        if (!response?.ok) {
            let err = null;
            try { err = await response.json(); } catch {}
            ErrorLogger.Log('GoogleDrive', `Upload failed: ${fileName}`, { status: response.status, error: err });
        }

        return response?.ok || false;
    }

    async UploadDatabase(databaseBuffer, fileName, fileId = null) {
        return await this.UploadFile(databaseBuffer, fileName, this.sqliteMimeType, fileId);
    }

    async UploadJsonFile(content, fileName, fileId = null) {
        return await this.UploadFile(content, fileName, this.jsonMimeType, fileId);
    }

    async UploadCsvFile(content, fileName, fileId = null) {
        return await this.UploadFile(content, fileName, this.csvMimeType, fileId);
    }

    async ListDatabaseFiles() {
        const response = await this.AuthenticatedFetch(
            `${this.driveApiBase}?q=mimeType='application/x-sqlite3' or name contains '.db'&fields=files(id,name,modifiedTime,owners)`
        );

        if (!response?.ok) return [];
        const data = await response.json();
        return data.files || [];
    }

    async GetFileName(fileId) {
        const response = await this.AuthenticatedFetch(
            `${this.driveApiBase}/${fileId}?fields=name`
        );

        if (!response?.ok) return '';
        const data = await response.json();
        return data.name || '';
    }
}
