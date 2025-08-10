/**
 * Test Helper Framework for MTG Commander Pod Generator
 * 
 * This file provides comprehensive helper functions and utilities for testing
 * the Commander Pod Generator application. It standardizes common patterns
 * and interactions to make tests more consistent and easier to write.
 */

import { test, expect, Page, Locator, Dialog } from '@playwright/test';

// ==================== TYPES AND INTERFACES ====================

export interface Player {
    name: string;
    power?: string | number[];
    bracket?: string | number[];
    group?: string;
}

export interface TestPod {
    players: Player[];
    expectedPowerRange?: [number, number];
    expectedBracket?: string;
}

export interface ValidationState {
    hasError: boolean;
    errorClass?: string;
}

// ==================== NAVIGATION AND SETUP ====================

class TestSetup {
    constructor(private page: Page) { }

    /**
     * Navigate to the application with proper waiting
     */
    async goto() {
        await this.page.goto('./index.html');
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Reset the application to clean state
     */
    async reset() {
        // Use the proper dialog-handling reset method
        await this.resetWithConfirmation(true);
    }

    /**
     * Set the ranking system mode
     */
    async setMode(mode: 'power' | 'bracket') {
        const radioSelector = mode === 'power' ? '#power-radio' : '#bracket-radio';
        await this.page.check(radioSelector);
        await this.page.waitForTimeout(100);
    }

    /**
     * Set tolerance level (only for power mode)
     */
    async setTolerance(level: 'none' | 'regular' | 'super') {
        const radioMap = {
            'none': '#no-leniency-radio',
            'regular': '#leniency-radio',
            'super': '#super-leniency-radio'
        };
        await this.page.check(radioMap[level]);
        await this.page.waitForTimeout(100);
    }

    /**
     * Enhanced reset with dialog handling
     */
    async resetWithConfirmation(accept: boolean = true) {
        const resetBtn = this.page.locator('#reset-all-btn');

        // Set up dialog handler
        const dialogHandler = (dialog: Dialog) => {
            if (accept) {
                dialog.accept();
            } else {
                dialog.dismiss();
            }
        };

        this.page.on('dialog', dialogHandler);

        await resetBtn.click();
        await this.page.waitForTimeout(300);

        // Remove the dialog handler
        this.page.off('dialog', dialogHandler);
    }

    /**
     * Enhanced navigation with better waiting
     */
    async gotoWithWait(url: string = './index.html') {
        await this.page.goto(url);
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(100); // Small additional wait for any JS initialization
    }

    /**
     * Wait for page to be fully loaded and interactive
     */
    async waitForPageReady() {
        // Wait for main elements to be present
        await this.page.waitForSelector('#add-player-btn', { state: 'visible' });
        await this.page.waitForSelector('#generate-pods-btn', { state: 'visible' });
        await this.page.waitForSelector('.player-row', { state: 'visible' });
        await this.page.waitForTimeout(100);
    }

    /**
     * Check current mode
     */
    async getCurrentMode(): Promise<'power' | 'bracket'> {
        const powerRadio = this.page.locator('#power-radio');
        const isChecked = await powerRadio.isChecked();
        return isChecked ? 'power' : 'bracket';
    }

    /**
     * Check current tolerance level
     */
    async getCurrentTolerance(): Promise<'none' | 'regular' | 'super'> {
        if (await this.page.locator('#no-leniency-radio').isChecked()) return 'none';
        if (await this.page.locator('#leniency-radio').isChecked()) return 'regular';
        if (await this.page.locator('#super-leniency-radio').isChecked()) return 'super';
        return 'none'; // default
    }

    /**
     * Check if tolerance settings are visible (only in power mode)
     */
    async areToleranceSettingsVisible(): Promise<boolean> {
        const toleranceFieldset = this.page.locator('.settings fieldset:nth-child(3)');
        return await toleranceFieldset.isVisible();
    }

    /**
     * Setup for specific test scenario
     */
    async setupForTest(options: {
        mode?: 'power' | 'bracket';
        tolerance?: 'none' | 'regular' | 'super';
        url?: string;
    } = {}) {
        await this.gotoWithWait(options.url);
        await this.waitForPageReady();

        if (options.mode) {
            await this.setMode(options.mode);
        }

        if (options.tolerance && options.mode === 'power') {
            await this.setTolerance(options.tolerance);
        }
    }
}

// ==================== PLAYER MANAGEMENT ====================

class PlayerManager {
    constructor(private page: Page) { }

    /**
     * Get a player row locator
     */
    getPlayerRow(index: number): Locator {
        return this.page.locator(`.player-row:nth-child(${index + 1})`);
    }

    /**
     * Get player name input locator
     */
    getNameInput(playerIndex: number): Locator {
        return this.getPlayerRow(playerIndex).locator('.player-name');
    }

    /**
     * Get power selector button locator
     */
    getPowerButton(playerIndex: number): Locator {
        return this.getPlayerRow(playerIndex).locator('.power-selector-btn');
    }

    /**
     * Get bracket selector button locator
     */
    getBracketButton(playerIndex: number): Locator {
        return this.getPlayerRow(playerIndex).locator('.bracket-selector-btn');
    }

    /**
     * Get group selector locator
     */
    getGroupSelect(playerIndex: number): Locator {
        return this.getPlayerRow(playerIndex).locator('.group-select');
    }

    /**
     * Get player number element locator
     */
    getPlayerNumber(playerIndex: number): Locator {
        return this.getPlayerRow(playerIndex).locator('.player-number');
    }

    /**
     * Get the displayed number for a player row
     */
    async getPlayerNumberText(playerIndex: number): Promise<string> {
        const numberElement = this.getPlayerNumber(playerIndex);
        return await numberElement.textContent() || '';
    }

