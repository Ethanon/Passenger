import { Passenger } from '../models/Passenger.js';
import { Note } from '../models/Note.js';
import { FileType } from '../constants/FileTypes.js';
import { ErrorLogger } from '../utils/ErrorLogger.js';

export class DatabaseService {
    constructor(driveService, preferencesService) {
        this.driveService = driveService;
        this.preferencesService = preferencesService;
        this.db = null;
        this.isInitialized = false;
    }

    async Initialize() {
        const jsSQL = await initSqlJs({
            locateFile: file => `lib/${file}`
        });

        const localBuffer = this.LoadFromLocalStorage();

        // No database anywhere - create empty
        if (!localBuffer && !this.preferencesService.HasDatabase()) {
            this.db = this.CreateEmptyDatabase(jsSQL);
        }
        // Need to merge
        else if (this.preferencesService.DatabaseRequiresSync()) {
            if (!localBuffer) throw new Error(`Database corruption: Local sequence ${this.preferencesService.localDBSequenceNumber} exists but database not found. Recovery: Clear localStorage and re-sync.`);
            await this.MergeDatabases(jsSQL, localBuffer);
        }
        // Sequences are same - use local (faster)
        else if (localBuffer && this.preferencesService.UseLocalDatabase()) {
            this.db = new jsSQL.Database(new Uint8Array(localBuffer));
        }
        else {
            // Cloud is newer - download it
            const dbFile = this.preferencesService.GetFile(FileType.DATABASE);
            const remoteBuffer = await this.driveService.DownloadDatabase(dbFile.id, dbFile.name);

            if (!remoteBuffer) throw new Error(`Database corruption: Cloud sequence ${this.preferencesService.serverDBSequenceNumber} exists but file ${dbFile.id} not found. Recovery: Clear browser data and create new DB, or restore backup.`);

            this.db = new jsSQL.Database(new Uint8Array(remoteBuffer))
        }

        this.isInitialized = true;
        this.UpdateSchema();
    }

    CreateEmptyDatabase(jsSQL) {
        var db = new jsSQL.Database();
        this.CreateSchema(db);
        return db;
    }

    CreateSchema(db) {
        const schema = `
            CREATE TABLE IF NOT EXISTS passengers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                display_order INTEGER NOT NULL,
                is_hidden INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                passenger_id INTEGER NOT NULL,
                note_date TEXT NOT NULL,
                time_of_day TEXT NOT NULL CHECK(time_of_day IN ('AM', 'PM')),
                note_text TEXT DEFAULT '',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (passenger_id) REFERENCES passengers(id),
                UNIQUE(passenger_id, note_date, time_of_day)
            );

            CREATE INDEX IF NOT EXISTS idx_notes_date ON notes(note_date);
            CREATE INDEX IF NOT EXISTS idx_notes_passenger ON notes(passenger_id);
        `;

        db.run(schema);
    }

    UpdateSchema() {
        // Implement schema migration logic here as needed
    }

    async ImportRecordsFromFile(arrayBuffer) {
        if (!this.isInitialized) return false;

        if (!this.driveService.IsValidSQLite(arrayBuffer)) return false;

        const jsSQL = await initSqlJs({ locateFile: file => `lib/${file}` });
        const importedDB = new jsSQL.Database(new Uint8Array(arrayBuffer));

        const passengerIdMap = new Map();

        const importedPassengers = importedDB.exec('SELECT * FROM passengers');
        if (importedPassengers.length > 0) {
            importedPassengers[0].values.forEach(row => {
                const [oldId, name, display_order, is_hidden, created_at] = row;

                const existingMatch = this.db.exec('SELECT id FROM passengers WHERE name = ?', [name]);

                if (existingMatch.length === 0) {
                    this.db.run(
                        'INSERT INTO passengers (name, display_order, is_hidden, created_at) VALUES (?, ?, ?, ?)',
                        [name, display_order, is_hidden, created_at]
                    );
                    const newId = this.db.exec('SELECT last_insert_rowid()')[0].values[0][0];
                    passengerIdMap.set(oldId, newId);
                } else {
                    passengerIdMap.set(oldId, existingMatch[0].values[0][0]);
                }
            });
        }

        const importedNotes = importedDB.exec('SELECT * FROM notes');
        if (importedNotes.length > 0) {
            importedNotes[0].values.forEach(row => {
                const [, old_passenger_id, note_date, time_of_day, note_text, created_at, updated_at] = row;

                const newPassengerId = passengerIdMap.get(old_passenger_id);
                if (!newPassengerId) return;

                const existingMatch = this.db.exec(
                    'SELECT updated_at FROM notes WHERE passenger_id = ? AND note_date = ? AND time_of_day = ?',
                    [newPassengerId, note_date, time_of_day]
                );

                if (existingMatch.length === 0) {
                    this.db.run(
                        'INSERT INTO notes (passenger_id, note_date, time_of_day, note_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                        [newPassengerId, note_date, time_of_day, note_text, created_at, updated_at]
                    );
                } else {
                    const localUpdatedAt = existingMatch[0].values[0][0];
                    if (updated_at > localUpdatedAt) {
                        this.db.run(
                            'UPDATE notes SET note_text = ?, updated_at = ? WHERE passenger_id = ? AND note_date = ? AND time_of_day = ?',
                            [note_text, updated_at, newPassengerId, note_date, time_of_day]
                        );
                    }
                }
            });
        }

        importedDB.close();
        this.PersistToLocalStorage();
        return true;
    }

