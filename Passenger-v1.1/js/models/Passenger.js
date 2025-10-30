export class Passenger {
    constructor(id, name, displayOrder, isHidden = false, createdAt = null) {
        this.id = id;
        this.name = name;
        this.displayOrder = displayOrder;
        this.isHidden = isHidden;
        this.createdAt = createdAt || new Date().toISOString();
    }

    static FromDatabaseRow(row) {
        return new Passenger(
            row.id,
            row.name,
            row.display_order,
            row.is_hidden === 1,
            row.created_at
        );
    }

    ToDatabaseRow() {
        return {
            id: this.id,
            name: this.name,
            display_order: this.displayOrder,
            is_hidden: this.isHidden ? 1 : 0,
            created_at: this.createdAt
        };
    }
}
