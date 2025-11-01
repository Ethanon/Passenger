export class PassengerList {
    constructor(noteService) {
        this.noteService = noteService;
        this.container = document.getElementById('passenger-list-container');
        this.currentDate = '';
        this.currentTrip = '';
        this.passengers = [];
    }

    Render(passengers, date, trip) {
        this.passengers = passengers;
        this.currentDate = date;
        this.currentTrip = trip;
        
        this.container.innerHTML = '';

        if (passengers.length === 0) {
            this.container.innerHTML = '<div class="empty-state">No passengers found. Click "Manage Passengers" to add some.</div>';
            return;
        }

        passengers.forEach(passenger => {
            const passengerCard = this.CreatePassengerCard(passenger);
            this.container.appendChild(passengerCard);
        });
    }

    CreatePassengerCard(passenger) {
        const card = document.createElement('div');
        card.className = 'passenger-card';
        card.dataset.passengerId = passenger.id;

        const nameLabel = document.createElement('label');
        nameLabel.className = 'passenger-name';
        nameLabel.textContent = passenger.name;
        nameLabel.setAttribute('for', `note-${passenger.id}`);

        const note = this.noteService.GetNoteForPassenger(passenger.id, this.currentDate, this.currentTrip);
        const noteText = note ? note.noteText : '';

        const textarea = document.createElement('textarea');
        textarea.id = `note-${passenger.id}`;
        textarea.className = 'note-input';
        textarea.value = noteText;
        textarea.placeholder = 'Enter notes...';
        textarea.rows = 3;

        textarea.addEventListener('input', (e) => {
            this.noteService.AutoSaveNote(
                passenger.id,
                this.currentDate,
                this.currentTrip,
                e.target.value
            );
        });

        card.appendChild(nameLabel);
        card.appendChild(textarea);

        return card;
    }

    UpdateNotes(date, trip) {
        this.currentDate = date;
        this.currentTrip = trip;

        this.passengers.forEach(passenger => {
            const textarea = document.getElementById(`note-${passenger.id}`);
            if (textarea) {
                const note = this.noteService.GetNoteForPassenger(passenger.id, date, trip);
                textarea.value = note ? note.noteText : '';
            }
        });
    }
}
