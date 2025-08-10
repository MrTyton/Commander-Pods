import { test, expect } from '@playwright/test';
import { setupValidationTest, setupBracketModeTest, teardownBasicTest } from './test-setup';
import TestHelper from './test-helpers';

test.describe('Real-time Validation Behavior', () => {
    let helper: TestHelper;

    test.describe('Power Mode Validation', () => {
        test.beforeEach(async ({ page }) => {
            helper = await setupValidationTest(page);
        });

        test.afterEach(async () => {
            await teardownBasicTest(helper);
        });

        test('user-friendly validation for player fields', async () => {
            // New rows should NOT start with errors
            await helper.validation.expectNameInputValid(1);
            await helper.validation.expectPowerButtonValid(1);

            // Name validation should only trigger after the user interacts with the field
            const nameInput = helper.players.getNameInput(1);
            await nameInput.click();
            await nameInput.fill('Test');
            await nameInput.fill(''); // Clear it

            // Now that the field has been touched, it should show error for empty value
            await helper.validation.expectNameInputError(1);

            // Fill name properly
            await helper.players.setPlayerName(1, 'Test Player');
            await helper.validation.expectNameInputValid(1);

            // Power/bracket validation should only trigger when pods are generated
            await helper.validation.expectPowerButtonValid(1);

            // Try to generate pods - this should trigger validation
            await helper.validation.triggerValidation();

            // Now power button should show error since no power levels selected
            await helper.validation.expectPowerButtonError(1);

            // Select a power level - error should clear immediately
            await helper.players.setPowerLevels(1, [7]);

            // Error should be removed
            await helper.validation.expectPowerButtonValid(1);
        });
    });

    test.describe('Bracket Mode Validation', () => {
        test.beforeEach(async ({ page }) => {
            helper = await setupBracketModeTest(page);
        });

        test.afterEach(async () => {
            await teardownBasicTest(helper);
        });

        test('bracket mode validation behavior', async () => {
            const nameInput = helper.players.getNameInput(1);

            // Fill name
            await helper.players.setPlayerName(1, 'Player 1');

            // Bracket button should not show error initially
            await helper.validation.expectBracketButtonValid(1);

            // Try to generate pods - should trigger validation
            await helper.validation.triggerValidation();

            // Now bracket button should show error
            await helper.validation.expectBracketButtonError(1);

            // Select a bracket - error should clear
            await helper.players.setBracketLevels(1, [3]);

            // Error should be removed
            await helper.validation.expectBracketButtonValid(1);
        });
    });
});

test('Multiple players validation flow', async ({ page }) => {
    await page.goto('./index.html');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Use existing first player row and set it up properly
    await page.fill('.player-row:nth-child(1) .player-name', 'Player 1');
    const powerBtn1 = page.locator('.player-row:nth-child(1) .power-selector-btn');
    await powerBtn1.click();
    await page.waitForSelector('.player-row:nth-child(1) .power-checkbox input[value="7"]', { state: 'visible' });
    await page.check('.player-row:nth-child(1) .power-checkbox input[value="7"]');
    await powerBtn1.click();

    // Use existing second player row but leave it empty
    const secondRowName = page.locator('.player-row:nth-child(2) .player-name');
    const secondRowPower = page.locator('.player-row:nth-child(2) .power-selector-btn');

    // Second player should NOT have errors initially
    await expect(secondRowName).not.toHaveClass(/input-error/);
    await expect(secondRowPower).not.toHaveClass(/error/);

    // Try to generate pods - should trigger validation for all rows
    await page.click('#generate-pods-btn');

    // Now second player should have validation errors
    await expect(secondRowName).toHaveClass(/input-error/);
    await expect(secondRowPower).toHaveClass(/error/);

    // First player should still be valid
    await expect(page.locator('.player-row:nth-child(1) .player-name')).not.toHaveClass(/input-error/);
    await expect(page.locator('.player-row:nth-child(1) .power-selector-btn')).not.toHaveClass(/error/);

    // Fix second player's name
    await page.fill('.player-row:nth-child(2) .player-name', 'Player 2');
    await expect(secondRowName).not.toHaveClass(/input-error/);

    // Power error should still be there until fixed
    await expect(secondRowPower).toHaveClass(/error/);

    // Fix power level
    await secondRowPower.click();
    await page.waitForSelector('.player-row:nth-child(2) .power-checkbox input[value="6"]', { state: 'visible' });
    await page.check('.player-row:nth-child(2) .power-checkbox input[value="6"]');
    await secondRowPower.click();

    // All errors should be gone
    await expect(secondRowPower).not.toHaveClass(/error/);
});
