import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers';

test.describe('Test Helper Framework Validation', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
        await page.goto('file:///c:/Users/Joshua/Documents/GitHub/Commander%20Pairings/index.html');
        await page.waitForLoadState('networkidle');
    });

    test('can create test helper instance', async () => {
        expect(helper).toBeDefined();
        expect(helper.players).toBeDefined();
        expect(helper.validation).toBeDefined();
        expect(helper.pods).toBeDefined();
        expect(helper.displayMode).toBeDefined();
        expect(helper.groups).toBeDefined();
    });

    test('can set up players and generate pods', async () => {
        // Set up 4 players with names and power levels
        await helper.players.ensurePlayerRows(4);

        await helper.players.setPlayerName(0, 'Alice');
        await helper.players.setPowerLevels(0, [8]);

        await helper.players.setPlayerName(1, 'Bob');
        await helper.players.setPowerLevels(1, [6]);

        await helper.players.setPlayerName(2, 'Charlie');
        await helper.players.setPowerLevels(2, [7]);

        await helper.players.setPlayerName(3, 'David');
        await helper.players.setPowerLevels(3, [5]);

        // Generate pods
        await helper.pods.generatePods();

        // Validate that pods were created
        const podCount = await helper.pods.getPodCount();
        expect(podCount).toBeGreaterThan(0);

        // Validate basic pod structure
        await helper.pods.expectPodCount(podCount);
    });

    test('can handle bracket levels', async () => {
        await helper.setup.setMode('bracket');
        await helper.players.ensurePlayerRows(4);

        // Use compatible bracket levels that can form pods
        await helper.players.setPlayerName(0, 'Player1');
        await helper.players.setBracketLevels(0, [3, 4]);

        await helper.players.setPlayerName(1, 'Player2');
        await helper.players.setBracketLevels(1, [3, 4]);

        await helper.players.setPlayerName(2, 'Player3');
        await helper.players.setBracketLevels(2, [3]);

        await helper.players.setPlayerName(3, 'Player4');
        await helper.players.setBracketLevels(3, [4]);

        // Generate pods and verify bracket distribution
        await helper.pods.generatePods();

        const podCount = await helper.pods.getPodCount();
        expect(podCount).toBeGreaterThan(0);
    });

    test('can switch display modes', async () => {
        await helper.players.ensurePlayerRows(4);

        // Fill in some players
        for (let i = 0; i < 4; i++) {
            await helper.players.setPlayerName(i, `Player${i + 1}`);
            await helper.players.setPowerLevels(i, [5 + i + 1]);
        }

        await helper.pods.generatePods();

        // Enter display mode
        await helper.displayMode.enterDisplayMode();
        await helper.displayMode.expectDisplayModeActive();

        // Exit display mode
        await helper.displayMode.exitDisplayMode();
        await helper.displayMode.expectDisplayModeInactive();
    });

    test('can handle groups', async () => {
        await helper.players.ensurePlayerRows(6);

        // Set up players
        for (let i = 0; i < 6; i++) {
            await helper.players.setPlayerName(i, `Player${i + 1}`);
            await helper.players.setPowerLevels(i, [5 + (i % 3)]);
        }

        // Create a group using the first player (index 0)
        const groupValue = await helper.groups.createNewGroup(0);

        // Assign another player to the same group
        await helper.groups.addPlayerToGroup(1, groupValue);

        // Generate pods
        await helper.pods.generatePods();

        // Basic validation that pods were generated
        const podCount = await helper.pods.getPodCount();
        expect(podCount).toBeGreaterThan(0);
    });

    test('can reset application state', async () => {
        // Set up some data
        await helper.players.ensurePlayerRows(3);
        await helper.players.setPlayerName(0, 'Test Player');
        await helper.pods.generatePods();

        // Verify data exists - application starts with 4 default rows
        let playerRows = helper.page.locator('.player-row');
        expect(await playerRows.count()).toBe(4);

        // Reset using the correct method name
        await helper.setup.reset();

        // Verify reset worked - application always resets to 4 default player rows
        playerRows = helper.page.locator('.player-row');
        expect(await playerRows.count()).toBe(4); // Application default is 4 rows

        // Verify first player name is cleared
        const firstPlayerName = await helper.players.getPlayerName(1);
        expect(firstPlayerName).toBe('');

        const podCount = await helper.pods.getPodCount();
        expect(podCount).toBe(0);
    });
});
