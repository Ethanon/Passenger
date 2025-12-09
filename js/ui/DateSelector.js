export class DateSelector {
    constructor(onDateChanged) {
        this.dateInput = document.getElementById('date-selector');
        this.prevButton = document.getElementById('prev-day-button');
        this.nextButton = document.getElementById('next-day-button');
        this.onDateChanged = onDateChanged;
        this.Initialize();
    }

    Initialize() {
        this.SetToday();
        this.dateInput.addEventListener('change', () => this.onDateChanged?.(this.GetSelectedDate()));
        this.prevButton?.addEventListener('click', () => this.ChangeDay(-1));
        this.nextButton?.addEventListener('click', () => this.ChangeDay(1));
    }

    ChangeDay(offset) {
        const [year, month, day] = this.dateInput.value.split('-').map(Number);
        const currentDate = new Date(year, month - 1, day);
        currentDate.setDate(currentDate.getDate() + offset);
        this.dateInput.value = currentDate.toLocaleDateString('en-CA');
        if (this.onDateChanged) {
            this.onDateChanged(this.GetSelectedDate());
        }
    }

    SetToday() {
        const today = new Date().toLocaleDateString('en-CA');        
        this.dateInput.value = today;
    }

    GetSelectedDate() {
        return this.dateInput.value;
    }

    SetDate(date) {
        this.dateInput.value = date;
    }
}