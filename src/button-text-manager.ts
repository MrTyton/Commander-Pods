/**
 * Centralized button text management for power and bracket selectors
 */

import { ValidationUtils, ButtonTextUtils, DOMUtils } from './shared-utils-minimal.js';

export class ButtonTextManager {
    /**
     * Update power selector button text and styling
     */
    static updatePowerButton(row: Element): void {
        const powerSelectorBtn = DOMUtils.getElement(row, '.power-selector-btn') as HTMLButtonElement;
        if (!powerSelectorBtn) return;

        const powerCheckboxes = row.querySelectorAll('.power-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
        const selectedPowers: number[] = [];

        powerCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedPowers.push(parseFloat(checkbox.value));
            }
        });

        const buttonText = ButtonTextUtils.formatPowerButtonText(selectedPowers);
        const hasSelection = selectedPowers.length > 0;

        ButtonTextUtils.updateButtonState(powerSelectorBtn, buttonText, hasSelection);
    }

    /**
     * Update bracket selector button text and styling
     */
    static updateBracketButton(row: Element): void {
        const bracketSelectorBtn = DOMUtils.getElement(row, '.bracket-selector-btn') as HTMLButtonElement;
        if (!bracketSelectorBtn) return;

        const bracketCheckboxes = row.querySelectorAll('.bracket-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
        const selectedBrackets = ValidationUtils.getSelectedCheckboxValues(bracketCheckboxes);

        const buttonText = ButtonTextUtils.formatBracketButtonText(selectedBrackets);
        const hasSelection = selectedBrackets.length > 0;

        ButtonTextUtils.updateButtonState(bracketSelectorBtn, buttonText, hasSelection);
    }

    /**
     * Update all button texts for a specific row (both power and bracket)
     */
    static updateAllButtonsForRow(row: Element): void {
        this.updatePowerButton(row);
        this.updateBracketButton(row);
    }

    /**
     * Update button texts for all rows in container
     */
    static updateAllButtons(container: Element): void {
        const playerRows = DOMUtils.getAllElements(container, '.player-row');
        playerRows.forEach(row => this.updateAllButtonsForRow(row));
    }

    /**
     * Create power button update function for a specific row
     */
    static createPowerButtonUpdater(row: Element): () => void {
        return () => this.updatePowerButton(row);
    }

    /**
     * Create bracket button update function for a specific row
     */
    static createBracketButtonUpdater(row: Element): () => void {
        return () => this.updateBracketButton(row);
    }

    /**
     * Create combined button update function for a specific row
     */
    static createRowButtonUpdater(row: Element): () => void {
        return () => this.updateAllButtonsForRow(row);
    }

    /**
     * Trigger validation for power/bracket buttons based on current mode
     */
    static triggerValidationForRow(row: Element): void {
        const bracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;
        const isBracketMode = bracketRadio?.checked ?? false;

        const powerSelectorBtn = DOMUtils.getElement(row, '.power-selector-btn') as HTMLButtonElement;
        const bracketSelectorBtn = DOMUtils.getElement(row, '.bracket-selector-btn') as HTMLButtonElement;

        if (powerSelectorBtn) {
            powerSelectorBtn.dataset.validationTriggered = 'true';
        }
        if (bracketSelectorBtn) {
            bracketSelectorBtn.dataset.validationTriggered = 'true';
        }

        if (isBracketMode && bracketSelectorBtn) {
            const bracketCheckboxes = row.querySelectorAll('.bracket-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
            const hasSelectedBrackets = ValidationUtils.hasSelectedCheckboxes(bracketCheckboxes);
            if (!hasSelectedBrackets) {
                ValidationUtils.addValidationError(bracketSelectorBtn);
            }
        } else if (powerSelectorBtn) {
            const powerCheckboxes = row.querySelectorAll('.power-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
            const hasSelectedPowers = ValidationUtils.hasSelectedCheckboxes(powerCheckboxes);
            if (!hasSelectedPowers) {
                ValidationUtils.addValidationError(powerSelectorBtn);
            }
        }
    }

    /**
     * Trigger validation for all rows in container
     */
    static triggerValidationForAllRows(container: Element): void {
        const playerRows = DOMUtils.getAllElements(container, '.player-row');
        playerRows.forEach(row => this.triggerValidationForRow(row));
    }
}