    async MergeDatabases(jsSQL, localBuffer) {
        const localDB = new jsSQL.Database(new Uint8Array(localBuffer));

        const dbFile = this.preferencesService.GetFile(FileType.DATABASE);
        const remoteBuffer = await this.driveService.DownloadDatabase(dbFile.id, dbFile.name);

        if (!remoteBuffer) {
            this.db = localDB;
            return;
        }

        const remoteDB = new jsSQL.Database(new Uint8Array(remoteBuffer));

        this.db = localDB;

        const remotePassengers = remoteDB.exec('SELECT * FROM passengers');
        if (remotePassengers.length > 0) {
            remotePassengers[0].values.forEach(row => {
                const [, name, display_order, is_hidden, created_at] = row;

                const localMatch = this.db.exec(
                    'SELECT id FROM passengers WHERE name = ?',
                    [name]
                );

                if (localMatch.length === 0) {
                    this.db.run(
                        'INSERT INTO passengers (name, display_order, is_hidden, created_at) VALUES (?, ?, ?, ?)',
                        [name, display_order, is_hidden, created_at]
                    );
                }
            });
        }

        const remoteNotes = remoteDB.exec('SELECT * FROM notes');
        if (remoteNotes.length > 0) {
            remoteNotes[0].values.forEach(row => {
                const [, passenger_id, note_date, time_of_day, note_text, created_at, updated_at] = row;

                const localMatch = this.db.exec(
                    'SELECT updated_at FROM notes WHERE passenger_id = ? AND note_date = ? AND time_of_day = ?',
                    [passenger_id, note_date, time_of_day]
                );

                if (localMatch.length === 0) {
                    this.db.run(
                        'INSERT INTO notes (passenger_id, note_date, time_of_day, note_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                        [passenger_id, note_date, time_of_day, note_text, created_at, updated_at]
                    );
                } else {
                    const localUpdatedAt = localMatch[0].values[0][0];
                    if (updated_at > localUpdatedAt) {
                        this.db.run(
                            'UPDATE notes SET note_text = ?, updated_at = ? WHERE passenger_id = ? AND note_date = ? AND time_of_day = ?',
                            [note_text, updated_at, passenger_id, note_date, time_of_day]
                        );
                    }
                }
            });
        }
    }

    GetAllPassengers() {
        if (!this.isInitialized) return [];

        try {
            const result = this.db.exec('SELECT * FROM passengers ORDER BY display_order');
            return result.length > 0 
                ? result[0].values.map(row => Passenger.FromDatabaseRow({
                    id: row[0],
                    name: row[1],
                    display_order: row[2],
                    is_hidden: row[3],
                    created_at: row[4]
                }))
                : [];
        } catch (error) {
            ErrorLogger.Log('Database', 'Failed to get passengers', { error: error.message });
            return [];
        }
    }

    GetActivePassengers() {
        if (!this.isInitialized) return [];

        try {
            const result = this.db.exec('SELECT * FROM passengers WHERE is_hidden = 0 ORDER BY display_order');
            return result.length > 0 
                ? result[0].values.map(row => Passenger.FromDatabaseRow({
                    id: row[0],
                    name: row[1],
                    display_order: row[2],
                    is_hidden: row[3],
                    created_at: row[4]
                }))
                : [];
        } catch (error) {
            ErrorLogger.Log('Database', 'Failed to get active passengers', { error: error.message });
            return [];
        }
    }

    AddPassenger(name) {
        if (!this.isInitialized) return null;

        try {
            const maxOrder = this.db.exec('SELECT MAX(display_order) as max_order FROM passengers');
            const nextOrder = maxOrder.length > 0 && maxOrder[0].values[0][0] !== null 
                ? maxOrder[0].values[0][0] + 1 
                : 1;

            this.db.run('INSERT INTO passengers (name, display_order) VALUES (?, ?)', [name, nextOrder]);

            const result = this.db.exec('SELECT last_insert_rowid()');
            const passengerId = result[0].values[0][0];

            this.PersistToLocalStorage();

            return new Passenger(passengerId, name, nextOrder, false);
        } catch (error) {
            ErrorLogger.Log('Database', 'Failed to add passenger', { name, error: error.message });
            return null;
        }
    }

