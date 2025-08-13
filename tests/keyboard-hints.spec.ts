import { test, expect } from '@playwright/test';
import { setupBasicTest, teardownBasicTest } from './test-setup';
import TestHelper from './test-helpers';

test.describe('Keyboard Hint UI Features', () => {
    let helper: TestHelper;

    test.afterEach(async () => {
        if (helper) {
            await teardownBasicTest(helper);
        }
    });

    test('should display keyboard hints in power selector dropdown', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Click to open power selector dropdown
        const powerBtn = page.locator('.player-row:first-child .power-selector-btn');
        await powerBtn.click();

        // Wait for dropdown to be visible
        await page.waitForSelector('.player-row:first-child .power-selector-dropdown', { state: 'visible' });

        // Check that keyboard hint is visible
        const keyboardHint = page.locator('.player-row:first-child .power-selector-dropdown .keyboard-hint');
        await expect(keyboardHint).toBeVisible();
        await expect(keyboardHint).toContainText('💡 Focus button + type: 7, 7-9, 6.5-8, Esc');
    });

    test('should display keyboard hints in bracket selector dropdown', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Switch to bracket mode
        await page.click('#bracket-radio');
        await page.waitForTimeout(100);

        // Click to open bracket selector dropdown
        const bracketBtn = page.locator('.player-row:first-child .bracket-selector-btn');
        await bracketBtn.click();

        // Wait for dropdown to be visible
        await page.waitForSelector('.player-row:first-child .bracket-selector-dropdown', { state: 'visible' });

        // Check that keyboard hint is visible
        const keyboardHint = page.locator('.player-row:first-child .bracket-selector-dropdown .keyboard-hint');
        await expect(keyboardHint).toBeVisible();
        await expect(keyboardHint).toContainText('💡 Focus button + type: 1, 2, 3, 4, 5/c (cEDH)');
    });

    test('should not interfere with existing keyboard functionality', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Focus the power selector button and test keyboard input still works
        const powerBtn = page.locator('.player-row:first-child .power-selector-btn');
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
});
