export class DateSelector {
    constructor(onDateChanged) {
        this.dateInput = document.getElementById('date-selector');
        this.onDateChanged = onDateChanged;
        this.Initialize();
    }

    Initialize() {
        this.SetToday();
        this.dateInput.addEventListener('change', () => {
            if (this.onDateChanged) {
                this.onDateChanged(this.GetSelectedDate());
            }
        });
    }

    SetToday() {
        const today = new Date().toISOString().split('T')[0];
        this.dateInput.value = today;
    }

    GetSelectedDate() {
        return this.dateInput.value;
    }

    SetDate(date) {
        this.dateInput.value = date;
    }
}
