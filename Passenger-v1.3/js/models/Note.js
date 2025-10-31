export class Note {
    constructor(id, passengerId, noteDate, timeOfDay, noteText = '', createdAt = null, updatedAt = null) {
        this.id = id;
        this.passengerId = passengerId;
        this.noteDate = noteDate;
        this.timeOfDay = timeOfDay;
        this.noteText = noteText;
        this.createdAt = createdAt || new Date().toISOString();
        this.updatedAt = updatedAt || new Date().toISOString();
    }

    static FromDatabaseRow(row) {
        return new Note(
            row.id,
            row.passenger_id,
            row.note_date,
            row.time_of_day,
            row.note_text || '',
            row.created_at,
            row.updated_at
        );
    }

    ToDatabaseRow() {
        return {
            id: this.id,
            passenger_id: this.passengerId,
            note_date: this.noteDate,
            time_of_day: this.timeOfDay,
            note_text: this.noteText,
            created_at: this.createdAt,
            updated_at: this.updatedAt
        };
    }
}
