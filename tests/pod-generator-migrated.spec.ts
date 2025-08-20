import { test, expect } from '@playwright/test';
import { setupBasicTest, setupPowerModeTest, teardownBasicTest } from './test-setup';
import TestHelper from './test-helpers';

let helper: TestHelper;

test.describe('MTG Commander Pod Generator', () => {
    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownBasicTest(helper);
    });

    test('should load the page with correct title and initial elements', async ({ page }) => {
        // Check page title
        await expect(page).toHaveTitle('MTG Commander Pod Generator');

        // Check main heading
        await expect(page.locator('h1')).toHaveText('MTG Commander Pod Generator');

        // Check that initial player rows are present (should have 4 by default)
        const playerRows = page.locator('.player-row');
        await expect(playerRows).toHaveCount(4);

        // Check main buttons are present
        await expect(page.locator('#add-player-btn')).toBeVisible();
        await expect(page.locator('#generate-pods-btn')).toBeVisible();
        await expect(page.locator('#reset-all-btn')).toBeVisible();

        // Check settings section with radio buttons
        await expect(page.locator('#no-leniency-radio')).toBeVisible();
        await expect(page.locator('#leniency-radio')).toBeVisible();
        await expect(page.locator('#super-leniency-radio')).toBeVisible();
    });

    test('should add and remove player rows', async ({ page }) => {
        // Initial count should be 4
        let playerRows = page.locator('.player-row');
        await expect(playerRows).toHaveCount(4);

        // Add a new player row
        await page.click('#add-player-btn');
        await expect(playerRows).toHaveCount(5);

        // Remove a player row
        await helper.players.removePlayer(1);
        await expect(playerRows).toHaveCount(4);
    });

    test('should validate input fields and show errors', async ({ page }) => {
        // Try to generate pods with empty fields
        await helper.pods.generatePods();

        // Should show validation errors
        await helper.validation.expectNameInputError(1);
    });

    test('should create groups and update dropdowns', async ({ page }) => {
        // Fill in two players using the framework
        await helper.players.createPlayers([
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [6] }
        ]);

        // Create a new group with the first player (player index 1)
        await helper.groups.createNewGroup(1);

        // Check that Group 1 appears in all dropdowns
        const groupOptions = page.locator('.group-select option[value="group-1"]');
        await expect(groupOptions).toHaveCount(4); // Should appear in all 4 dropdowns

        // Add second player to the same group (player index 2)
        await helper.groups.addPlayerToGroup(2, 'group-1');
    });

    test('should generate pods with same power levels', async ({ page }) => {
        // Fill in players with specific power levels using the framework
        await helper.players.createPlayers([
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [7] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [7] }
        ]);

        // Generate pods
        await helper.pods.generatePods();

        // Check that pods are created
        await helper.pods.expectPodCount(1);

        // Check that all players are listed
        await helper.pods.expectPodHasPlayers(1, ['Alice', 'Bob', 'Charlie', 'Dave']);

        // Check that the pod has the correct power level by checking its title
        const podTitle = await helper.pods.getPodTitle(1).textContent();
        expect(podTitle).toContain('(Power: 7)');
    });

    test('should handle mixed power levels correctly', async ({ page }) => {
        // Fill in players with different power levels using the framework
        await helper.players.createPlayers([
            { name: 'Alice', power: [8] },
            { name: 'Bob', power: [8] },
            { name: 'Charlie', power: [6] },
            { name: 'Dave', power: [6] }
        ]);

        // Generate pods
        await helper.pods.generatePods();

        // Should create pods (may be 1 or 2 depending on algorithm)
        const podCount = await helper.pods.getPodCount();
        expect(podCount).toBeGreaterThan(0);

        // Check that players are assigned somewhere
        const allPlayers = await helper.pods.getAllPodPlayerNames();
        expect(allPlayers).toContain('Alice');
        expect(allPlayers).toContain('Bob');
        expect(allPlayers).toContain('Charlie');
        expect(allPlayers).toContain('Dave');
    });

    test('should handle Player 10 scenario', async ({ page }) => {
        // Recreate the exact scenario from the screenshot
        await helper.players.createPlayers([
            { name: '1', power: [1] },
            { name: '5', power: [1] },
            { name: '6', power: [1] },
            { name: '4', power: [1] },
            { name: '2', power: [2] },
            { name: '3', power: [2] },
            { name: '7', power: [2] },
            { name: '8', power: [2] },
            { name: '9', power: [1] },
            { name: '10', power: [2] }
        ]);

        // Create Group 1 with players 1 and 5
        await helper.groups.createNewGroup(1);
        await helper.groups.addPlayerToGroup(2, 'group-1');

        // Generate pods
        await helper.pods.generatePods();

        // Check that pods are created
        const podCount = await helper.pods.getPodCount();
        expect(podCount).toBeGreaterThan(0);

        // Player 10 should be somewhere (in a pod or unassigned)
        const allPlayers = await helper.pods.getAllPodPlayerNames();
        const unassignedExists = await helper.pods.getUnassignedPod().count() > 0;

        if (unassignedExists) {
            const unassignedContent = await helper.pods.getUnassignedPod().textContent();
            const player10Assigned = allPlayers.includes('10') || (unassignedContent?.includes('10') || false);
            expect(player10Assigned).toBeTruthy();
        } else {
            expect(allPlayers).toContain('10');
        }
    });

    test('should handle leniency setting', async ({ page }) => {
        // Fill in players with slightly different power levels
        await helper.players.createPlayers([
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [7.5] },
            { name: 'Charlie', power: [6.5] },
            { name: 'Dave', power: [7] }
        ]);

        // Enable leniency
        await helper.setup.setTolerance('regular');

        // Generate pods
        await helper.pods.generatePods();

        // Check that pods are created (leniency should help group them)
        const podCount = await helper.pods.getPodCount();
        expect(podCount).toBeGreaterThan(0);
    });

    test('should reset all data when reset button is clicked', async ({ page }) => {
        // Fill in some data
        await helper.players.createPlayers([
            { name: 'TestPlayer', power: [5] }
        ]);
        await helper.setup.setTolerance('regular');

        // Generate pods to create output
        await helper.pods.generatePods();

        // Reset everything
        await helper.setup.reset();

        // Check that everything is reset
        const playerName = await page.locator('.player-name').first().inputValue();
        expect(playerName).toBe('');

        const powerBtn = await page.locator('.power-selector-btn').first().textContent();
        expect(powerBtn).toContain('Select Power Levels');

        await expect(page.locator('#no-leniency-radio')).toBeChecked();

        const outputSection = await page.locator('#output-section').textContent();
        expect(outputSection?.trim()).toBe('');

        await expect(page.locator('.player-row')).toHaveCount(4);
    });

    test('should display unassigned players when they cannot be placed', async ({ page }) => {
        // Create a scenario where a player cannot be placed
        await helper.players.createPlayers([
            { name: 'Player1', power: [5] },
            { name: 'Player2', power: [5] },
            { name: 'Player3', power: [5] },
            { name: 'Player4', power: [5] },
            { name: 'Player5', power: [9] }
        ]);

        // Generate pods
        await helper.pods.generatePods();

        // Check for output (either pods or unassigned)
        const podCount = await helper.pods.getPodCount();
        const unassignedExists = await helper.pods.getUnassignedPod().count() > 0;

        expect(podCount > 0 || unassignedExists).toBeTruthy();

        // Verify all players are accounted for
        const allPlayers = await helper.pods.getAllPodPlayerNames();
        let unassignedPlayers: string[] = [];

        if (unassignedExists) {
            const unassignedContent = await helper.pods.getUnassignedPod().textContent();
            unassignedPlayers = ['Player1', 'Player2', 'Player3', 'Player4', 'Player5'].filter(p =>
                unassignedContent?.includes(p) || false
            );
        }

        const totalAccountedFor = allPlayers.length + unassignedPlayers.length;
        expect(totalAccountedFor).toBe(5);
    });

    test('should handle group averaging correctly', async ({ page }) => {
        // Create a group with different power levels
        await helper.players.createPlayers([
            { name: 'Alice', power: [6] },
            { name: 'Bob', power: [8] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [7] }
        ]);

        // Put Alice and Bob in the same group
        await helper.groups.createNewGroup(0); // Alice creates new group
        await helper.groups.addPlayerToGroup(1, 'group-1'); // Bob joins group-1

        // Generate pods
        await helper.pods.generatePods();

        // Check that the group shows average power
        const podCount = await helper.pods.getPodCount();
        expect(podCount).toBeGreaterThan(0);

        // Look for group with average power of 7 (6+8)/2 = 7
        let hasGroupWithAverage = false;
        for (let podIndex = 1; podIndex <= podCount; podIndex++) {
            const hasGroup = await helper.pods.podContainsGroupInfo(podIndex, 'Group 1', 7);
            if (hasGroup) {
                hasGroupWithAverage = true;
                break;
            }
        }
        expect(hasGroupWithAverage).toBeTruthy();
    });

    test('should create multiple pods for larger groups', async ({ page }) => {
        // Create 8 players to force multiple pods
        await helper.players.createPlayers([
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [7] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [7] },
            { name: 'Eve', power: [8] },
            { name: 'Frank', power: [8] },
            { name: 'Grace', power: [8] },
            { name: 'Henry', power: [8] }
        ]);

        // Generate pods
        await helper.pods.generatePods();

        // Should create multiple pods
        const podCount = await helper.pods.getPodCount();
        expect(podCount).toBeGreaterThanOrEqual(2);

        // Verify all players are assigned
        const allPlayers = await helper.pods.getAllPodPlayerNames();
        expect(allPlayers).toHaveLength(8);
        expect(allPlayers).toContain('Alice');
        expect(allPlayers).toContain('Henry');
    });

    test('should keep groups together across multiple pods', async ({ page }) => {
        // Create scenario with a group that should stay together
        await helper.players.createPlayers([
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [7] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [7] },
            { name: 'Eve', power: [8] },
            { name: 'Frank', power: [8] },
            { name: 'Grace', power: [8] },
            { name: 'Henry', power: [8] }
        ]);

        // Create a group with Alice and Bob
        await helper.groups.createNewGroup(0); // Alice creates new group  
        await helper.groups.addPlayerToGroup(1, 'group-1'); // Bob joins group-1

        // Generate pods
        await helper.pods.generatePods();

        // Check that Alice and Bob are in the same pod (as a group)
        const podArrangement = await helper.pods.getPodArrangement();
        let groupFound = false;
        let podWithGroup = -1;

        // Find pod containing both Alice and Bob
        for (let i = 0; i < podArrangement.length; i++) {
            const pod = podArrangement[i];
            if (pod.players.includes('Alice') && pod.players.includes('Bob')) {
                groupFound = true;
                podWithGroup = i + 1; // Convert to 1-based for podContainsGroupInfo
                break;
            }
        }

        expect(groupFound).toBeTruthy();

        // Verify that the pod containing Alice and Bob has group information
        if (groupFound) {
            const hasGroupInfo = await helper.pods.podContainsGroupInfo(podWithGroup, 'Group 1');
            expect(hasGroupInfo).toBeTruthy();
        }
    });

    test('should handle players with multiple power levels', async ({ page }) => {
        // Test players with multiple power level selections
        await helper.players.createPlayers([
            { name: 'Alice', power: [6, 7] },
            { name: 'Bob', power: [7, 8] },
            { name: 'Charlie', power: [6, 7, 8] },
            { name: 'Dave', power: [8] }
        ]);

        // Generate pods
        await helper.pods.generatePods();

        // Should create at least one pod
        const podCount = await helper.pods.getPodCount();
        expect(podCount).toBeGreaterThan(0);

        // Verify all players are assigned
        const allPlayers = await helper.pods.getAllPodPlayerNames();
        expect(allPlayers).toContain('Alice');
        expect(allPlayers).toContain('Bob');
        expect(allPlayers).toContain('Charlie');
        expect(allPlayers).toContain('Dave');
    });

    test('should handle power range overlaps correctly', async ({ page }) => {
        // Test specific power range overlap scenarios
        await helper.players.createPlayers([
            { name: 'Flexible1', power: [5, 6, 7] },
            { name: 'Flexible2', power: [6, 7, 8] },
            { name: 'Flexible3', power: [7, 8, 9] },
            { name: 'Specific1', power: [7] }
        ]);

        // Generate pods
        await helper.pods.generatePods();

        // Should create a pod where all can play at power 7
        const podCount = await helper.pods.getPodCount();
        expect(podCount).toBeGreaterThan(0);

        // All players should be in the same pod since they all can play power 7
        const allPlayers = await helper.pods.getAllPodPlayerNames();
        expect(allPlayers).toHaveLength(4);
        expect(allPlayers).toContain('Flexible1');
        expect(allPlayers).toContain('Flexible2');
        expect(allPlayers).toContain('Flexible3');
        expect(allPlayers).toContain('Specific1');

        // Pod should show power level 7 (the common overlap)
        const podArrangement = await helper.pods.getPodArrangement();
        const hasCorrectPower = podArrangement.some(pod =>
            pod.title.includes('Power: 7')
        );
        expect(hasCorrectPower).toBeTruthy();
    });

    test('should handle large groups efficiently', async ({ page }) => {
        test.setTimeout(30000); // 30 second timeout for large test

        // Create 16 players across different power levels
        const players: { name: string; power: number[] }[] = [];

        // 4 players at each power level
        for (let power of [6, 7, 8, 9]) {
            for (let i = 1; i <= 4; i++) {
                players.push({ name: `P${power}-${i}`, power: [power] });
            }
        }

        await helper.players.createPlayers(players);

        // Generate pods
        await helper.pods.generatePods();

        // Should create 4 pods (16 players / 4 players per pod)
        const podCount = await helper.pods.getPodCount();
        expect(podCount).toBeGreaterThanOrEqual(3); // At least 3 pods

        // Verify total player count
        const allPlayers = await helper.pods.getAllPodPlayerNames();
        let unassignedCount = 0;

        const unassignedExists = await helper.pods.getUnassignedPod().count() > 0;
        if (unassignedExists) {
            const unassignedContent = await helper.pods.getUnassignedPod().textContent() || '';
            unassignedCount = (unassignedContent.match(/P\d-\d/g) || []).length;
        }

        expect(allPlayers.length + unassignedCount).toBe(16);
    });

    test('should show display mode button after generating pods', async ({ page }) => {
        // Fill in some players
        await helper.players.createPlayers([
            { name: 'Alice', power: [6] },
            { name: 'Bob', power: [6] },
            { name: 'Charlie', power: [6] },
            { name: 'David', power: [6] }
        ]);

        // Check that display mode button is hidden initially
        const displayBtn = page.locator('#display-mode-btn');
        await expect(displayBtn).toHaveCSS('display', 'none');

        // Generate pods
        await helper.pods.generatePods();

        // Check that display mode button is now visible
        await expect(displayBtn).toBeVisible();
    });

    test('should enter and exit display mode correctly', async ({ page }) => {
        // Fill in some players
        await helper.players.createPlayers([
            { name: 'Alice', power: [6] },
            { name: 'Bob', power: [6] },
            { name: 'Charlie', power: [6] },
            { name: 'David', power: [6] }
        ]);

        // Generate pods
        await helper.pods.generatePods();

        // Enter display mode
        await helper.displayMode.enterDisplayMode();

        // Check that display mode is active
        await helper.displayMode.expectDisplayModeActive();

        // Check that display mode container exists
        const displayContainer = page.locator('.display-mode-container');
        await expect(displayContainer).toBeVisible();

        // Check that original container is hidden
        const originalContainer = page.locator('.container');
        await expect(originalContainer).toHaveCSS('display', 'none');

        // Exit display mode
        await helper.displayMode.exitDisplayMode();

        // Check that we're back to normal mode
        await helper.displayMode.expectDisplayModeInactive();
        await expect(originalContainer).toBeVisible();
    });
});