    /**
     * Verify player numbers are contiguous starting from 1
     */
    async verifyPlayerNumberSequence(): Promise<boolean> {
        const playerRows = await this.page.locator('.player-row').count();

        for (let i = 0; i < playerRows; i++) {
            const numberText = await this.getPlayerNumberText(i);
            const expectedNumber = (i + 1).toString();

            if (numberText !== expectedNumber) {
                console.log(`Expected player ${i} to have number ${expectedNumber}, but got ${numberText}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Get all player numbers as an array
     */
    async getAllPlayerNumbers(): Promise<string[]> {
        const playerRows = await this.page.locator('.player-row').count();
        const numbers: string[] = [];

        for (let i = 0; i < playerRows; i++) {
            const numberText = await this.getPlayerNumberText(i);
            numbers.push(numberText);
        }

        return numbers;
    }

    /**
     * Ensure exact number of player rows (add or remove as needed)
     */
    async ensurePlayerRows(count: number) {
        const currentCount = await this.page.locator('.player-row').count();

        if (currentCount < count) {
            // Add rows if we need more
            const addButton = this.page.locator('#add-player-btn');
            for (let i = currentCount; i < count; i++) {
                await addButton.click();
                await this.page.waitForTimeout(50);
            }
        }
        // Never remove rows - only ensure minimum count exists
    }

    /**
     * Fill player name
     */
    async setPlayerName(playerIndex: number, name: string) {
        await this.ensurePlayerRows(playerIndex + 1);
        const nameInput = this.getNameInput(playerIndex);
        await nameInput.fill(name);
    }

    /**
     * Set power levels for a player using the checkbox system (IMPROVED)
     */
    async setPowerLevels(playerIndex: number, powerLevels: string | number[]) {
        await this.ensurePlayerRows(playerIndex + 1);
        const powers = typeof powerLevels === 'string' ? [parseFloat(powerLevels)] : powerLevels;

        await this.page.evaluate(({ playerIndex, powers }) => {
            const playerRow = document.querySelector(`.player-row:nth-child(${playerIndex + 1})`);
            if (!playerRow) return;

            // Scroll into view for better reliability
            playerRow.scrollIntoView({ behavior: 'instant', block: 'nearest' });

            // Click the power selector button
            const btn = playerRow.querySelector('.power-selector-btn') as HTMLElement;
            if (btn) btn.click();

            // Wait for dropdown to appear and manipulate it
            const dropdown = playerRow.querySelector('.power-selector-dropdown') as HTMLElement;
            if (dropdown) {
                dropdown.style.display = 'block';
                dropdown.classList.add('show');

                // Clear all checkboxes first
                const clearBtn = dropdown.querySelector('.clear-btn') as HTMLElement;
                if (clearBtn) clearBtn.click();

                // Check the desired power level checkboxes
                for (const power of powers) {
                    const checkbox = dropdown.querySelector(`.power-checkbox input[value="${power}"]`) as HTMLInputElement;
                    if (checkbox) {
                        checkbox.checked = true;
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }

                // Close dropdown
                dropdown.style.display = 'none';
                dropdown.classList.remove('show');
            }
        }, { playerIndex, powers });

        await this.page.waitForTimeout(50);
    }

    /**
     * Set bracket levels for a player using the checkbox system (IMPROVED)
     */
    async setBracketLevels(playerIndex: number, bracketLevels: string | number[]) {
        await this.ensurePlayerRows(playerIndex + 1);
        const brackets = typeof bracketLevels === 'string' ? [bracketLevels] : bracketLevels.map(String);

        await this.page.evaluate(({ playerIndex, brackets }) => {
            const playerRow = document.querySelector(`.player-row:nth-child(${playerIndex + 1})`);
            if (!playerRow) return;

            // Scroll into view for better reliability
            playerRow.scrollIntoView({ behavior: 'instant', block: 'nearest' });

            // Click the bracket selector button
            const btn = playerRow.querySelector('.bracket-selector-btn') as HTMLElement;
            if (btn) btn.click();

            // Wait for dropdown to appear and manipulate it
            const dropdown = playerRow.querySelector('.bracket-selector-dropdown') as HTMLElement;
            if (dropdown) {
                dropdown.style.display = 'block';
                dropdown.classList.add('show');

                // Clear all checkboxes first
                const clearBtn = dropdown.querySelector('.clear-btn') as HTMLElement;
                if (clearBtn) clearBtn.click();

                // Check the desired bracket level checkboxes
                for (const bracket of brackets) {
                    const checkbox = dropdown.querySelector(`.bracket-checkbox input[value="${bracket}"]`) as HTMLInputElement;
                    if (checkbox) {
                        checkbox.checked = true;
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }

                // Close dropdown
                dropdown.style.display = 'none';
                dropdown.classList.remove('show');
            }
        }, { playerIndex, brackets });

        await this.page.waitForTimeout(50);
    }

    /**
     * Set player group
     */
    async setPlayerGroup(playerIndex: number, groupValue: string) {
        await this.ensurePlayerRows(playerIndex + 1);
        const groupSelect = this.getGroupSelect(playerIndex);
        await groupSelect.selectOption(groupValue);
        await this.page.waitForTimeout(200); // Allow time for group creation
    }

    /**
     * Create a complete player with all properties
     */
    async createPlayer(playerIndex: number, player: Player) {
        // Ensure row exists (need playerIndex + 1 rows for 0-based indexing)
        await this.ensurePlayerRows(playerIndex + 1);

        // Set name
        await this.setPlayerName(playerIndex, player.name);

        // Set power levels if provided
        if (player.power !== undefined) {
            await this.setPowerLevels(playerIndex, player.power);
        }

        // Set bracket levels if provided
        if (player.bracket !== undefined) {
            await this.setBracketLevels(playerIndex, player.bracket);
        }

        // Set group if provided
        if (player.group !== undefined) {
            await this.setPlayerGroup(playerIndex, player.group);
        }
    }

    /**
     * Get player name from input
     */
    async getPlayerName(playerIndex: number): Promise<string> {
        const nameInput = this.getNameInput(playerIndex);
        return await nameInput.inputValue();
    }

    /**
     * Get power selector button text
     */
    async getPowerButtonText(playerIndex: number): Promise<string> {
        const powerBtn = this.page.locator(`.player-row:nth-child(${playerIndex + 1}) .power-selector-btn`);
        return await powerBtn.textContent() || '';
    }

    /**
     * Get bracket selector button text
     */
    async getBracketButtonText(playerIndex: number): Promise<string> {
        const bracketBtn = this.page.locator(`.player-row:nth-child(${playerIndex + 1}) .bracket-selector-btn`);
        return await bracketBtn.textContent() || '';
    }

    /**
     * Check if power levels are selected
     */
    async hasPowerLevelsSelected(playerIndex: number): Promise<boolean> {
        const buttonText = await this.getPowerButtonText(playerIndex);
        return buttonText.includes('Power:') && !buttonText.includes('Select Power');
    }

    /**
     * Check if bracket levels are selected
     */
    async hasBracketLevelsSelected(playerIndex: number): Promise<boolean> {
        const buttonText = await this.getBracketButtonText(playerIndex);
        return buttonText.includes('Bracket:') && !buttonText.includes('Select Bracket');
    }

    /**
     * Clear all player data
     */
    async clearAllPlayers() {
        const playerRows = this.page.locator('.player-row');
        const count = await playerRows.count();

        for (let i = 1; i <= count; i++) {
            await this.setPlayerName(i, '');
            // Clear power levels
            const powerBtn = this.page.locator(`.player-row:nth-child(${i}) .power-selector-btn`);
            if (await powerBtn.isVisible()) {
                await powerBtn.click();
                const clearBtn = this.page.locator(`.player-row:nth-child(${i}) .clear-btn`);
                if (await clearBtn.isVisible()) {
                    await clearBtn.click();
                }
                await powerBtn.click(); // Close dropdown
            }
        }
    }

    /**
     * Create multiple players efficiently (ENHANCED BULK CREATION)
     */
    async createPlayers(players: { name: string; power?: string | number[]; bracket?: string | number[] }[]) {
        // Add required player rows in bulk
        const currentRows = await this.page.locator('.player-row').count();
        const rowsNeeded = players.length - currentRows;

        if (rowsNeeded > 0) {
            // Add rows efficiently using JavaScript
            await this.page.evaluate((count) => {
                const addBtn = document.querySelector('#add-player-btn') as HTMLElement;
                for (let i = 0; i < count; i++) {
                    if (addBtn) addBtn.click();
                }
            }, rowsNeeded);

            // Small wait for DOM updates
            await this.page.waitForTimeout(100);
        }

        // Fill in all players efficiently
        for (let i = 0; i < players.length; i++) {
            // Fill name directly
            await this.page.fill(`.player-row:nth-child(${i + 1}) .player-name`, players[i].name);

            // Set power levels if provided
            if (players[i].power !== undefined) {
                await this.setPowerLevels(i, players[i].power!);
            }

            // Set bracket levels if provided
            if (players[i].bracket !== undefined) {
                await this.setBracketLevels(i, players[i].bracket!);
            }
        }
    }

    /**
     * Remove a player row (ENHANCED)
     */
    async removePlayer(playerIndex: number) {
        const removeBtn = this.page.locator(`.player-row:nth-child(${playerIndex + 1}) .remove-player-btn`);
        if (await removeBtn.isVisible()) {
            await removeBtn.click();
            await this.page.waitForTimeout(100);
        }
    }
}

// ==================== VALIDATION HELPERS ====================

class ValidationHelper {
    constructor(private page: Page) { }

    /**
     * Check if element has error styling
     */
    async hasValidationError(locator: Locator): Promise<boolean> {
        const classes = await locator.getAttribute('class') || '';
        return classes.includes('input-error') || classes.includes('error');
    }

    /**
     * Assert element has validation error
     */
    async expectValidationError(locator: Locator) {
        await expect(locator).toHaveClass(/(?:input-error|error)/);
    }

    /**
     * Assert element does not have validation error
     */
    async expectNoValidationError(locator: Locator) {
        await expect(locator).not.toHaveClass(/(?:input-error|error)/);
    }

    /**
     * Trigger validation by attempting pod generation
     */
    async triggerValidation() {
        await this.page.click('#generate-pods-btn');
        await this.page.waitForTimeout(200);
    }

    /**
     * Check if generate button shows error dialog
     */
    async expectGenerationError() {
        // Look for error dialog or validation messages
        const errorDialog = this.page.locator('.error-dialog, .validation-error');
        await expect(errorDialog).toBeVisible({ timeout: 2000 });
    }

    /**
     * Check name input error state
     */
    async expectNameInputError(playerIndex: number) {
        const nameInput = this.page.locator(`.player-row:nth-child(${playerIndex + 1}) .player-name`);
        await this.expectValidationError(nameInput);
    }

    /**
     * Check name input has no error
     */
    async expectNameInputValid(playerIndex: number) {
        const nameInput = this.page.locator(`.player-row:nth-child(${playerIndex + 1}) .player-name`);
        await this.expectNoValidationError(nameInput);
    }

    /**
     * Check power button error state
     */
    async expectPowerButtonError(playerIndex: number) {
        const powerBtn = this.page.locator(`.player-row:nth-child(${playerIndex + 1}) .power-selector-btn`);
        await this.expectValidationError(powerBtn);
    }

    /**
     * Check power button has no error
     */
    async expectPowerButtonValid(playerIndex: number) {
        const powerBtn = this.page.locator(`.player-row:nth-child(${playerIndex + 1}) .power-selector-btn`);
        await this.expectNoValidationError(powerBtn);
    }

    /**
     * Check bracket button error state
     */
    async expectBracketButtonError(playerIndex: number) {
        const bracketBtn = this.page.locator(`.player-row:nth-child(${playerIndex + 1}) .bracket-selector-btn`);
        await this.expectValidationError(bracketBtn);
    }

    /**
     * Check bracket button has no error
     */
    async expectBracketButtonValid(playerIndex: number) {
        const bracketBtn = this.page.locator(`.player-row:nth-child(${playerIndex + 1}) .bracket-selector-btn`);
        await this.expectNoValidationError(bracketBtn);
    }

    /**
     * Check element CSS property
     */
    async expectCSSProperty(locator: Locator, property: string, expectedValue: string) {
        await expect(locator).toHaveCSS(property, expectedValue);
    }

    /**
     * Check if element has specific class pattern
     */
    async expectClassPattern(locator: Locator, pattern: RegExp) {
        await expect(locator).toHaveClass(pattern);
    }

    /**
     * Check CSS color value
     */
    async expectColor(locator: Locator, expectedColor: string) {
        await this.expectCSSProperty(locator, 'color', expectedColor);
    }

    /**
     * Check CSS border color
     */
    async expectBorderColor(locator: Locator, expectedColor: string) {
        await this.expectCSSProperty(locator, 'border-color', expectedColor);
    }

    /**
     * Get player count from current state
     */
    async getPlayerCount(): Promise<number> {
        return await this.page.locator('.player-row').count();
    }

    /**
     * Check if all players have names
     */
    async areAllPlayersNamed(): Promise<boolean> {
        const playerRows = this.page.locator('.player-row');
        const count = await playerRows.count();

        for (let i = 0; i < count; i++) {
            const nameInput = playerRows.nth(i).locator('.player-name');
            const value = await nameInput.inputValue();
            if (!value.trim()) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if elements are visible
     */
    async expectVisible(locator: Locator) {
        await expect(locator).toBeVisible();
    }

    /**
     * Check if elements are hidden
     */
    async expectHidden(locator: Locator) {
        await expect(locator).not.toBeVisible();
    }

    /**
     * Common validation: Expect player to have specific name
     */
    async expectPlayerName(playerIndex: number, expectedName: string) {
        const nameInput = this.page.locator(`.player-row:nth-child(${playerIndex + 1}) .player-name`);
        await expect(nameInput).toHaveValue(expectedName);
    }

    /**
     * Common validation: Expect player power button to show specific text
     */
    async expectPlayerPowerText(playerIndex: number, expectedText: string) {
        const powerBtn = this.page.locator(`.player-row:nth-child(${playerIndex + 1}) .power-selector-btn`);
        await expect(powerBtn).toContainText(expectedText);
    }

    /**
     * Common validation: Expect player bracket button to show specific text
     */
    async expectPlayerBracketText(playerIndex: number, expectedText: string) {
        const bracketBtn = this.page.locator(`.player-row:nth-child(${playerIndex + 1}) .bracket-selector-btn`);
        await expect(bracketBtn).toContainText(expectedText);
    }

    /**
     * Common validation: Expect player to be in specific group
     */
    async expectPlayerGroup(playerIndex: number, expectedGroup: string) {
        const groupSelect = this.page.locator(`.player-row:nth-child(${playerIndex + 1}) .group-select`);
        await expect(groupSelect).toHaveValue(expectedGroup);
    }

    /**
     * Common validation: Expect total player count
     */
    async expectPlayerCount(expectedCount: number) {
        await expect(this.page.locator('.player-row')).toHaveCount(expectedCount);
    }

    /**
     * Common validation: Expect generate pods button to be enabled/disabled
     */
    async expectGenerateButtonEnabled(enabled: boolean = true) {
        const generateBtn = this.page.locator('#generate-pods-btn');
        if (enabled) {
            await expect(generateBtn).toBeEnabled();
        } else {
            await expect(generateBtn).toBeDisabled();
        }
    }

    /**
     * Common validation: Expect reset button to be visible
     */
    async expectResetButtonVisible() {
        await expect(this.page.locator('#reset-all-btn')).toBeVisible();
    }

    /**
     * Common validation: Expect undo button to be visible/hidden
     */
    async expectUndoButtonVisible(visible: boolean = true) {
        const undoBtn = this.page.locator('#undo-reset-btn');
        if (visible) {
            await expect(undoBtn).toBeVisible();
        } else {
            await expect(undoBtn).not.toBeVisible();
        }
    }

    /**
     * Common validation: Expect output section to contain text
     */
    async expectOutputContains(expectedText: string) {
        await expect(this.page.locator('#output-section')).toContainText(expectedText);
    }

    /**
     * Common validation: Expect dialog to appear with specific message
     */
    async expectDialogWithMessage(expectedMessage: string, accept: boolean = true) {
        this.page.on('dialog', async dialog => {
            expect(dialog.message()).toContain(expectedMessage);
            if (accept) {
                await dialog.accept();
            } else {
                await dialog.dismiss();
            }
        });
    }

    /**
     * Common validation: Expect element to be checked/unchecked
     */
    async expectChecked(locator: Locator, checked: boolean = true) {
        if (checked) {
            await expect(locator).toBeChecked();
        } else {
            await expect(locator).not.toBeChecked();
        }
    }

    /**
     * Common validation: Expect element to have specific text content
     */
    async expectText(locator: Locator, expectedText: string) {
        await expect(locator).toContainText(expectedText);
    }

    /**
     * Common validation: Expect element to have exact text content
     */
    async expectExactText(locator: Locator, expectedText: string) {
        await expect(locator).toHaveText(expectedText);
    }

    /**
     * Common validation: Expect element to be enabled/disabled
     */
    async expectEnabled(locator: Locator, enabled: boolean = true) {
        if (enabled) {
            await expect(locator).toBeEnabled();
        } else {
            await expect(locator).toBeDisabled();
        }
    }

    /**
     * Common validation: Expect form validation state across all inputs
     */
    async expectAllInputsValid() {
        const playerRows = this.page.locator('.player-row');
        const count = await playerRows.count();

        for (let i = 1; i <= count; i++) {
            await this.expectNameInputValid(i);
            await this.expectPowerButtonValid(i);
            await this.expectBracketButtonValid(i);
        }
    }

    /**
     * Common validation: Expect specific number of groups to exist
     */
    async expectGroupCount(expectedCount: number) {
        // Count unique group options (excluding default "No Group" option)
        const firstGroupSelect = this.page.locator('.player-row:nth-child(1) .group-select');
        const options = await firstGroupSelect.locator('option').count();
        // Subtract 2 for "No Group" and "New Group" options
        const groupCount = Math.max(0, options - 2);
        expect(groupCount).toBe(expectedCount);
    }

    /**
     * Common validation: Expect display mode to be active/inactive
     */
    async expectDisplayMode(active: boolean = true) {
        const body = this.page.locator('body');
        if (active) {
            await expect(body).toHaveClass(/display-mode/);
        } else {
            await expect(body).not.toHaveClass(/display-mode/);
        }
    }

    /**
     * Common validation: Wait for element and expect it to be visible
     */
    async waitAndExpectVisible(locator: Locator, timeout: number = 5000) {
        await expect(locator).toBeVisible({ timeout });
    }

    /**
     * Common validation: Wait for element and expect it to be hidden
     */
    async waitAndExpectHidden(locator: Locator, timeout: number = 5000) {
        await expect(locator).not.toBeVisible({ timeout });
    }

    /**
     * Wait for element to appear
     */
    async waitForElement(selector: string, timeout: number = 5000) {
        await this.page.waitForSelector(selector, { state: 'visible', timeout });
    }

    /**
     * Wait for element to disappear
     */
    async waitForElementGone(selector: string, timeout: number = 5000) {
        await this.page.waitForSelector(selector, { state: 'hidden', timeout });
    }
}

// ==================== POD MANAGEMENT ====================

class PodManager {
    constructor(private page: Page) { }

    /**
     * Generate pods
     */
    async generatePods() {
        await this.page.click('#generate-pods-btn');
        await this.page.waitForTimeout(500);
    }

    /**
     * Get all pod elements
     */
    getPods(): Locator {
        return this.page.locator('.pod:not(.unassigned-pod):not(.new-pod)');
    }

    /**
     * Get unassigned players pod
     */
    getUnassignedPod(): Locator {
        return this.page.locator('.unassigned-pod');
    }

    /**
     * Get specific pod by index (1-based for user API)
     */
    getPod(index: number): Locator {
        return this.page.locator(`.pod:not(.unassigned-pod):not(.new-pod)`).nth(index - 1);
    }

    /**
     * Get pod players
     */
    getPodPlayers(podIndex: number): Locator {
        return this.getPod(podIndex).locator('.pod-player');
    }

    /**
     * Get pod title
     */
    getPodTitle(podIndex: number): Locator {
        return this.getPod(podIndex).locator('h3');
    }

    /**
     * Count total pods generated
     */
    async getPodCount(): Promise<number> {
        return await this.getPods().count();
    }

    /**
     * Count players in a specific pod
     */
    async getPlayersInPod(podIndex: number): Promise<number> {
        return await this.getPodPlayers(podIndex).count();
    }

    /**
     * Get player names in a pod
     */
    async getPlayerNamesInPod(podIndex: number): Promise<string[]> {
        const names: string[] = [];
        const pod = this.getPod(podIndex);

        // Get individual players
        const players = pod.locator('.pod-player');
        const playerCount = await players.count();

        for (let i = 0; i < playerCount; i++) {
            const playerText = await players.nth(i).textContent() || '';
            // Extract name from format like "PlayerName (P: 7)"
            const name = playerText.split(' (')[0];
            names.push(name);
        }

        // Get players from groups
        const groups = pod.locator('.pod-group');
        const groupCount = await groups.count();

        for (let i = 0; i < groupCount; i++) {
            const groupPlayers = groups.nth(i).locator('li');
            const groupPlayerCount = await groupPlayers.count();

            for (let j = 0; j < groupPlayerCount; j++) {
                const playerText = await groupPlayers.nth(j).textContent() || '';
                // Extract name from format like "PlayerName (P: 7)"
                const name = playerText.split(' (')[0];
                names.push(name);
            }
        }

        return names;
    }

    /**
     * Check if pod contains group information
     */
    async podContainsGroupInfo(podIndex: number, groupName: string, avgPower?: number): Promise<boolean> {
        const pod = this.getPod(podIndex);
        const podContent = await pod.innerHTML();

        // Check for group name
        if (!podContent.includes(groupName)) {
            return false;
        }

        // Check for average power if specified
        if (avgPower !== undefined) {
            const avgPowerText = `Avg Power: ${avgPower}`;
            return podContent.includes(avgPowerText);
        }

        return true;
    }

    /**
     * Get all group information from a pod
     */
    async getPodGroupInfo(podIndex: number): Promise<{ groupName: string; avgPower: number; players: string[] }[]> {
        const pod = this.getPod(podIndex);
        const groups = pod.locator('.pod-group');
        const groupCount = await groups.count();
        const groupInfo: { groupName: string; avgPower: number; players: string[] }[] = [];

        for (let i = 0; i < groupCount; i++) {
            const groupElement = groups.nth(i);
            const strongElement = groupElement.locator('strong');
            const strongText = await strongElement.textContent() || '';

            // Extract group name and avg power from "Group 1 (Avg Power: 7):"
            const match = strongText.match(/^(.+?) \(Avg Power: (\d+)\):$/);
            if (match) {
                const groupName = match[1];
                const avgPower = parseInt(match[2]);

                // Get players in this group
                const groupPlayers = groupElement.locator('li');
                const groupPlayerCount = await groupPlayers.count();
                const players: string[] = [];

                for (let j = 0; j < groupPlayerCount; j++) {
                    const playerText = await groupPlayers.nth(j).textContent() || '';
                    const playerName = playerText.split(' (')[0];
                    players.push(playerName);
                }

                groupInfo.push({ groupName, avgPower, players });
            }
        }

        return groupInfo;
    }

    /**
     * Verify pod contains expected players
     */
    async expectPodContainsPlayers(podIndex: number, expectedNames: string[]) {
        const actualNames = await this.getPlayerNamesInPod(podIndex);
        for (const name of expectedNames) {
            expect(actualNames).toContain(name);
        }
    }

    /**
     * Verify total number of pods
     */
    async expectPodCount(expectedCount: number) {
        await expect(this.getPods()).toHaveCount(expectedCount);
    }

    /**
     * Verify unassigned players
     */
    async expectUnassignedPlayers(expectedNames: string[]) {
        if (expectedNames.length === 0) {
            await expect(this.getUnassignedPod()).toHaveCount(0);
        } else {
            await expect(this.getUnassignedPod()).toBeVisible();
            for (const name of expectedNames) {
                await expect(this.getUnassignedPod()).toContainText(name);
            }
        }
    }

    /**
     * Get all player names from all pods in order
     */
    async getAllPodPlayerNames(): Promise<string[]> {
        const allNames: string[] = [];
        const podCount = await this.getPodCount();

        for (let podIndex = 0; podIndex < podCount; podIndex++) {
            const podNames = await this.getPlayerNamesInPod(podIndex);
            allNames.push(...podNames);
        }

        return allNames;
    }

    /**
     * Get player counts for all pods
     */
    async getAllPodPlayerCounts(): Promise<number[]> {
        const podCount = await this.getPodCount();
        const counts: number[] = [];

        for (let podIndex = 0; podIndex < podCount; podIndex++) {
            const playerNames = await this.getPlayerNamesInPod(podIndex);
            counts.push(playerNames.length);
        }

        return counts;
    }

    /**
     * Get pod arrangement as a structured object (returns 1-based podIndex for consistency)
     */
    async getPodArrangement(): Promise<{ podIndex: number; title: string; players: string[] }[]> {
        const arrangement: { podIndex: number; title: string; players: string[] }[] = [];
        const podCount = await this.getPodCount();

        for (let i = 1; i <= podCount; i++) {
            const title = await this.getPodTitle(i).textContent() || '';
            const players = await this.getPlayerNamesInPod(i);
            arrangement.push({ podIndex: i, title, players });
        }

        return arrangement;
    }

    /**
     * Check if specific player is in any pod
     */
    async isPlayerInPod(playerName: string): Promise<boolean> {
        const allNames = await this.getAllPodPlayerNames();
        return allNames.includes(playerName);
    }

    /**
     * Get pod index containing specific player
     */
    async getPodIndexForPlayer(playerName: string): Promise<number | null> {
        const podCount = await this.getPodCount();

        for (let podIndex = 1; podIndex <= podCount; podIndex++) {
            const players = await this.getPlayerNamesInPod(podIndex);
            if (players.includes(playerName)) {
                return podIndex;
            }
        }

        return null;
    }

    /**
     * Check if players are in the same pod
     */
    async arePlayersInSamePod(playerNames: string[]): Promise<boolean> {
        if (playerNames.length < 2) return true;

        const firstPlayerPod = await this.getPodIndexForPlayer(playerNames[0]);
        if (firstPlayerPod === null) return false;

        for (let i = 1; i < playerNames.length; i++) {
            const playerPod = await this.getPodIndexForPlayer(playerNames[i]);
            if (playerPod !== firstPlayerPod) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get unassigned player names
     */
    async getUnassignedPlayerNames(): Promise<string[]> {
        const unassignedPod = this.getUnassignedPod();

        if (!(await unassignedPod.isVisible())) {
            return [];
        }

        const players = unassignedPod.locator('.pod-player');
        const count = await players.count();
        const names: string[] = [];

        for (let i = 0; i < count; i++) {
            const playerText = await players.nth(i).textContent() || '';
            const name = playerText.split(' (')[0];
            names.push(name);
        }

        return names;
    }

    /**
     * Verify specific pod contains specific players
     */
    async expectPodHasPlayers(podIndex: number, expectedPlayers: string[]) {
        const actualPlayers = await this.getPlayerNamesInPod(podIndex);
        expect(actualPlayers.length).toBe(expectedPlayers.length);

        for (const player of expectedPlayers) {
            expect(actualPlayers).toContain(player);
        }
    }

    /**
     * Wait for pods to be generated
     */
    async waitForPodsGenerated(timeout: number = 5000) {
        await this.page.waitForFunction(() => {
            const pods = document.querySelectorAll('.pod:not(.unassigned-pod)');
            return pods.length > 0;
        }, { timeout });
    }

    /**
     * Check if any pods were generated
     */
    async hasPodsGenerated(): Promise<boolean> {
        const podCount = await this.getPodCount();
        return podCount > 0;
    }
}

// ==================== DISPLAY MODE HELPERS ====================

class DisplayModeHelper {
    constructor(private page: Page) { }

    /**
     * Enter display mode
     */
    async enterDisplayMode() {
        await this.page.click('#display-mode-btn');
        await this.page.waitForTimeout(500);
    }

    /**
     * Exit display mode
     */
    async exitDisplayMode() {
        // Try button first, then escape key
        const exitBtn = this.page.locator('.display-mode-header button');
        if (await exitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await exitBtn.click();
        } else {
            await this.page.keyboard.press('Escape');
        }
        await this.page.waitForTimeout(300);
    }

    /**
     * Check if in display mode
     */
    async isInDisplayMode(): Promise<boolean> {
        return await this.page.locator('body.display-mode').isVisible();
    }

    /**
     * Assert display mode is active
     */
    async expectDisplayModeActive() {
        await expect(this.page.locator('body')).toHaveClass(/display-mode/);
    }

    /**
     * Assert display mode is not active
     */
    async expectDisplayModeInactive() {
        await expect(this.page.locator('body')).not.toHaveClass(/display-mode/);
    }

    /**
     * Get display mode pods
     */
    getDisplayPods(): Locator {
        return this.page.locator('.display-mode-container .pod');
    }

    /**
     * Get display mode pod title
     */
    getDisplayPodTitle(podIndex: number): Locator {
        return this.getDisplayPods().nth(podIndex - 1).locator('h3');
    }

    /**
     * Get display mode players for a pod
     */
    getDisplayPodPlayers(podIndex: number): Locator {
        return this.getDisplayPods().nth(podIndex - 1).locator('li');
    }

    /**
     * Check font size of display mode elements
     */
    async getDisplayElementFontSize(element: Locator): Promise<number> {
        return await element.evaluate(el => parseFloat(window.getComputedStyle(el).fontSize));
    }

    /**
     * Get all font sizes in display mode
     */
    async getAllDisplayFontSizes(): Promise<number[]> {
        const elements = this.page.locator('.dynamic-font-item');
        const count = await elements.count();
        const fontSizes: number[] = [];

        for (let i = 0; i < count; i++) {
            const fontSize = await this.getDisplayElementFontSize(elements.nth(i));
            fontSizes.push(fontSize);
        }

        return fontSizes;
    }

    /**
     * Check if display mode button is visible
     */
    async isDisplayModeButtonVisible(): Promise<boolean> {
        const displayBtn = this.page.locator('#display-mode-btn');
        return await displayBtn.isVisible();
    }

    /**
     * Wait for display mode button to appear
     */
    async waitForDisplayModeButton(timeout: number = 5000) {
        await this.page.waitForSelector('#display-mode-btn', { state: 'visible', timeout });
    }

    /**
     * Get display mode container
     */
    getDisplayModeContainer(): Locator {
        return this.page.locator('.display-mode-container');
    }

    /**
     * Check display mode styling
     */
    async expectDisplayModeContainer() {
        await expect(this.getDisplayModeContainer()).toBeVisible();
    }

    /**
     * Get measurements for display mode elements
     */
    async getDisplayElementMeasurements(): Promise<{ width: number; fontSize: number; name: string }[]> {
        const elements = this.page.locator('.dynamic-font-item');
        const count = await elements.count();
        const measurements: { width: number; fontSize: number; name: string }[] = [];

        for (let i = 0; i < count; i++) {
            const element = elements.nth(i);
            const width = await element.evaluate(el => parseFloat(window.getComputedStyle(el).width));
            const fontSize = await this.getDisplayElementFontSize(element);
            const name = await element.textContent() || 'unknown';

            measurements.push({
                width: Math.round(width),
                fontSize: Math.round(fontSize * 10) / 10,
                name: name.split(' ')[0] // Get just the player name
            });
        }

        return measurements;
    }
}

// ==================== GROUP MANAGEMENT ====================

class GroupManager {
    constructor(private page: Page) { }

    /**
     * Create a new group with the first player
     */
    async createNewGroup(playerIndex: number): Promise<string> {
        const groupSelect = this.page.locator(`.player-row:nth-child(${playerIndex + 1}) .group-select`);
        await groupSelect.selectOption('new-group');
        await this.page.waitForTimeout(300);

        // Get the created group value
        return await groupSelect.inputValue();
    }

    /**
     * Add player to existing group
     */
    async addPlayerToGroup(playerIndex: number, groupValue: string) {
        const groupSelect = this.page.locator(`.player-row:nth-child(${playerIndex + 1}) .group-select`);
        await groupSelect.selectOption(groupValue);
        await this.page.waitForTimeout(200);
    }

    /**
     * Get group color class for a player
     */
    async getGroupColorClass(playerIndex: number): Promise<string | null> {
        const groupSelect = this.page.locator(`.player-row:nth-child(${playerIndex + 1}) .group-select`);
        const className = await groupSelect.getAttribute('class') || '';
        const match = className.match(/group-(\d+)/);
        return match ? match[0] : null;
    }

    /**
     * Verify players are in the same group (have same color)
     */
    async expectPlayersInSameGroup(playerIndices: number[]) {
        const colorClasses = await Promise.all(
            playerIndices.map(index => this.getGroupColorClass(index))
        );

        const firstColor = colorClasses[0];
        expect(firstColor).toBeTruthy();

        for (const color of colorClasses) {
            expect(color).toBe(firstColor);
        }
    }
}

// ==================== UTILITY FUNCTIONS ====================

class TestUtils {
    constructor(private page: Page) { }

    /**
     * Wait for element to be visible with timeout
     */
    async waitForElement(selector: string, timeout: number = 5000) {
        await this.page.waitForSelector(selector, { state: 'visible', timeout });
    }

    /**
     * Wait for element to be hidden
     */
    async waitForElementHidden(selector: string, timeout: number = 5000) {
        await this.page.waitForSelector(selector, { state: 'hidden', timeout });
    }

    /**
     * Take screenshot for debugging
     */
    async screenshot(name: string) {
        await this.page.screenshot({ path: `test-results/debug-${name}.png`, fullPage: true });
    }

    /**
     * Log page console for debugging
     */
    async logConsole() {
        this.page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    }

    /**
     * Get element text content safely
     */
    async getTextContent(locator: Locator): Promise<string> {
        return await locator.textContent() || '';
    }

    /**
     * Check if element exists
     */
    async elementExists(selector: string): Promise<boolean> {
        return await this.page.locator(selector).count() > 0;
    }

    /**
     * Generate deterministic seed for shuffle testing
     */
    generateSeed(players: string[]): string {
        return players.join('');
    }

    /**
     * Compare two arrays for order differences
     */
    arraysHaveDifferentOrder<T>(arr1: T[], arr2: T[]): boolean {
        if (arr1.length !== arr2.length) return true;
        return !arr1.every((item, index) => item === arr2[index]);
    }

    /**
     * Wait for specific timeout
     */
    async wait(ms: number) {
        await this.page.waitForTimeout(ms);
    }

    /**
     * Retry an operation with timeout
     */
    async retry<T>(operation: () => Promise<T>, maxAttempts: number = 3, delay: number = 1000): Promise<T> {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxAttempts) throw error;
                await this.wait(delay);
            }
        }
        throw new Error('Retry failed');
    }

    /**
     * Get current URL
     */
    async getCurrentUrl(): Promise<string> {
        return this.page.url();
    }

    /**
     * Check page title
     */
    async expectPageTitle(expectedTitle: string) {
        await expect(this.page).toHaveTitle(expectedTitle);
    }
}

// ==================== SHUFFLE TESTING HELPER ====================

class ShuffleHelper {
    constructor(private page: Page) { }

    /**
     * Capture pod arrangement for comparison
     */
    async capturePodArrangement(): Promise<string[]> {
        const pods = this.page.locator('.pod:not(.unassigned-pod)');
        const podCount = await pods.count();
        const arrangement: string[] = [];

        for (let i = 0; i < podCount; i++) {
            const pod = pods.nth(i);
            const players = await pod.locator('.pod-player').all();

            for (const player of players) {
                const playerText = await player.textContent();
                if (playerText) {
                    const name = playerText.split(' ')[0].replace(/[()]/g, '');
                    arrangement.push(name);
                }
            }
        }

        return arrangement;
    }

    /**
     * Test shuffle determinism with same inputs
     */
    async testShuffleDeterminism(players: { name: string; power: string | number[] }[], iterations: number = 2): Promise<boolean> {
        const arrangements: string[][] = [];

        for (let i = 0; i < iterations; i++) {
            // Reset and setup players
            await this.page.click('#reset-all-btn');
            await this.page.waitForTimeout(200);

            // Create players
            for (let j = 0; j < players.length; j++) {
                await this.page.fill(`.player-row:nth-child(${j + 1}) .player-name`, players[j].name);
                // Set power levels using the improved method
                await this.page.evaluate(({ playerIndex, powers }) => {
                    const playerRow = document.querySelector(`.player-row:nth-child(${playerIndex})`);
                    if (!playerRow) return;

                    const btn = playerRow.querySelector('.power-selector-btn') as HTMLElement;
                    if (btn) btn.click();

                    const dropdown = playerRow.querySelector('.power-selector-dropdown') as HTMLElement;
                    if (dropdown) {
                        dropdown.style.display = 'block';
                        dropdown.classList.add('show');

                        const clearBtn = dropdown.querySelector('.clear-btn') as HTMLElement;
                        if (clearBtn) clearBtn.click();

                        const powerArray = typeof powers === 'string' ? [parseFloat(powers)] : powers;
                        for (const power of powerArray) {
                            const checkbox = dropdown.querySelector(`input[value="${power}"]`) as HTMLInputElement;
                            if (checkbox) checkbox.checked = true;
                        }

                        btn.click();
                    }
                }, { playerIndex: j + 1, powers: players[j].power });
            }

            // Generate pods
            await this.page.click('#generate-pods-btn');
            await this.page.waitForTimeout(500);

            // Capture arrangement
            const arrangement = await this.capturePodArrangement();
            arrangements.push(arrangement);
        }

        // Check if all arrangements are identical (deterministic)
        const firstArrangement = arrangements[0];
        return arrangements.every(arr =>
            arr.length === firstArrangement.length &&
            arr.every((name, index) => name === firstArrangement[index])
        );
    }

    /**
     * Test that shuffling prevents input order bias
     */
    async testInputOrderShuffle(players: string[]): Promise<boolean> {
        const arrangement = await this.capturePodArrangement();

        // Check if the pod order matches the input order exactly
        const isExactInputOrder = arrangement.every((name, index) =>
            index < players.length && name === players[index]
        );

        // We want this to be false (shuffled), not the exact input order
        return !isExactInputOrder;
    }
}

// ==================== MAIN TEST HELPER CLASS ====================

/**
 * Main test helper class that combines all utilities
 */
class TestHelper {
    public setup: TestSetup;
    public players: PlayerManager;
    public validation: ValidationHelper;
    public pods: PodManager;
    public displayMode: DisplayModeHelper;
    public groups: GroupManager;
    public utils: TestUtils;
    public shuffle: ShuffleHelper;

    constructor(public page: Page) {
        this.setup = new TestSetup(page);
        this.players = new PlayerManager(page);
        this.validation = new ValidationHelper(page);
        this.pods = new PodManager(page);
        this.displayMode = new DisplayModeHelper(page);
        this.groups = new GroupManager(page);
        this.utils = new TestUtils(page);
        this.shuffle = new ShuffleHelper(page);
    }

    /**
     * Quick setup for common test scenarios
     */
    async quickSetup(mode: 'power' | 'bracket' = 'power') {
        await this.setup.goto();
        await this.setup.setMode(mode);
    }

    /**
     * Create a standard test scenario with 4 players
     */
    async createStandardScenario() {
        await this.quickSetup();
        await this.players.createPlayers([
            { name: 'Alice', power: '7' },
            { name: 'Bob', power: '7' },
            { name: 'Charlie', power: '6' },
            { name: 'David', power: '6' }
        ]);
    }

    /**
     * Create a bracket mode test scenario
     */
    async createBracketScenario() {
        await this.quickSetup('bracket');
        await this.players.createPlayers([
            { name: 'Alice', bracket: '2' },
            { name: 'Bob', bracket: '2' },
            { name: 'Charlie', bracket: '1' },
            { name: 'David', bracket: '1' }
        ]);
    }
}

// ==================== EXPORTS ====================

export default TestHelper;
export {
    TestSetup,
    PlayerManager,
    ValidationHelper,
    PodManager,
    DisplayModeHelper,
    GroupManager,
    TestUtils,
    ShuffleHelper
};
