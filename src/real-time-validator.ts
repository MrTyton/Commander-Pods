/**
 * Real-time validation manager with debouncing and performance optimization
 */

import { ValidationUtils, EventUtils } from './shared-utils.js';
import { ButtonTextManager } from './button-text-manager.js';

export class RealTimeValidator {
    private static readonly VALIDATION_DEBOUNCE_MS = 300;
    private static readonly DROPDOWN_THROTTLE_MS = 100;

    private nameValidationCallbacks = new Map<HTMLElement, () => void>();
    private duplicateCheckCallback: (() => void) | null = null;

    /**
     * Setup real-time validation for a name input with debouncing
     */
    setupNameValidation(nameInput: HTMLInputElement, onDuplicateCheck: () => void): void {
        // Store reference to duplicate check callback
        if (!this.duplicateCheckCallback) {
            this.duplicateCheckCallback = EventUtils.debounce(onDuplicateCheck, RealTimeValidator.VALIDATION_DEBOUNCE_MS);
        }

        const debouncedValidation = EventUtils.debounce(() => {
            // Mark field as touched
            nameInput.dataset.touched = 'true';

            // Real-time validation for empty names - only if touched
            const name = nameInput.value.trim();
            if (!name && nameInput.dataset.touched === 'true') {
                ValidationUtils.addValidationError(nameInput, 'input-error');
            } else {
                ValidationUtils.removeValidationError(nameInput, 'input-error');
            }

            // Trigger duplicate check (debounced globally)
            if (this.duplicateCheckCallback) {
                this.duplicateCheckCallback();
            }
        }, RealTimeValidator.VALIDATION_DEBOUNCE_MS);

        // Store callback for cleanup
        this.nameValidationCallbacks.set(nameInput, debouncedValidation);

        nameInput.addEventListener('input', debouncedValidation);
    }

    /**
     * Setup throttled dropdown toggle
     */
    setupDropdownToggle(
        button: HTMLButtonElement,
        dropdown: HTMLElement,
        closeOthersCallback: () => void
    ): void {
        const throttledToggle = EventUtils.throttle((e: Event) => {
            e.preventDefault();
            const isOpen = dropdown.style.display !== 'none';

            // Close all other dropdowns first
            closeOthersCallback();

            if (!isOpen) {
                dropdown.style.display = 'block';
                button.classList.add('open');
                // Trigger animation
                setTimeout(() => dropdown.classList.add('show'), 10);
            }
        }, RealTimeValidator.DROPDOWN_THROTTLE_MS);

        button.addEventListener('click', throttledToggle);
    }

    /**
     * Batch validation with performance tracking
     */
    batchValidateRows(container: HTMLElement): {
        validationTime: number;
        duplicateNames: string[];
        hasErrors: boolean;
    } {
        const startTime = performance.now();

        const playerRows = Array.from(container.querySelectorAll('.player-row'));
        let hasErrors = false;

        // Validate names and check duplicates
        const duplicateNames = ValidationUtils.highlightDuplicateNames(playerRows);
        if (duplicateNames.length > 0) {
            hasErrors = true;
        }

        // Validate power/bracket selections
        playerRows.forEach(row => {
            const nameInput = row.querySelector('.player-name') as HTMLInputElement;
            const name = nameInput.value.trim();
            if (!name) {
                ValidationUtils.addValidationError(nameInput, 'input-error');
                hasErrors = true;
            }
        });

        // Trigger validation for all button selectors
        ButtonTextManager.triggerValidationForAllRows(container);

        const endTime = performance.now();

        return {
            validationTime: endTime - startTime,
            duplicateNames,
            hasErrors
        };
    }

    /**
     * Cleanup validation listeners
     */
    cleanup(): void {
        this.nameValidationCallbacks.clear();
        this.duplicateCheckCallback = null;
    }

    /**
     * Performance analytics for validation
     */
    static trackValidationPerformance(validationTime: number): void {
        if (validationTime > 100) {
            console.warn(`Slow validation detected: ${validationTime.toFixed(2)}ms`);
        }

        // Store in performance buffer for analysis
        if ('performance' in window && 'mark' in performance) {
            performance.mark(`validation-${Date.now()}`);
        }
    }
}

export const realTimeValidator = new RealTimeValidator();
