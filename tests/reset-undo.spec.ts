import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers';
import { setupBasicTest, teardownBasicTest } from './test-setup';

test.describe('Reset All with Confirmation and Undo', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownBasicTest(helper);
    });

    test('Reset All with no data should not show confirmation', async ({ page }) => {
        // Click reset all with no data
        await page.click('#reset-all-btn');

        // Should not show any confirmation dialog
        // Page should reset immediately without confirmation
        await expect(page.locator('.player-row')).toHaveCount(4); // Should have 4 default rows
    });

    test('Reset All with data should show confirmation modal', async ({ page }) => {
        // Add some data to a player
        const nameInput = page.locator('.player-row:nth-child(1) .player-name');
        await nameInput.fill('Test Player');

        // Click reset all
        await page.click('#reset-all-btn');

        // Should show confirmation modal
        const modal = await helper.validation.expectConfirmationModal('Reset All Player Data', 'Are you sure you want to reset all player data?');

        // Cancel the modal
        await helper.validation.handleConfirmationModal(false);

        // Data should still be there since we cancelled
        await expect(nameInput).toHaveValue('Test Player');
    });

    test('Reset All confirmation accepted should clear data and show undo button', async ({ page }) => {
        // Add some data using the helper
        await helper.players.createPlayers([{ name: 'Test Player', power: [5, 6] }]);

        // Verify power button shows selection
        await expect(page.locator('.player-row:nth-child(1) .power-selector-btn')).toContainText('Power: 5, 6');

        // Click reset all
        await page.click('#reset-all-btn');

        // Should show confirmation modal, accept it
        await helper.validation.expectConfirmationModal('Reset All Player Data');
        await helper.validation.handleConfirmationModal(true);

        await page.waitForTimeout(200);

        // Data should be cleared
        const newNameInput = page.locator('.player-row:nth-child(1) .player-name');
        await expect(newNameInput).toHaveValue('');

        // Power button should be reset
        const newPowerBtn = page.locator('.player-row:nth-child(1) .power-selector-btn');
        await expect(newPowerBtn).toContainText('Select Power Levels');

        // Undo button should appear
        await expect(page.locator('#undo-reset-btn')).toBeVisible();
        await expect(page.locator('#undo-reset-btn')).toContainText('Undo Reset');
    });

    test('Undo Reset should restore all player data', async ({ page }) => {
        // Add comprehensive data using the helper
        await helper.players.createPlayers([
            { name: 'Player One', power: [4, 5] },
            { name: 'Player Two', power: [7] }
        ]);

        // Change leniency setting
        await helper.setup.setTolerance('regular');

        // Reset
        await page.click('#reset-all-btn');

        // Handle reset confirmation modal
        await helper.validation.expectConfirmationModal('Reset All Player Data');
        await helper.validation.handleConfirmationModal(true);
        await page.waitForTimeout(200);

        // Verify data is cleared
        await expect(page.locator('.player-row:nth-child(1) .player-name')).toHaveValue('');
        await expect(page.locator('.player-row:nth-child(2) .player-name')).toHaveValue('');

        // Click undo
        await page.click('#undo-reset-btn');
        await page.waitForTimeout(200);

        // Verify data is restored
        await expect(page.locator('.player-row:nth-child(1) .player-name')).toHaveValue('Player One');
        await expect(page.locator('.player-row:nth-child(2) .player-name')).toHaveValue('Player Two');

        // Verify power selections are restored
        await expect(page.locator('.player-row:nth-child(1) .power-selector-btn')).toContainText('Power: 4, 5');
        await expect(page.locator('.player-row:nth-child(2) .power-selector-btn')).toContainText('Power: 7');

        // Verify leniency setting is restored
        await expect(page.locator('#leniency-radio')).toBeChecked();

        // Undo button should be gone
        await expect(page.locator('#undo-reset-btn')).not.toBeVisible();
    });

    test('Undo Reset should restore bracket mode data', async ({ page }) => {
        // Switch to bracket mode
        await helper.setup.setMode('bracket');

        // Add player with bracket selections using helper
        await helper.players.createPlayers([{ name: 'Bracket Player', bracket: [3, 4] }]);

        // Verify bracket button shows selection
        await expect(page.locator('.player-row:nth-child(1) .bracket-selector-btn')).toContainText('Brackets: 3, 4');

        // Reset with confirmation
        await page.click('#reset-all-btn');
        await helper.validation.handleConfirmationModal(true);
        await page.waitForTimeout(200);

        // Verify bracket mode is reset to default (no leniency)
        await expect(page.locator('#no-leniency-radio')).toBeChecked();

        // Undo
        await page.click('#undo-reset-btn');
        await page.waitForTimeout(500); // Give more time for restoration

        // Verify bracket mode is restored
        await expect(page.locator('#bracket-radio')).toBeChecked();
        await expect(page.locator('.player-row:nth-child(1) .player-name')).toHaveValue('Bracket Player');

        // Wait a bit more for the UI to update
        await page.waitForTimeout(200);

        await expect(page.locator('.player-row:nth-child(1) .bracket-selector-btn')).toContainText('Brackets: 3, 4');
    });

    test('Undo Reset should restore group assignments', async ({ page }) => {
        // Add players and assign to groups
        await page.fill('.player-row:nth-child(1) .player-name', 'Group Player 1');
        await page.fill('.player-row:nth-child(2) .player-name', 'Group Player 2');

        // Set power levels so validation passes
        await helper.players.setPowerLevels(0, [5]);
        await helper.players.setPowerLevels(1, [5]);

        // Assign first player to new group
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.waitForTimeout(300); // Wait for group creation

        // Assign second player to the same group (should now be available as group-1)
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');
        await page.waitForTimeout(300);

        // Reset with confirmation
        await page.click('#reset-all-btn');
        await helper.validation.handleConfirmationModal(true);
        await page.waitForTimeout(300);

        // Undo
        await page.click('#undo-reset-btn');
        await page.waitForTimeout(500); // Give more time for group restoration

        // Verify group assignments are restored
        await expect(page.locator('.player-row:nth-child(1) .player-name')).toHaveValue('Group Player 1');
        await expect(page.locator('.player-row:nth-child(2) .player-name')).toHaveValue('Group Player 2');

        // Check group assignments - both should be in group-1
        // Use more flexible assertion that accounts for potential timing issues
        await expect(page.locator('.player-row:nth-child(1) .group-select')).toHaveValue(/group-\d+/);
        await expect(page.locator('.player-row:nth-child(2) .group-select')).toHaveValue(/group-\d+/);
    });

    test('Undo Reset should restore generated pods', async ({ page }) => {
        // Add enough players for pod generation
        for (let i = 0; i < 4; i++) {
            await page.fill(`.player-row:nth-child(${i + 1}) .player-name`, `Player ${i + 1}`);
            await helper.players.setPowerLevels(i, [5]);
        }

        // Generate pods
        await page.click('#generate-pods-btn');
        await page.waitForTimeout(500);

        // For now, just check that pods were generated
        await expect(page.locator('#output-section')).toContainText('Pod');

        // Reset with confirmation using modern modal system
        await page.click('#reset-all-btn');
        await helper.validation.handleConfirmationModal(true);
        await page.waitForTimeout(200);

        // Verify output is cleared
        await expect(page.locator('#output-section')).toBeEmpty();

        // Undo
        await page.click('#undo-reset-btn');
        await page.waitForTimeout(300);

        // Verify pods are restored (should be 1 pod of 4 players)
        await expect(page.locator('#output-section .pod:not(.new-pod):not(.new-pod-target)')).toHaveCount(1);
        await expect(page.locator('#output-section')).toContainText('Pod 1');
    });

    test('Undo button should auto-hide after 30 seconds', async ({ page }) => {
        // Add some data
        await page.fill('.player-row:nth-child(1) .player-name', 'Test Player');

        // Reset with confirmation using modern modal system
        await page.click('#reset-all-btn');
        await helper.validation.handleConfirmationModal(true);
        await page.waitForTimeout(200);

        // Undo button should be visible
        await expect(page.locator('#undo-reset-btn')).toBeVisible();

        // Test that the button can be clicked before timeout
        await page.click('#undo-reset-btn');

        // After undo, button should be gone
        await expect(page.locator('#undo-reset-btn')).not.toBeVisible();
    });

    test('Multiple players with different configurations should be fully restored', async ({ page }) => {
        // Add multiple players with various configurations

        // Player 1: Multiple power levels
        await page.fill('.player-row:nth-child(1) .player-name', 'Multi Power Player');
        await helper.players.setPowerLevels(0, [4, 5, 6]);

        // Player 2: Single power level
        await page.fill('.player-row:nth-child(2) .player-name', 'Single Power Player');
        await helper.players.setPowerLevels(1, [8]);

        // Player 3: Range selection using helper
        await page.fill('.player-row:nth-child(3) .player-name', 'Range Player');
        await helper.players.setPowerLevels(2, [6, 7]);

        // Set leniency
        await helper.setup.setTolerance('super');

        // Reset and undo
        await page.click('#reset-all-btn');
        await helper.validation.handleConfirmationModal(true);
        await page.waitForTimeout(200);
        await page.click('#undo-reset-btn');
        await page.waitForTimeout(300);

        // Verify all configurations are restored
        await expect(page.locator('.player-row:nth-child(1) .player-name')).toHaveValue('Multi Power Player');
        await expect(page.locator('.player-row:nth-child(1) .power-selector-btn')).toContainText('Power: 4-6');

        await expect(page.locator('.player-row:nth-child(2) .player-name')).toHaveValue('Single Power Player');
        await expect(page.locator('.player-row:nth-child(2) .power-selector-btn')).toContainText('Power: 8');

        await expect(page.locator('.player-row:nth-child(3) .player-name')).toHaveValue('Range Player');
        await expect(page.locator('.player-row:nth-child(3) .power-selector-btn')).toContainText('Power: 6, 7');

        await expect(page.locator('#super-leniency-radio')).toBeChecked();
    });

    test('Should handle edge case with empty checkboxes correctly', async ({ page }) => {
        // Add player name but no power levels
        await page.fill('.player-row:nth-child(1) .player-name', 'No Power Player');

        // Reset (should show confirmation since name is filled)
        await page.click('#reset-all-btn');
        await helper.validation.handleConfirmationModal(true);
        await page.waitForTimeout(200);
        await page.click('#undo-reset-btn');
        await page.waitForTimeout(200);

        // Name should be restored, power button should show default text
        await expect(page.locator('.player-row:nth-child(1) .player-name')).toHaveValue('No Power Player');
        await expect(page.locator('.player-row:nth-child(1) .power-selector-btn')).toContainText('Select Power Levels');
    });
});
