/**
 * Utility functions for creating DOM elements
 */
export class DOMHelpers {
    /**
     * Creates a button element
     * @param {string} text - Button text
     * @param {string} className - CSS class name(s)
     * @param {Function} onClick - Click handler
     * @returns {HTMLButtonElement}
     */
    static createButton(text, className, onClick = null) {
        const button = document.createElement('button');
        button.className = className;
        button.textContent = text;
        if (onClick) {
            button.addEventListener('click', onClick);
        }
        return button;
    }

    /**
     * Creates a section with title
     * @param {string} title - Section title
     * @param {string} titleClassName - CSS class for title
     * @param {string} sectionClassName - CSS class for section
     * @returns {Object} Object containing section and title elements
     */
    static createSection(title, titleClassName = 'settings-section-title', sectionClassName = 'settings-section') {
        const section = document.createElement('div');
        section.className = sectionClassName;

        const titleElement = document.createElement('h3');
        titleElement.className = titleClassName;
        titleElement.textContent = title;

        section.appendChild(titleElement);

        return { section, title: titleElement };
    }

    /**
     * Creates a subsection with title
     * @param {string} title - Subsection title
     * @returns {Object} Object containing subsection and title elements
     */
    static createSubsection(title) {
        const subsection = document.createElement('div');
        subsection.className = 'settings-subsection';

        const titleElement = document.createElement('h4');
        titleElement.className = 'settings-subsection-title';
        titleElement.textContent = title;

        subsection.appendChild(titleElement);

        return { subsection, title: titleElement };
    }

    /**
     * Creates a horizontal divider
     * @returns {HTMLHRElement}
     */
    static createDivider() {
        const divider = document.createElement('hr');
        divider.className = 'settings-divider';
        return divider;
    }

    /**
     * Creates a text element (p, span, div, etc.)
     * @param {string} tag - HTML tag name
     * @param {string} text - Text content
     * @param {string} className - CSS class name(s)
     * @returns {HTMLElement}
     */
    static createText(tag, text, className = '') {
        const element = document.createElement(tag);
        if (className) {
            element.className = className;
        }
        element.textContent = text;
        return element;
    }

    /**
     * Creates a container div with optional class
     * @param {string} className - CSS class name(s)
     * @returns {HTMLDivElement}
     */
    static createContainer(className = '') {
        const container = document.createElement('div');
        if (className) {
            container.className = className;
        }
        return container;
    }

    /**
     * Creates a button grid container
     * @returns {HTMLDivElement}
     */
    static createButtonGrid() {
        return this.createContainer('settings-button-grid');
    }

    /**
     * Appends multiple children to a parent element
     * @param {HTMLElement} parent - Parent element
     * @param {...HTMLElement} children - Child elements to append
     */
    static appendChildren(parent, ...children) {
        children.forEach(child => {
            if (child) {
                parent.appendChild(child);
            }
        });
    }
}
