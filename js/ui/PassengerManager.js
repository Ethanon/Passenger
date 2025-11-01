import { Dialog } from './Dialog.js';

export class PassengerManager {
    constructor(passengerService, dataStoreService, onPassengersChanged) {
        this.passengerService = passengerService;
        this.dataStoreService = dataStoreService;
        this.onPassengersChanged = onPassengersChanged;
        this.modal = document.getElementById('passenger-manager-modal');
        this.listContainer = document.getElementById('passenger-manager-list');
        this.showHiddenMode = false;
        this.dialog = new Dialog();
        this.Initialize();
    }

    Initialize() {
        document.getElementById('manage-passengers-button').addEventListener('click', () => this.Show());
        document.getElementById('close-modal').addEventListener('click', () => this.Hide());
        document.getElementById('add-passenger-button').addEventListener('click', () => this.AddPassenger());
        document.getElementById('show-hidden-button').addEventListener('click', () => this.ToggleHiddenPassengers());
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.Hide();
            }
        });
    }

    Show() {
        this.showHiddenMode = false;
        document.getElementById('show-hidden-button').textContent = 'Show Hidden Passengers';
        this.Render();
        this.modal.classList.remove('hidden');
    }

    Hide() {
        this.modal.classList.add('hidden');
        if (this.onPassengersChanged) {
            this.onPassengersChanged();
        }
    }

    Render() {
        const passengers = this.showHiddenMode 
            ? this.passengerService.GetHiddenPassengers()
            : this.passengerService.GetActivePassengers();

        this.listContainer.innerHTML = '';

        if (passengers.length === 0) {
            const emptyMessage = this.showHiddenMode 
                ? 'No hidden passengers'
                : 'No active passengers. Click "Add New Passenger" to get started.';
            this.listContainer.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
            return;
        }

        passengers.forEach(passenger => {
            const item = this.CreatePassengerItem(passenger);
            this.listContainer.appendChild(item);
        });
    }

    CreatePassengerItem(passenger) {
        const item = document.createElement('div');
        item.className = 'passenger-manager-item';
        item.dataset.passengerId = passenger.id;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'passenger-manager-name';
        nameSpan.textContent = passenger.name;

        const controls = document.createElement('div');
        controls.className = 'passenger-manager-controls';

        if (this.showHiddenMode) {
            const unhideButton = document.createElement('button');
            unhideButton.className = 'control-button';
            unhideButton.textContent = 'Unhide';
            unhideButton.addEventListener('click', () => this.UnhidePassenger(passenger.id));
            controls.appendChild(unhideButton);
        } else {
            const upButton = document.createElement('button');
            upButton.className = 'control-button';
            upButton.textContent = '↑';
            upButton.addEventListener('click', () => this.MoveUp(passenger.id));
            
            const downButton = document.createElement('button');
            downButton.className = 'control-button';
            downButton.textContent = '↓';
            downButton.addEventListener('click', () => this.MoveDown(passenger.id));
            
            const hideButton = document.createElement('button');
            hideButton.className = 'control-button danger';
            hideButton.textContent = 'Hide';
            hideButton.addEventListener('click', () => this.HidePassenger(passenger.id));

            controls.appendChild(upButton);
            controls.appendChild(downButton);
            controls.appendChild(hideButton);
        }

        item.appendChild(nameSpan);
        item.appendChild(controls);

        return item;
    }

    async AddPassenger() {
        const name = await this.dialog.Prompt('Enter passenger name:');
        if (name) {
            const passenger = this.passengerService.AddPassenger(name);
            if (passenger) {
                this.dataStoreService.TriggerSync();
                this.Render();
            } else {
                console.error('Failed to add passenger');
            }
        }
    }

    async HidePassenger(passengerId) {
        const confirmed = await this.dialog.Confirm('Hide this passenger? Their notes will be preserved.');
        if (confirmed) {
            const success = this.passengerService.HidePassenger(passengerId);
            if (success) {
                this.dataStoreService.TriggerSync();
                this.Render();
            } else {
                console.error('Failed to hide passenger');
            }
        }
    }

    UnhidePassenger(passengerId) {
        const success = this.passengerService.UnhidePassenger(passengerId);
        if (success) {
            this.dataStoreService.TriggerSync();
            this.Render();
        } else {
            console.error('Failed to unhide passenger');
        }
    }

    MoveUp(passengerId) {
        const success = this.passengerService.MovePassengerUp(passengerId);
        if (success) {
            this.dataStoreService.TriggerSync();
            this.Render();
        } else {
            console.error('Failed to move passenger up');
        }
    }

    MoveDown(passengerId) {
        const success = this.passengerService.MovePassengerDown(passengerId);
        if (success) {
            this.dataStoreService.TriggerSync();
            this.Render();
        } else {
            console.error('Failed to move passenger down');
        }
    }

    ToggleHiddenPassengers() {
        this.showHiddenMode = !this.showHiddenMode;
        document.getElementById('show-hidden-button').textContent = this.showHiddenMode 
            ? 'Show Active Passengers'
            : 'Show Hidden Passengers';
        this.Render();
    }
}
