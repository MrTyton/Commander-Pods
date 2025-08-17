import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers';
import { setupBasicTest, teardownBasicTest } from './test-setup';

test.describe('Bracket Keyboard Fix Test', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownBasicTest(helper);
    });

    test('should allow typing bracket ranges without closing dropdown prematurely', async ({ page }) => {
        // Switch to bracket mode
        await page.click('#bracket-radio');

        // Add a player first
        await helper.players.createPlayers([{ name: 'Test Player', power: [] }]);

        const bracketBtn = page.locator('.player-row:first-child .bracket-selector-btn');
        const dropdown = page.locator('.player-row:first-child .bracket-selector-dropdown');

        // Click to open dropdown
        await bracketBtn.click();
        await expect(dropdown).toBeVisible();

        // Focus the bracket selector button
        await bracketBtn.focus();

        // Test typing a range "1-2" - should not close until Enter or timeout
        await page.keyboard.press('1');
        await expect(dropdown).toBeVisible(); // Should still be open
        
        await page.keyboard.press('-');
        await expect(dropdown).toBeVisible(); // Should still be open
        
        await page.keyboard.press('2');
        await expect(dropdown).toBeVisible(); // Should still be open
        
        // Press Enter to apply the range
        await page.keyboard.press('Enter');
        
        // Should have selected brackets 1 and 2, and closed dropdown
        await expect(bracketBtn).toContainText('Brackets: 1, 2');
        await expect(dropdown).not.toBeVisible();
    });

    test('should close bracket dropdown when using escape', async ({ page }) => {
        // Switch to bracket mode
        await page.click('#bracket-radio');

        // Add a player first
        await helper.players.createPlayers([{ name: 'Test Player', power: [] }]);

        const bracketBtn = page.locator('.player-row:first-child .bracket-selector-btn');
        const dropdown = page.locator('.player-row:first-child .bracket-selector-dropdown');

        // Click to open dropdown
        await bracketBtn.click();
        await expect(dropdown).toBeVisible();

        // Focus the bracket selector button
        await bracketBtn.focus();

        // Test Escape key - should close dropdown
        await page.keyboard.press('Escape');
        await expect(dropdown).not.toBeVisible();
    });

    test('should handle single bracket selection', async ({ page }) => {
        // Switch to bracket mode
        await page.click('#bracket-radio');

        // Add a player first
        await helper.players.createPlayers([{ name: 'Test Player', power: [] }]);

        const bracketBtn = page.locator('.player-row:first-child .bracket-selector-btn');
        const dropdown = page.locator('.player-row:first-child .bracket-selector-dropdown');

        // Click to open dropdown
        await bracketBtn.click();
        await expect(dropdown).toBeVisible();
        await bracketBtn.focus();

        // Test single bracket selection with '3' and Enter
        await page.keyboard.press('3');
        await page.keyboard.press('Enter');
        
        // Should have selected bracket 3 and closed dropdown
        await expect(bracketBtn).toContainText('Bracket: 3');
        await expect(dropdown).not.toBeVisible();
    });

    test('should handle cEDH selection with c key', async ({ page }) => {
        // Switch to bracket mode
        await page.click('#bracket-radio');

        // Add a player first
        await helper.players.createPlayers([{ name: 'Test Player', power: [] }]);

        const bracketBtn = page.locator('.player-row:first-child .bracket-selector-btn');
        const dropdown = page.locator('.player-row:first-child .bracket-selector-dropdown');

        // Click to open dropdown
        await bracketBtn.click();
        await expect(dropdown).toBeVisible();
        await bracketBtn.focus();

        // Test cEDH selection with 'c' and Enter
        await page.keyboard.press('c');
        await page.keyboard.press('Enter');
        
        // Should have selected cEDH and closed dropdown
        await expect(bracketBtn).toContainText('Bracket: cEDH');
        await expect(dropdown).not.toBeVisible();
    });
});
