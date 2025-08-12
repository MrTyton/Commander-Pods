import { test, expect } from '@playwright/test';
import { setupBasicTest, teardownBasicTest } from './test-setup';
import TestHelper from './test-helpers';

test.describe('Keyboard Shortcuts and Bulk Operations', () => {
    let helper: TestHelper;

    test.afterEach(async () => {
        if (helper) {
            await teardownBasicTest(helper);
        }
    });

    test('should add new player row with Ctrl+Enter shortcut', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Check initial player count
        const initialPlayerCount = await page.locator('.player-row').count();

        // Press Ctrl+Enter to add a player
        await page.keyboard.press('Control+Enter');
        await page.waitForTimeout(100); // Brief wait for DOM update

        // Check that a new player row was added
        const newPlayerCount = await page.locator('.player-row').count();
        expect(newPlayerCount).toBe(initialPlayerCount + 1);

        // Check that the name input of the new player is focused
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toHaveClass(/player-name/);
    });

    test('should add multiple players with bulk add button', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Check initial player count
        const initialPlayerCount = await page.locator('.player-row').count();

        // Click the "Add 4 Players" button
        await page.click('#bulk-add-btn');
        await page.waitForTimeout(200); // Brief wait for DOM updates

        // Check that 4 new player rows were added
        const newPlayerCount = await page.locator('.player-row').count();
        expect(newPlayerCount).toBe(initialPlayerCount + 4);
    });

    test('should work with multiple Ctrl+Enter presses', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Check initial player count
        const initialPlayerCount = await page.locator('.player-row').count();

        // Press Ctrl+Enter multiple times
        await page.keyboard.press('Control+Enter');
        await page.waitForTimeout(50);
        await page.keyboard.press('Control+Enter');
        await page.waitForTimeout(50);
        await page.keyboard.press('Control+Enter');
        await page.waitForTimeout(100);

        // Check that 3 new player rows were added
        const newPlayerCount = await page.locator('.player-row').count();
        expect(newPlayerCount).toBe(initialPlayerCount + 3);
    });

    test('should not interfere with existing keyboard shortcuts', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Add a player first
        await helper.players.createPlayers([{ name: 'Test Player', power: [7] }]);

        // Try existing power level typing (this uses keydown events for power selection)
        const powerBtn = page.locator('.player-row:first-child .power-selector-btn');
        await powerBtn.click();

        // Type "7" to select power level 7
        await page.keyboard.press('7');
        await page.waitForTimeout(1000); // Wait for the sequence timeout

        // Verify that power level 7 was selected
        await expect(powerBtn).toContainText('Power: 7');

        // Ensure Ctrl+Enter still works after using power shortcuts
        const playerCountBefore = await page.locator('.player-row').count();
        await page.keyboard.press('Control+Enter');
        await page.waitForTimeout(100);
        const playerCountAfter = await page.locator('.player-row').count();
        expect(playerCountAfter).toBe(playerCountBefore + 1);
    });
});
