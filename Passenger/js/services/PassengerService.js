export class PassengerService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }

    GetActivePassengers() {
        return this.databaseService.GetActivePassengers();
    }

    GetAllPassengers() {
        return this.databaseService.GetAllPassengers();
    }

    GetHiddenPassengers() {
        return this.databaseService.GetAllPassengers().filter(p => p.isHidden);
    }

    AddPassenger(name) {
        if (!name || name.trim() === '') return null;
        return this.databaseService.AddPassenger(name.trim());
    }

    HidePassenger(passengerId) {
        const passengers = this.databaseService.GetAllPassengers();
        const passenger = passengers.find(p => p.id === passengerId);
        
        if (!passenger) return false;

        passenger.isHidden = true;
        return this.databaseService.UpdatePassenger(passenger);
    }

    UnhidePassenger(passengerId) {
        const passengers = this.databaseService.GetAllPassengers();
        const passenger = passengers.find(p => p.id === passengerId);
        
        if (!passenger) return false;

        passenger.isHidden = false;
        return this.databaseService.UpdatePassenger(passenger);
    }

    ReorderPassengers(passengerIds) {
        if (!passengerIds || passengerIds.length === 0) return false;

        const passengers = this.databaseService.GetAllPassengers();
        let success = true;

        passengerIds.forEach((id, index) => {
            const passenger = passengers.find(p => p.id === id);
            if (passenger) {
                passenger.displayOrder = index + 1;
                if (!this.databaseService.UpdatePassenger(passenger)) {
                    success = false;
                }
            }
        });

        return success;
    }

    MovePassengerUp(passengerId) {
        const passengers = this.GetActivePassengers();
        const currentIndex = passengers.findIndex(p => p.id === passengerId);
        
        if (currentIndex <= 0) return false;

        const currentPassenger = passengers[currentIndex];
        const previousPassenger = passengers[currentIndex - 1];

        const tempOrder = currentPassenger.displayOrder;
        currentPassenger.displayOrder = previousPassenger.displayOrder;
        previousPassenger.displayOrder = tempOrder;

        return this.databaseService.UpdatePassenger(currentPassenger) && 
               this.databaseService.UpdatePassenger(previousPassenger);
    }

    MovePassengerDown(passengerId) {
        const passengers = this.GetActivePassengers();
        const currentIndex = passengers.findIndex(p => p.id === passengerId);
        
        if (currentIndex < 0 || currentIndex >= passengers.length - 1) return false;

        const currentPassenger = passengers[currentIndex];
        const nextPassenger = passengers[currentIndex + 1];

        const tempOrder = currentPassenger.displayOrder;
        currentPassenger.displayOrder = nextPassenger.displayOrder;
        nextPassenger.displayOrder = tempOrder;

        return this.databaseService.UpdatePassenger(currentPassenger) && 
               this.databaseService.UpdatePassenger(nextPassenger);
    }
}
