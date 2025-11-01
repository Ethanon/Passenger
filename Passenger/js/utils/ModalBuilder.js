export class ModalBuilder {
    constructor() {
        this.modal = null;
    }

    /**
     * Creates a modal with standard structure
     * @param {Object} options - Configuration options
     * @param {string} options.title - Modal title
     * @param {Function} options.onClose - Callback when modal is closed
     * @param {string} options.bodyId - Optional ID for the modal body
     * @returns {Object} Object containing modal element and body element
     */
    Create(options = {}) {
        const { title = 'Modal', onClose = null, bodyId = null } = options;

        // Create modal overlay
        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        
        // Create modal content container
        const content = document.createElement('div');
        content.className = 'modal-content';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'modal-header';
        
        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        
        const closeButton = document.createElement('button');
        closeButton.className = 'close-button';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => {
            this.Hide();
            if (onClose) onClose();
        });
        
        header.appendChild(titleElement);
        header.appendChild(closeButton);
        
        // Create body
        const body = document.createElement('div');
        body.className = 'modal-body';
        if (bodyId) {
            body.id = bodyId;
        }
        
        // Assemble modal
        content.appendChild(header);
        content.appendChild(body);
        this.modal.appendChild(content);
        
        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.Hide();
                if (onClose) onClose();
            }
        });
        
        return {
            modal: this.modal,
            body: body
        };
    }

    /**
     * Shows the modal by appending it to the document body
     */
    Show() {
        if (this.modal && !document.body.contains(this.modal)) {
            document.body.appendChild(this.modal);
        }
    }

    /**
     * Hides and removes the modal from the DOM
     */
    Hide() {
        if (this.modal && document.body.contains(this.modal)) {
            document.body.removeChild(this.modal);
        }
    }

    /**
     * Gets the modal element
     * @returns {HTMLElement|null}
     */
    GetModal() {
        return this.modal;
    }
}
