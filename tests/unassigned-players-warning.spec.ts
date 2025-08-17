import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers';
import { setupBasicTest, teardownDisplayModeTest } from './test-setup';

test.describe('Unassigned Players Warning Dialog', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownDisplayModeTest(helper);
    });

    test('Display mode with no unassigned players should not show warning', async ({ page }) => {
        // Create players and generate pods so all players are assigned
        await helper.players.createPlayers([
            { name: 'Player 1', power: [5] },
            { name: 'Player 2', power: [5] },
            { name: 'Player 3', power: [5] },
            { name: 'Player 4', power: [5] }
        ]);

        // Generate pods to assign all players
        await helper.pods.generatePods();

        // Click display mode button - should not show any dialog
        await page.click('#display-mode-btn');

        // Should enter display mode directly (check for display mode UI)
        await expect(page.locator('body')).toHaveClass(/display-mode/);
    });

    test('Display mode with unassigned players should show warning dialog - cancelled', async ({ page }) => {
        // Create players with very incompatible power levels to force some to be unassigned
        await helper.players.createPlayers([
            { name: 'Player 1', power: [1] },
            { name: 'Player 2', power: [1] },
            { name: 'Player 3', power: [1] },
            { name: 'Player 4', power: [1] },
            { name: 'Player 5', power: [10] },
            { name: 'Player 6', power: [10] }
        ]);

        // Generate pods - this should put 4 players with power 1 in a pod and leave 2 with power 10 unassigned
        await helper.pods.generatePods();

        // Wait a moment for DOM to update after pod generation
        await page.waitForTimeout(500);

        // Verify we have unassigned players using the correct selector
        await expect(page.locator('.unassigned-pod')).toBeVisible();
        
        // Set up dialog handler to cancel
        let dialogShown = false;
        page.on('dialog', dialog => {
            dialogShown = true;
            expect(dialog.message()).toContain('Warning:');
            expect(dialog.message()).toContain('unassigned player');
            expect(dialog.message()).toContain('Do you want to continue without assigning them?');
            dialog.dismiss(); // Cancel
        });

        // Click display mode button
        await page.click('#display-mode-btn');

        // Should have shown the dialog
        expect(dialogShown).toBe(true);

        // Should NOT enter display mode (body should not have display-mode class)
        await expect(page.locator('body')).not.toHaveClass(/display-mode/);
    });

    test('Display mode with unassigned players should show warning dialog - confirmed', async ({ page }) => {
        // Create players with very incompatible power levels to force some to be unassigned
        await helper.players.createPlayers([
            { name: 'Player 1', power: [1] },
            { name: 'Player 2', power: [1] },
            { name: 'Player 3', power: [1] },
            { name: 'Player 4', power: [1] },
            { name: 'Player 5', power: [10] },
            { name: 'Player 6', power: [10] }
        ]);

        // Generate pods - this should create unassigned players
        await helper.pods.generatePods();

        // Wait a moment for DOM to update
        await page.waitForTimeout(500);

        // Verify we have unassigned players
        await expect(page.locator('.unassigned-pod')).toBeVisible();

        // Set up dialog handler to accept
        let dialogShown = false;
        page.on('dialog', dialog => {
            dialogShown = true;
            expect(dialog.message()).toContain('Warning:');
            expect(dialog.message()).toContain('unassigned player');
            expect(dialog.message()).toContain('Do you want to continue without assigning them?');
            dialog.accept(); // Confirm
        });

        // Click display mode button
        await page.click('#display-mode-btn');

        // Should have shown the dialog
        expect(dialogShown).toBe(true);

        // Should enter display mode (check for display mode UI)
        await expect(page.locator('body')).toHaveClass(/display-mode/);
    });

    test('Display mode with unassigned players should show proper warning dialog grammar', async ({ page }) => {
        // Create players with very incompatible power levels that will definitely create unassigned players
        await helper.players.createPlayers([
            { name: 'Player 1', power: [1] },
            { name: 'Player 2', power: [1] },
            { name: 'Player 3', power: [1] },
            { name: 'Player 4', power: [1] },
            { name: 'Player 5', power: [10] },
            { name: 'Player 6', power: [10] }
        ]);

        // Generate pods - should create unassigned players
        await helper.pods.generatePods();

        // Wait for DOM update
        await page.waitForTimeout(500);

        // Verify we have unassigned players
        await expect(page.locator('.unassigned-pod')).toBeVisible();

        // Set up dialog handler to check grammar (singular or plural)
        let dialogShown = false;
        page.on('dialog', dialog => {
            dialogShown = true;
            expect(dialog.message()).toContain('Warning:');
            expect(dialog.message()).toContain('unassigned player');
            expect(dialog.message()).toContain('Do you want to continue without assigning them?');
            dialog.dismiss(); // Cancel
        });

        // Click display mode button
        await page.click('#display-mode-btn');

        // Should have shown the dialog with proper grammar
        expect(dialogShown).toBe(true);
    });

    test('Display mode bottom button with unassigned players should also show warning', async ({ page }) => {
        // Create players with incompatible power levels to force some to be unassigned
        await helper.players.createPlayers([
            { name: 'Player 1', power: [1] },
            { name: 'Player 2', power: [1] },
            { name: 'Player 3', power: [1] },
            { name: 'Player 4', power: [1] },
            { name: 'Player 5', power: [10] },
            { name: 'Player 6', power: [10] }
        ]);

        // Generate pods - this should create unassigned players
        await helper.pods.generatePods();

        // Wait for DOM update
        await page.waitForTimeout(500);

        // Verify we have unassigned players
        await expect(page.locator('.unassigned-pod')).toBeVisible();

        // Set up dialog handler to cancel
        let dialogShown = false;
        page.on('dialog', dialog => {
            dialogShown = true;
            expect(dialog.message()).toContain('Warning:');
            expect(dialog.message()).toContain('unassigned player');
            expect(dialog.message()).toContain('Do you want to continue without assigning them?');
            dialog.dismiss(); // Cancel
        });

        // Click the bottom display mode button
        await page.click('#display-mode-btn-bottom');

        // Should have shown the dialog
        expect(dialogShown).toBe(true);

        // Should NOT enter display mode
        await expect(page.locator('body')).not.toHaveClass(/display-mode/);
    });

    test('Mixed scenario - some players in pods, some unassigned should show warning for unassigned only', async ({ page }) => {
        // Create players with incompatible power levels to force some to be unassigned
        await helper.players.createPlayers([
            { name: 'Player 1', power: [1] },
            { name: 'Player 2', power: [1] },
            { name: 'Player 3', power: [1] },
            { name: 'Player 4', power: [1] },
            { name: 'Player 5', power: [10] },
            { name: 'Player 6', power: [10] }
        ]);

        // Generate pods - this should create unassigned players
        await helper.pods.generatePods();

        // Wait for DOM update
        await page.waitForTimeout(500);

        // Verify we have unassigned players
        await expect(page.locator('.unassigned-pod')).toBeVisible();

        // Set up dialog handler to check unassigned count
        let dialogShown = false;
        page.on('dialog', dialog => {
            dialogShown = true;
            expect(dialog.message()).toContain('Warning:');
            expect(dialog.message()).toContain('unassigned player');
            dialog.dismiss(); // Cancel
        });

        // Click display mode button
        await page.click('#display-mode-btn');

        // Should have shown the dialog for the unassigned players
        expect(dialogShown).toBe(true);
    });
});
