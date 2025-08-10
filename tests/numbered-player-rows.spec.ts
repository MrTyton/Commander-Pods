import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers';

test.describe('Numbered Player Rows', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
        await helper.setup.goto();
        await helper.setup.reset();
    });

    test('should display correct numbering when adding multiple players', async ({ page }) => {
        // Initial state should have 4 player rows numbered 1-4
        await expect(page.locator('.player-row')).toHaveCount(4);

        // Verify initial numbering
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);

        // Check specific numbers
        expect(await helper.players.getPlayerNumberText(0)).toBe('1');
        expect(await helper.players.getPlayerNumberText(1)).toBe('2');
        expect(await helper.players.getPlayerNumberText(2)).toBe('3');
        expect(await helper.players.getPlayerNumberText(3)).toBe('4');

        // Add 3 more players
        await helper.players.ensurePlayerRows(7);

        // Should now have 7 players numbered 1-7
        await expect(page.locator('.player-row')).toHaveCount(7);
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);

        // Check that all numbers are correct
        const allNumbers = await helper.players.getAllPlayerNumbers();
        expect(allNumbers).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    });

    test('should maintain proper numbering after adding single players', async ({ page }) => {
        // Start with 4 players
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);

        // Add one player at a time and verify numbering each time
        for (let i = 5; i <= 8; i++) {
            await helper.players.ensurePlayerRows(i);
            await expect(page.locator('.player-row')).toHaveCount(i);
            expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);

            // Verify the new player has the correct number
            expect(await helper.players.getPlayerNumberText(i - 1)).toBe(i.toString());
        }
    });

    test('should display numbers with proper styling', async ({ page }) => {
        // Check that player number elements exist and are visible
        const firstNumber = helper.players.getPlayerNumber(0);
        await expect(firstNumber).toBeVisible();

        // Verify the number element has the expected styling classes
        await expect(firstNumber).toHaveClass(/player-number/);

        // Check that numbers appear before the name input
        const firstRow = helper.players.getPlayerRow(0);
        const numberElement = firstRow.locator('.player-number');
        const nameInput = firstRow.locator('.player-name');

        // Both should be visible
        await expect(numberElement).toBeVisible();
        await expect(nameInput).toBeVisible();

        // Number should come before name in DOM order
        const numberBox = await numberElement.boundingBox();
        const nameBox = await nameInput.boundingBox();

        expect(numberBox).not.toBeNull();
        expect(nameBox).not.toBeNull();
        expect(numberBox!.x).toBeLessThan(nameBox!.x);
    });

    test('should renumber correctly when removing players from different positions', async ({ page }) => {
        // Start with 6 players to have room for removal testing
        await helper.players.ensurePlayerRows(6);
        await expect(page.locator('.player-row')).toHaveCount(6);

        // Verify initial numbering (1-6)
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);
        let allNumbers = await helper.players.getAllPlayerNumbers();
        expect(allNumbers).toEqual(['1', '2', '3', '4', '5', '6']);

        // Remove player from the beginning (position 0, number 1)
        await helper.players.removePlayer(0);
        await expect(page.locator('.player-row')).toHaveCount(5);
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);
        allNumbers = await helper.players.getAllPlayerNumbers();
        expect(allNumbers).toEqual(['1', '2', '3', '4', '5']);

        // Remove player from the middle (position 2, which should be number 3)
        await helper.players.removePlayer(2);
        await expect(page.locator('.player-row')).toHaveCount(4);
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);
        allNumbers = await helper.players.getAllPlayerNumbers();
        expect(allNumbers).toEqual(['1', '2', '3', '4']);

        // Remove player from the end (position 3, which should be number 4)
        await helper.players.removePlayer(3);
        await expect(page.locator('.player-row')).toHaveCount(3);
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);
        allNumbers = await helper.players.getAllPlayerNumbers();
        expect(allNumbers).toEqual(['1', '2', '3']);
    });

    test('should handle multiple consecutive removals correctly', async ({ page }) => {
        // Start with 8 players
        await helper.players.ensurePlayerRows(8);
        await expect(page.locator('.player-row')).toHaveCount(8);
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);

        // Remove multiple players in sequence from different positions
        // Remove from end first (safer)
        await helper.players.removePlayer(7); // Remove player 8
        await expect(page.locator('.player-row')).toHaveCount(7);
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);

        await helper.players.removePlayer(5); // Remove player 6 (now at index 5)
        await expect(page.locator('.player-row')).toHaveCount(6);
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);

        await helper.players.removePlayer(0); // Remove player 1
        await expect(page.locator('.player-row')).toHaveCount(5);
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);

        // Final verification
        const finalNumbers = await helper.players.getAllPlayerNumbers();
        expect(finalNumbers).toEqual(['1', '2', '3', '4', '5']);
    });

    test('should handle edge cases correctly', async ({ page }) => {
        // Test with single player
        // First remove players until only one remains
        const initialCount = await page.locator('.player-row').count();
        for (let i = initialCount - 1; i > 0; i--) {
            await helper.players.removePlayer(i);
        }

        await expect(page.locator('.player-row')).toHaveCount(1);
        expect(await helper.players.getPlayerNumberText(0)).toBe('1');

        // Add players back rapidly
        await helper.players.ensurePlayerRows(5);
        await expect(page.locator('.player-row')).toHaveCount(5);
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);

        // Test rapid add/remove operations
        await helper.players.ensurePlayerRows(10);
        await expect(page.locator('.player-row')).toHaveCount(10);
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);

        // Remove every other player
        await helper.players.removePlayer(8); // Remove 9
        await helper.players.removePlayer(6); // Remove 7 (now at index 6)
        await helper.players.removePlayer(4); // Remove 5 (now at index 4)
        await helper.players.removePlayer(2); // Remove 3 (now at index 2)

        await expect(page.locator('.player-row')).toHaveCount(6);
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);

        const finalNumbers = await helper.players.getAllPlayerNumbers();
        expect(finalNumbers).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    test('should handle reset functionality with numbering', async ({ page }) => {
        // Add many players
        await helper.players.ensurePlayerRows(12);
        await expect(page.locator('.player-row')).toHaveCount(12);
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);

        // Reset application
        await helper.setup.reset();

        // Should be back to default 4 players numbered 1-4
        await expect(page.locator('.player-row')).toHaveCount(4);
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);

        const resetNumbers = await helper.players.getAllPlayerNumbers();
        expect(resetNumbers).toEqual(['1', '2', '3', '4']);
    });

    test('should work correctly with player names and power levels', async ({ page }) => {
        // Create players with names and power levels
        await helper.players.createPlayers([
            { name: 'Alice', power: '7' },
            { name: 'Bob', power: '8' },
            { name: 'Charlie', power: '6' },
            { name: 'Dave', power: '9' }
        ]);

        // Verify numbering is maintained
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);

        // Verify names are correctly set
        expect(await helper.players.getPlayerName(0)).toBe('Alice');
        expect(await helper.players.getPlayerName(1)).toBe('Bob');
        expect(await helper.players.getPlayerName(2)).toBe('Charlie');
        expect(await helper.players.getPlayerName(3)).toBe('Dave');

        // Verify numbers correspond to correct players
        expect(await helper.players.getPlayerNumberText(0)).toBe('1'); // Alice
        expect(await helper.players.getPlayerNumberText(1)).toBe('2'); // Bob
        expect(await helper.players.getPlayerNumberText(2)).toBe('3'); // Charlie
        expect(await helper.players.getPlayerNumberText(3)).toBe('4'); // Dave

        // Remove a player and verify numbering updates but names stay with correct numbers
        await helper.players.removePlayer(1); // Remove Bob

        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);
        expect(await helper.players.getPlayerName(0)).toBe('Alice');   // Still player 1
        expect(await helper.players.getPlayerName(1)).toBe('Charlie'); // Now player 2
        expect(await helper.players.getPlayerName(2)).toBe('Dave');    // Now player 3

        expect(await helper.players.getPlayerNumberText(0)).toBe('1');
        expect(await helper.players.getPlayerNumberText(1)).toBe('2');
        expect(await helper.players.getPlayerNumberText(2)).toBe('3');
    });

    test('should work correctly with groups', async ({ page }) => {
        // Create players and assign to groups
        await helper.players.createPlayers([
            { name: 'Alice', power: '7' },
            { name: 'Bob', power: '7' },
            { name: 'Charlie', power: '8' },
            { name: 'Dave', power: '8' },
            { name: 'Eve', power: '6' },
            { name: 'Frank', power: '6' }
        ]);

        // Verify initial numbering
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);

        // Create groups
        await helper.groups.createNewGroup(0); // Alice starts group 1
        await helper.groups.addPlayerToGroup(1, 'group-1'); // Bob joins group 1

        await helper.groups.createNewGroup(2); // Charlie starts group 2  
        await helper.groups.addPlayerToGroup(3, 'group-2'); // Dave joins group 2

        // Verify numbering is still correct after group operations
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);

        // Remove a player from the middle and verify both numbering and groups still work
        await helper.players.removePlayer(2); // Remove Charlie (group creator)

        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);
        const finalNumbers = await helper.players.getAllPlayerNumbers();
        expect(finalNumbers).toEqual(['1', '2', '3', '4', '5']);
    });

    test('should work correctly with pod generation', async ({ page }) => {
        // Create 8 players with names and power levels for pod generation
        await helper.players.createPlayers([
            { name: 'Player1', power: '7' },
            { name: 'Player2', power: '7' },
            { name: 'Player3', power: '7' },
            { name: 'Player4', power: '7' },
            { name: 'Player5', power: '8' },
            { name: 'Player6', power: '8' },
            { name: 'Player7', power: '8' },
            { name: 'Player8', power: '8' }
        ]);

        // Verify numbering before pod generation
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);
        const preGenNumbers = await helper.players.getAllPlayerNumbers();
        expect(preGenNumbers).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);

        // Generate pods
        await helper.pods.generatePods();

        // Verify that pods were generated using proper helper methods
        const podCount = await helper.pods.getPods().count();
        expect(podCount).toBeGreaterThan(0);

        // Use helper method to verify pod count
        await helper.pods.expectPodCount(podCount);

        // Return to input mode and verify numbering is still intact
        await helper.displayMode.exitDisplayMode();

        // Verify numbering is still correct after pod generation
        expect(await helper.players.verifyPlayerNumberSequence()).toBe(true);
        const postGenNumbers = await helper.players.getAllPlayerNumbers();
        expect(postGenNumbers).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);

        // Verify names are still correct
        expect(await helper.players.getPlayerName(0)).toBe('Player1');
        expect(await helper.players.getPlayerName(7)).toBe('Player8');
    });
});