    UpdatePassenger(passenger) {
        if (!this.isInitialized) return false;

        try {
            this.db.run(
                'UPDATE passengers SET name = ?, display_order = ?, is_hidden = ? WHERE id = ?',
                [passenger.name, passenger.displayOrder, passenger.isHidden ? 1 : 0, passenger.id]
            );

            this.PersistToLocalStorage();

            return true;
        } catch (error) {
            ErrorLogger.Log('Database', 'Failed to update passenger', { passengerId, error: error.message });
            return false;
        }
    }

    GetNotesForDate(date, timeOfDay) {
        if (!this.isInitialized) return [];

        try {
            const result = this.db.exec(
                'SELECT * FROM notes WHERE note_date = ? AND time_of_day = ?',
                [date, timeOfDay]
            );
            
            return result.length > 0 
                ? result[0].values.map(row => Note.FromDatabaseRow({
                    id: row[0],
                    passenger_id: row[1],
                    note_date: row[2],
                    time_of_day: row[3],
                    note_text: row[4],
                    created_at: row[5],
                    updated_at: row[6]
                }))
                : [];
        } catch (error) {
            ErrorLogger.Log('Database', 'Failed to get notes', { date, timeOfDay, error: error.message });
            return [];
        }
    }

    SaveNote(passengerId, date, timeOfDay, noteText) {
        if (!this.isInitialized) return false;

        try {
            const updatedAt = new Date().toISOString();
            this.db.run(
                `INSERT INTO notes (passenger_id, note_date, time_of_day, note_text, updated_at)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(passenger_id, note_date, time_of_day)
                 DO UPDATE SET note_text = ?, updated_at = ?`,
                [passengerId, date, timeOfDay, noteText, updatedAt, noteText, updatedAt]
            );

            this.PersistToLocalStorage();

            return true;
        } catch (error) {
            ErrorLogger.Log('Database', 'Failed to save note', { passengerId, date, timeOfDay, error: error.message });
            return false;
        }
    }

    ExportDatabase() {
        if (!this.isInitialized) return new Uint8Array(0);

        try {
            return this.db.export();
        } catch (error) {
            ErrorLogger.Log('Database', 'Failed to export database', { error: error.message });
            return new Uint8Array(0);
        }
    }

    ExportNotesToCSV() {
        if (!this.isInitialized) return '';

        try {
            const query = `
                SELECT 
                    p.name as passenger_name,
                    n.note_date,
                    n.time_of_day,
                    n.note_text,
                    n.created_at,
                    n.updated_at
                FROM notes n
                JOIN passengers p ON n.passenger_id = p.id
                WHERE p.is_hidden = 0
                ORDER BY n.note_date DESC, n.time_of_day, p.display_order
            `;
            
            const result = this.db.exec(query);
            
            if (result.length === 0 || result[0].values.length === 0) {
                return 'Passenger Name,Date,Time of Day,Note,Created At,Updated At\n';
            }

            const rows = result[0].values;
            let csv = 'Passenger Name,Date,Time of Day,Note,Created At,Updated At\n';

            rows.forEach(row => {
                const escapedRow = row.map(field => {
                    if (field === null || field === undefined) return '';
                    const stringField = String(field);
                    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                        return `"${stringField.replace(/"/g, '""')}"`;
                    }
                    return stringField;
                });
                csv += escapedRow.join(',') + '\n';
            });

            return '\uFEFF' + csv;
        } catch (error) {
            ErrorLogger.Log('Database', 'Failed to export notes to CSV', { error: error.message });
            return '';
        }
    }

    PersistToLocalStorage() {
        if (!this.isInitialized) return;

        const storageKey = this.preferencesService.GetLocalDatabaseKey();
        const buffer = this.db.export();
        const bytes = new Uint8Array(buffer);
        let binaryString = '';

        for (let i = 0; i < bytes.length; i++) {
            binaryString += String.fromCharCode(bytes[i]);
        }

        const base64Data = btoa(binaryString);
        localStorage.setItem(storageKey, base64Data);

        this.preferencesService.IncrementDatabaseSequenceNumber();
    }

    LoadFromLocalStorage() {
        const storageKey = this.preferencesService.GetLocalDatabaseKey();
        const base64Data = localStorage.getItem(storageKey);
        if (!base64Data) return null;

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes.buffer;
    }

    Close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
        }
    }
}
