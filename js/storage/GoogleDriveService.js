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
        this.multipartBoundary = '-------314159265358979323846';
        this.sqliteMimeType = 'application/octet-stream';
        this.jsonMimeType = 'application/json';
        this.csvMimeType = 'text/csv';
        this.folderMimeType = 'application/vnd.google-apps.folder';
    }

    async AuthenticatedFetch(url, options = {}) {
        const token = await this.authService.GetAccessToken();
        if (!token) {
            console.error('GoogleDrive: No access token');
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
            console.error('GoogleDrive: Folder creation failed', createResponse.status);
            return false;
        }
        const createData = await createResponse.json();
        this.folderId = createData.id;
        return true;
    }

    async FindFileInFolder(name) {
        await this.EnsureFolderExists();
        if (!this.folderId) return null;

        const query = `name='${name}' and '${this.folderId}' in parents and trashed=false`;
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
            console.error('GoogleDrive: Invalid SQLite file', { fileId, size: buffer.byteLength });
            return null;
        }

        return buffer;
    }

    ArrayBufferToBase64(buffer) {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }

    BuildMultipartBody(boundary, metadata, buffer) {
        return `\r\n--${boundary}\r\n` +
               `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\n` +
               `Content-Type: application/octet-stream\r\nContent-Transfer-Encoding: base64\r\n\r\n` +
               `${this.ArrayBufferToBase64(buffer)}\r\n--${boundary}--`;
    }

    async UploadFile(content, fileName, mimeType, fileId = null, isBuffer = false) {
        await this.EnsureFolderExists();
        if (!this.folderId) return false;

        const metadata = {
            name: fileName,
            mimeType: mimeType,
            parents: [this.folderId]
        };

        let response;
        if (isBuffer) {
            response = await this.AuthenticatedFetch(
                `${this.driveUploadBase}${fileId ? `/${fileId}` : ''}?uploadType=multipart`,
                {
                    method: fileId ? 'PATCH' : 'POST',
                    headers: { 'Content-Type': `multipart/related; boundary=${this.multipartBoundary}` },
                    body: this.BuildMultipartBody(this.multipartBoundary, metadata, content)
                }
            );
        } else {
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: this.jsonMimeType }));
            form.append('file', new Blob([content], { type: mimeType }));

            response = await this.AuthenticatedFetch(
                `${this.driveUploadBase}${fileId ? `/${fileId}` : ''}?uploadType=multipart`,
                {
                    method: fileId ? 'PATCH' : 'POST',
                    body: form
                }
            );
        }

        return response?.ok || false;
    }

    async UploadDatabase(databaseBuffer, fileId = null) {
        return await this.UploadFile(databaseBuffer, this.databaseFileName, this.sqliteMimeType, fileId, true);
    }

    async SyncDatabase(databaseBuffer) {
        return await this.UploadDatabase(databaseBuffer);
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
