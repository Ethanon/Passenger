export class TripSelector {
    constructor(onTripChanged) {
        this.amButton = document.getElementById('am-button');
        this.pmButton = document.getElementById('pm-button');
        this.onTripChanged = onTripChanged;
        this.currentTrip = 'AM';
        this.Initialize();
    }

    Initialize() {
        this.amButton.addEventListener('click', () => this.SelectTrip('AM'));
        this.pmButton.addEventListener('click', () => this.SelectTrip('PM'));
    }

    SelectTrip(trip) {
        this.currentTrip = trip;
        
        if (trip === 'AM') {
            this.amButton.classList.add('active');
            this.pmButton.classList.remove('active');
        } else {
            this.pmButton.classList.add('active');
            this.amButton.classList.remove('active');
        }

        if (this.onTripChanged) {
            this.onTripChanged(trip);
        }
    }

    GetCurrentTrip() {
        return this.currentTrip;
    }
}
