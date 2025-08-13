import { test, expect } from '@playwright/test';
import { setupBasicTest, teardownBasicTest } from './test-setup';
import TestHelper from './test-helpers';

test.describe('Power Selector Keyboard Functionality', () => {
    let helper: TestHelper;

    test.afterEach(async () => {
        if (helper) {
            await teardownBasicTest(helper);
        }
    });

    test('should support typing single power level and Enter to confirm', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Add a player first
        await helper.players.createPlayers([{ name: 'Test Player', power: [] }]);

        const powerBtn = page.locator('.player-row:first-child .power-selector-btn');
        
        // Focus the power selector button
        await powerBtn.focus();
        
        // Type "7" followed by Enter
        await page.keyboard.press('7');
        await page.keyboard.press('Enter');
        
        // Verify that power level 7 was selected
        await expect(powerBtn).toContainText('Power: 7');

        // Verify the checkbox is actually checked
        const checkbox7 = page.locator('.player-row:first-child .power-checkbox input[value="7"]');
        await expect(checkbox7).toBeChecked();
    });

    test('should support typing power range and Enter to confirm', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Add a player first
        await helper.players.createPlayers([{ name: 'Test Player', power: [] }]);

        const powerBtn = page.locator('.player-row:first-child .power-selector-btn');
        
        // Focus the power selector button
        await powerBtn.focus();
        
        // Type "7-9" followed by Enter (should only select whole numbers: 7, 8, 9)
        await page.keyboard.press('7');
        await page.keyboard.press('-');
        await page.keyboard.press('9');
        await page.keyboard.press('Enter');
        
        // Verify that only whole number power levels were selected (no 7.5, 8.5)
        await expect(powerBtn).toContainText('Power: 7, 8, 9');

        // Verify the correct checkboxes are checked
        const checkbox7 = page.locator('.player-row:first-child .power-checkbox input[value="7"]');
        const checkbox75 = page.locator('.player-row:first-child .power-checkbox input[value="7.5"]');
        const checkbox8 = page.locator('.player-row:first-child .power-checkbox input[value="8"]');
        const checkbox85 = page.locator('.player-row:first-child .power-checkbox input[value="8.5"]');
        const checkbox9 = page.locator('.player-row:first-child .power-checkbox input[value="9"]');
        
        await expect(checkbox7).toBeChecked();
        await expect(checkbox75).not.toBeChecked(); // Should NOT be checked
        await expect(checkbox8).toBeChecked();
        await expect(checkbox85).not.toBeChecked(); // Should NOT be checked
        await expect(checkbox9).toBeChecked();
    });

    test('should support decimal ranges when start or end is decimal', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Add a player first
        await helper.players.createPlayers([{ name: 'Test Player', power: [] }]);

        const powerBtn = page.locator('.player-row:first-child .power-selector-btn');
        
        // Focus the power selector button
        await powerBtn.focus();
        
        // Type "6.5-8" followed by Enter (should include decimals since start is decimal)
        await page.keyboard.press('6');
        await page.keyboard.press('.');
        await page.keyboard.press('5');
        await page.keyboard.press('-');
        await page.keyboard.press('8');
        await page.keyboard.press('Enter');
        
        // Verify that decimal power levels are included
        await expect(powerBtn).toContainText('4 Powers Selected');

        // Verify the checkboxes are actually checked
        const checkbox65 = page.locator('.player-row:first-child .power-checkbox input[value="6.5"]');
        const checkbox7 = page.locator('.player-row:first-child .power-checkbox input[value="7"]');
        const checkbox75 = page.locator('.player-row:first-child .power-checkbox input[value="7.5"]');
        const checkbox8 = page.locator('.player-row:first-child .power-checkbox input[value="8"]');
        
        await expect(checkbox65).toBeChecked();
        await expect(checkbox7).toBeChecked();
        await expect(checkbox75).toBeChecked();
        await expect(checkbox8).toBeChecked();
    });

    test('should support Escape key to close dropdown', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Add a player first
        await helper.players.createPlayers([{ name: 'Test Player', power: [] }]);

        const powerBtn = page.locator('.player-row:first-child .power-selector-btn');
        const dropdown = page.locator('.player-row:first-child .power-selector-dropdown');
        
        // Click to open dropdown
        await powerBtn.click();
        await page.waitForSelector('.player-row:first-child .power-selector-dropdown', { state: 'visible' });
        
        // Focus the power selector button
        await powerBtn.focus();
        
        // Press Escape to close dropdown
        await page.keyboard.press('Escape');
        
        // Wait a moment for the dropdown to close
        await page.waitForTimeout(200);
        
        // Verify dropdown is closed
        await expect(dropdown).toBeHidden();
    });

    test('should support Backspace to edit power input', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Add a player first
        await helper.players.createPlayers([{ name: 'Test Player', power: [] }]);

        const powerBtn = page.locator('.player-row:first-child .power-selector-btn');
        
        // Focus the power selector button
        await powerBtn.focus();
        
        // Type "75", then backspace to make "7", then Enter
        await page.keyboard.press('7');
        await page.keyboard.press('5');
        await page.keyboard.press('Backspace');
        await page.keyboard.press('Enter');
        
        // Verify that power level 7 was selected (not 75)
        await expect(powerBtn).toContainText('Power: 7');

        // Verify the checkbox is actually checked
        const checkbox7 = page.locator('.player-row:first-child .power-checkbox input[value="7"]');
        await expect(checkbox7).toBeChecked();
    });

    test('should auto-apply power selection after timeout', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Add a player first
        await helper.players.createPlayers([{ name: 'Test Player', power: [] }]);

        const powerBtn = page.locator('.player-row:first-child .power-selector-btn');
        
        // Focus the power selector button
        await powerBtn.focus();
        
        // Type "8" and wait for auto-apply timeout (1 second)
        await page.keyboard.press('8');
        await page.waitForTimeout(1200); // Wait longer than 1 second timeout
        
        // Verify that power level 8 was selected automatically
        await expect(powerBtn).toContainText('Power: 8');

        // Verify the checkbox is actually checked
        const checkbox8 = page.locator('.player-row:first-child .power-checkbox input[value="8"]');
        await expect(checkbox8).toBeChecked();
    });

    test('should handle decimal power levels correctly', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Add a player first
        await helper.players.createPlayers([{ name: 'Test Player', power: [] }]);

        const powerBtn = page.locator('.player-row:first-child .power-selector-btn');
        
        // Focus the power selector button
        await powerBtn.focus();
        
        // Type "6.5" followed by Enter
        await page.keyboard.press('6');
        await page.keyboard.press('.');
        await page.keyboard.press('5');
        await page.keyboard.press('Enter');
        
        // Verify that power level 6.5 was selected
        await expect(powerBtn).toContainText('Power: 6.5');

        // Verify the checkbox is actually checked
        const checkbox65 = page.locator('.player-row:first-child .power-checkbox input[value="6.5"]');
        await expect(checkbox65).toBeChecked();
    });

    test('should clear previous selection when typing new power', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Add a player first and set initial power
        await helper.players.createPlayers([{ name: 'Test Player', power: [5] }]);

        const powerBtn = page.locator('.player-row:first-child .power-selector-btn');
        
        // Verify initial selection
        await expect(powerBtn).toContainText('Power: 5');
        
        // Focus the power selector button
        await powerBtn.focus();
        
        // Type "7" followed by Enter to change selection
        await page.keyboard.press('7');
        await page.keyboard.press('Enter');
        
        // Verify that only power level 7 is selected (5 should be cleared)
        await expect(powerBtn).toContainText('Power: 7');

        // Verify the checkboxes
        const checkbox5 = page.locator('.player-row:first-child .power-checkbox input[value="5"]');
        const checkbox7 = page.locator('.player-row:first-child .power-checkbox input[value="7"]');
        await expect(checkbox5).not.toBeChecked();
        await expect(checkbox7).toBeChecked();
    });
});
