/**
 * Minimal shared utilities - Only used functions
 * Tree-shaken version to reduce bundle size
 */

/**
 * Validation utility functions - Core only
 */
export class ValidationUtils {
    /**
     * Color classes for duplicate name highlighting
     */
    private static readonly DUPLICATE_ERROR_CLASSES = [
        'name-duplicate-error-1',
        'name-duplicate-error-2',
        'name-duplicate-error-3',
        'name-duplicate-error-4',
        'name-duplicate-error-5'
    ];

    /**
     * Clear all duplicate error classes from name inputs
     */
    static clearDuplicateErrors(playerRows: Element[]): void {
        playerRows.forEach(row => {
            const nameInput = row.querySelector('.player-name') as HTMLInputElement;
            if (nameInput) {
                this.DUPLICATE_ERROR_CLASSES.forEach(className => {
                    nameInput.classList.remove(className);
                });
            }
        });
    }

    /**
     * Apply duplicate error highlighting to name inputs
     */
    static highlightDuplicateNames(playerRows: Element[]): string[] {
        const nameGroups = new Map<string, HTMLInputElement[]>();
        const duplicateNames: string[] = [];

        // Group name inputs by value
        playerRows.forEach(row => {
            const nameInput = row.querySelector('.player-name') as HTMLInputElement;
            if (nameInput && nameInput.value.trim()) {
                const name = nameInput.value.trim().toLowerCase();
                if (!nameGroups.has(name)) {
                    nameGroups.set(name, []);
                }
                nameGroups.get(name)!.push(nameInput);
            }
        });

        let colorIndex = 0;
        nameGroups.forEach((inputs, name) => {
            if (inputs.length > 1) {
                duplicateNames.push(name);
                const colorClass = this.DUPLICATE_ERROR_CLASSES[colorIndex];
                inputs.forEach(input => {
                    input.classList.add(colorClass);
                });
                colorIndex = (colorIndex + 1) % this.DUPLICATE_ERROR_CLASSES.length;
            }
        });

        return duplicateNames;
    }

    /**
     * Check if any checkboxes in a group are selected
     */
    static hasSelectedCheckboxes(checkboxes: NodeListOf<HTMLInputElement>): boolean {
        for (let i = 0; i < checkboxes.length; i++) {
            if (checkboxes[i].checked) return true;
        }
        return false;
    }

    /**
     * Get selected checkbox values
     */
    static getSelectedCheckboxValues(checkboxes: NodeListOf<HTMLInputElement>): string[] {
        const values: string[] = [];
        for (let i = 0; i < checkboxes.length; i++) {
            if (checkboxes[i].checked) {
                values.push(checkboxes[i].value);
            }
        }
        return values;
    }

    /**
     * Add validation error to element
     */
    static addValidationError(element: HTMLElement, errorClass: string = 'error'): void {
        element.classList.add(errorClass);
    }

    /**
     * Remove validation error from element
     */
    static removeValidationError(element: HTMLElement, errorClass: string = 'error'): void {
        element.classList.remove(errorClass);
    }
}

/**
 * Button text formatting utilities - Core only
 */
export class ButtonTextUtils {
    /**
     * Format power levels for button text with cEDH capitalization
     */
    static formatPowerButtonText(selectedPowers: (string | number)[]): string {
        if (selectedPowers.length === 0) return 'Select Power Levels';
        if (selectedPowers.length === 1) return `Power: ${selectedPowers[0]}`;
        if (selectedPowers.length <= 3) return `Power: ${selectedPowers.join(', ')}`;
        return `${selectedPowers.length} Powers Selected`;
    }

    /**
     * Format bracket levels for button text with cEDH capitalization
     */
    static formatBracketButtonText(selectedBrackets: string[]): string {
        if (selectedBrackets.length === 0) return 'Select cEDH Bracket';
        if (selectedBrackets.length === 1) {
            // Special case for cEDH capitalization
            const bracket = selectedBrackets[0];
            const displayText = bracket.toLowerCase() === 'cedh' ? 'cEDH' : bracket;
            return `Bracket: ${displayText}`;
        }
        if (selectedBrackets.length <= 2) {
            // Special case for cEDH capitalization in multiple brackets
            const displayBrackets = selectedBrackets.map(bracket =>
                bracket.toLowerCase() === 'cedh' ? 'cEDH' : bracket
            );
            return `Brackets: ${displayBrackets.join(', ')}`;
        }
        return `${selectedBrackets.length} Brackets Selected`;
    }

    /**
     * Update button state with validation styling
     */
    static updateButtonState(button: HTMLButtonElement, text: string, hasSelection: boolean): void {
        button.textContent = text;

        if (hasSelection) {
            ValidationUtils.removeValidationError(button);
        }
    }
}

/**
 * DOM manipulation utilities - Core only
 */
export class DOMUtils {
    /**
     * Safely get element with optional type checking
     */
    static getElement<T extends Element>(
        parent: Document | Element,
        selector: string
    ): T | null {
        return parent.querySelector(selector) as T | null;
    }

    /**
     * Safely get all elements
     */
    static getAllElements<T extends Element>(
        parent: Document | Element,
        selector: string
    ): T[] {
        return Array.from(parent.querySelectorAll(selector)) as T[];
    }
}

/**
 * Event handling utilities - Core only
 */
export class EventUtils {
    /**
     * Debounce function calls
     */
    static debounce<T extends (...args: any[]) => void>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: number | undefined;

        return (...args: Parameters<T>) => {
            clearTimeout(timeout);
            timeout = window.setTimeout(() => func(...args), wait);
        };
    }

    /**
     * Throttle function calls
     */
    static throttle<T extends (...args: any[]) => void>(
        func: T,
        limit: number
    ): (...args: Parameters<T>) => void {
        let inThrottle: boolean;

        return (...args: Parameters<T>) => {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}
