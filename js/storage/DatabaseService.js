import { Passenger } from '../models/Passenger.js';
import { Note } from '../models/Note.js';

export class DatabaseService {
    constructor(driveService, preferencesService) {
        this.driveService = driveService;
        this.preferencesService = preferencesService;
        this.db = null;
        this.isInitialized = false;
    }

    async Initialize() {
        try {

            // init a local database instance
            const jsSQL = await initSqlJs({
                locateFile: file => `lib/${file}`
            });

            if(!this.preferencesService.HasDatabase()){
                this.db = this.CreateEmptyDatabase(jsSQL);
                this.isInitialized = true;
                return;
            }
            
            if (this.preferencesService.DatabaseRequiresSync()) {
                // TODO: handle sync before initialization
            }

            // assuming the sync is done, and now we can just load the remote database
            // try to download an existing databases
            const dbFileId = this.preferencesService.GetDatabaseFileId();
            const dbFileName = this.preferencesService.GetDatabaseFileName();
            const databaseBuffer = await this.driveService.DownloadDatabase(dbFileId, dbFileName);

            this.db = databaseBuffer ?
                new SQL.Database(new Uint8Array(databaseBuffer)) :
                this.CreateEmptyDatabase(jsSQL);

            // perform any necessary schema updates
            this.UpdateSchema();
            this.isInitialized = true;

        } catch (error) {
            console.error('Database initialization failed:', error);
            this.isInitialized = false;
        }
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
            console.error('Failed to get passengers:', error);
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
            console.error('Failed to get active passengers:', error);
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
            
            return new Passenger(passengerId, name, nextOrder, false);
        } catch (error) {
            console.error('Failed to add passenger:', error);
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
            return true;
        } catch (error) {
            console.error('Failed to update passenger:', error);
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
            console.error('Failed to get notes:', error);
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
            return true;
        } catch (error) {
            console.error('Failed to save note:', error);
            return false;
        }
    }

    ExportDatabase() {
        if (!this.isInitialized) return new Uint8Array(0);

        try {
            return this.db.export();
        } catch (error) {
            console.error('Failed to export database:', error);
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
            console.error('Failed to export notes to CSV:', error);
            return '';
        }
    }

    Close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
        }
    }
}
