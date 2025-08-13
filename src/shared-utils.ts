/**
 * Shared utilities for common UI patterns
 */

/**
 * Validation utility functions
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
                nameInput.classList.remove(
                    'name-duplicate-error',
                    ...this.DUPLICATE_ERROR_CLASSES
                );
            }
        });
    }

    /**
     * Apply duplicate error highlighting to name inputs
     */
    static highlightDuplicateNames(playerRows: Element[]): string[] {
        this.clearDuplicateErrors(playerRows);

        const nameInputs = new Map<string, HTMLInputElement[]>();

        // Collect all name inputs by normalized name
        playerRows.forEach(row => {
            const nameInput = row.querySelector('.player-name') as HTMLInputElement;
            if (nameInput) {
                const name = nameInput.value.trim().toLowerCase();
                if (name) {
                    if (!nameInputs.has(name)) {
                        nameInputs.set(name, []);
                    }
                    nameInputs.get(name)!.push(nameInput);
                }
            }
        });

        // Apply highlighting to duplicates
        const duplicateNames: string[] = [];
        let colorIndex = 0;

        nameInputs.forEach((inputs, name) => {
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
        return Array.from(checkboxes).some(checkbox => checkbox.checked);
    }

    /**
     * Get selected checkbox values
     */
    static getSelectedCheckboxValues(checkboxes: NodeListOf<HTMLInputElement>): string[] {
        return Array.from(checkboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);
    }

    /**
     * Add validation error to element
     */
    static addValidationError(element: HTMLElement, errorClass: string = 'error'): void {
        element.classList.add(errorClass);
        if (element.dataset) {
            element.dataset.validationTriggered = 'true';
        }
    }

    /**
     * Remove validation error from element
     */
    static removeValidationError(element: HTMLElement, errorClass: string = 'error'): void {
        element.classList.remove(errorClass);
    }

    /**
     * Check if element has validation error
     */
    static hasValidationError(element: HTMLElement, errorClass: string = 'error'): boolean {
        return element.classList.contains(errorClass);
    }
}

/**
 * Button text formatting utilities
 */
export class ButtonTextUtils {
    /**
     * Format power level button text
     */
    static formatPowerButtonText(selectedPowers: number[]): string {
        if (selectedPowers.length === 0) {
            return 'Select Power Levels';
        }

        selectedPowers.sort((a, b) => a - b);

        if (selectedPowers.length === 1) {
            return `Power: ${selectedPowers[0]}`;
        }

        const min = selectedPowers[0];
        const max = selectedPowers[selectedPowers.length - 1];

        // Check if it's a contiguous range
        const isContiguous = selectedPowers.every((power, index) => {
            if (index === 0) return true;
            const diff = power - selectedPowers[index - 1];
            return diff === 0.5 || diff === 1;
        });

        if (isContiguous && selectedPowers.length > 2) {
            return `Power: ${min}-${max}`;
        } else if (selectedPowers.length <= 4) {
            return `Power: ${selectedPowers.join(', ')}`;
        } else {
            return `Power: ${min}-${max} (${selectedPowers.length} levels)`;
        }
    }

    /**
     * Format bracket button text
     */
    static formatBracketButtonText(selectedBrackets: string[]): string {
        if (selectedBrackets.length === 0) {
            return 'Select Brackets';
        }

        if (selectedBrackets.length === 1) {
            return `Bracket: ${selectedBrackets[0]}`;
        } else {
            return `Brackets: ${selectedBrackets.join(', ')}`;
        }
    }

    /**
     * Update button with text and styling
     */
    static updateButtonState(
        button: HTMLButtonElement,
        text: string,
        hasSelection: boolean
    ): void {
        button.textContent = text;

        if (hasSelection) {
            button.classList.add('has-selection');
            ValidationUtils.removeValidationError(button);
        } else {
            button.classList.remove('has-selection');
            // Only show error if validation has been triggered
            if (button.dataset.validationTriggered === 'true') {
                ValidationUtils.addValidationError(button);
            }
        }
    }
}

/**
 * DOM manipulation utilities
 */
export class DOMUtils {
    /**
     * Safely get element with type checking
     */
    static getElement<T extends Element>(
        parent: Document | Element,
        selector: string,
        typeCheck?: (element: Element) => element is T
    ): T | null {
        const element = parent.querySelector(selector);
        if (!element) return null;

        if (typeCheck && !typeCheck(element)) {
            console.warn(`Element ${selector} found but failed type check`);
            return null;
        }

        return element as T;
    }

    /**
     * Safely get all elements with type checking
     */
    static getAllElements<T extends Element>(
        parent: Document | Element,
        selector: string,
        typeCheck?: (element: Element) => element is T
    ): T[] {
        const elements = Array.from(parent.querySelectorAll(selector));

        if (typeCheck) {
            return elements.filter(typeCheck);
        }

        return elements as T[];
    }

    /**
     * Set multiple CSS classes at once
     */
    static setClasses(element: Element, classes: string[], add: boolean = true): void {
        if (add) {
            element.classList.add(...classes);
        } else {
            element.classList.remove(...classes);
        }
    }

    /**
     * Toggle class based on condition
     */
    static toggleClass(element: Element, className: string, condition: boolean): void {
        if (condition) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }
}

/**
 * Event handling utilities
 */
export class EventUtils {
    /**
     * Add event listener with cleanup tracking
     */
    static addEventListener<K extends keyof HTMLElementEventMap>(
        element: HTMLElement,
        type: K,
        listener: (event: HTMLElementEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions
    ): () => void {
        element.addEventListener(type, listener, options);

        // Return cleanup function
        return () => {
            element.removeEventListener(type, listener, options);
        };
    }

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

/**
 * Array and data manipulation utilities
 */
export class DataUtils {
    /**
     * Shuffle array in place (Fisher-Yates)
     */
    static shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Get unique items from array
     */
    static unique<T>(array: T[]): T[] {
        return [...new Set(array)];
    }

    /**
     * Group array items by key function
     */
    static groupBy<T, K extends string | number>(
        array: T[],
        keyFn: (item: T) => K
    ): Map<K, T[]> {
        const groups = new Map<K, T[]>();

        array.forEach(item => {
            const key = keyFn(item);
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(item);
        });

        return groups;
    }

    /**
     * Safe array access with default
     */
    static getArrayItem<T>(array: T[], index: number, defaultValue?: T): T | undefined {
        if (index >= 0 && index < array.length) {
            return array[index];
        }
        return defaultValue;
    }
}
