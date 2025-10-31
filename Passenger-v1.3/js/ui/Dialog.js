export class Dialog {
    constructor() {
        this.overlay = null;
        this.dialog = null;
        this.resolveCallback = null;
    }

    CreateOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'dialog-overlay';
        
        this.dialog = document.createElement('div');
        this.dialog.className = 'dialog-box';
        
        this.overlay.appendChild(this.dialog);
        document.body.appendChild(this.overlay);
    }

    Close(result) {
        if (this.overlay) {
            document.body.removeChild(this.overlay);
            this.overlay = null;
            this.dialog = null;
        }
        
        if (this.resolveCallback) {
            this.resolveCallback(result);
            this.resolveCallback = null;
        }
    }

    Confirm(message) {
        return new Promise((resolve) => {
            this.resolveCallback = resolve;
            this.CreateOverlay();

            const messageEl = document.createElement('p');
            messageEl.className = 'dialog-message';
            messageEl.textContent = message;

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'dialog-buttons';

            const cancelButton = document.createElement('button');
            cancelButton.className = 'dialog-button dialog-button-cancel';
            cancelButton.textContent = 'Cancel';
            cancelButton.addEventListener('click', () => this.Close(false));

            const confirmButton = document.createElement('button');
            confirmButton.className = 'dialog-button dialog-button-confirm';
            confirmButton.textContent = 'Confirm';
            confirmButton.addEventListener('click', () => this.Close(true));

            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(confirmButton);

            this.dialog.appendChild(messageEl);
            this.dialog.appendChild(buttonContainer);

            confirmButton.focus();
        });
    }

    Prompt(message, defaultValue = '') {
        return new Promise((resolve) => {
            this.resolveCallback = resolve;
            this.CreateOverlay();

            const messageEl = document.createElement('p');
            messageEl.className = 'dialog-message';
            messageEl.textContent = message;

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'dialog-input';
            input.value = defaultValue;
            input.placeholder = 'Enter value...';
            input.autocomplete = 'off';

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'dialog-buttons';

            const cancelButton = document.createElement('button');
            cancelButton.className = 'dialog-button dialog-button-cancel';
            cancelButton.textContent = 'Cancel';
            cancelButton.addEventListener('click', () => this.Close(null));

            const okButton = document.createElement('button');
            okButton.className = 'dialog-button dialog-button-confirm';
            okButton.textContent = 'OK';
            okButton.addEventListener('click', () => {
                const value = input.value.trim();
                this.Close(value || null);
            });

            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(okButton);

            this.dialog.appendChild(messageEl);
            this.dialog.appendChild(input);
            this.dialog.appendChild(buttonContainer);

            input.focus();
            input.select();

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const value = input.value.trim();
                    this.Close(value || null);
                }
            });
        });
    }
}
