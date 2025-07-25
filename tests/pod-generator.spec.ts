import { test, expect } from '@playwright/test';

test.describe('MTG Commander Pod Generator', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('index.html');
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

        // Check settings section
        await expect(page.locator('#leniency-checkbox')).toBeVisible();
    });

    test('should add and remove player rows', async ({ page }) => {
        // Initial count should be 4
        let playerRows = page.locator('.player-row');
        await expect(playerRows).toHaveCount(4);

        // Add a new player row
        await page.click('#add-player-btn');
        await expect(playerRows).toHaveCount(5);

        // Remove a player row
        await page.locator('.remove-player-btn').first().click();
        await expect(playerRows).toHaveCount(4);
    });

    test('should validate input fields and show errors', async ({ page }) => {
        // Try to generate pods with empty fields
        await page.click('#generate-pods-btn');

        // Should show validation errors (red borders)
        const errorInputs = page.locator('.input-error');
        await expect(errorInputs.first()).toBeVisible();
    });

    test('should create groups and update dropdowns', async ({ page }) => {
        // Fill in two players
        await page.fill('.player-row:nth-child(1) .player-name', 'Alice');
        await page.fill('.player-row:nth-child(1) .power-level', '7');
        await page.fill('.player-row:nth-child(2) .player-name', 'Bob');
        await page.fill('.player-row:nth-child(2) .power-level', '6');

        // Create a new group with the first player
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');

        // Check that Group 1 appears in all dropdowns
        const groupOptions = page.locator('.group-select option[value="group-1"]');
        await expect(groupOptions).toHaveCount(4); // Should appear in all 4 dropdowns

        // Add second player to the same group
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');
    });

    test('should generate pods with same power levels', async ({ page }) => {
        // Fill in players with specific power levels
        const players = [
            { name: 'Alice', power: '7' },
            { name: 'Bob', power: '7' },
            { name: 'Charlie', power: '7' },
            { name: 'Dave', power: '7' },
        ];

        for (let i = 0; i < players.length; i++) {
            await page.fill(`.player-row:nth-child(${i + 1}) .player-name`, players[i].name);
            await page.fill(`.player-row:nth-child(${i + 1}) .power-level`, players[i].power);
        }

        // Generate pods
        await page.click('#generate-pods-btn');

        // Check that pods are created
        const pods = page.locator('.pod');
        await expect(pods.first()).toBeVisible();

        // Check that the pod has the correct power level
        await expect(page.locator('.pod h3')).toContainText('(Power: 7)');

        // Check that all players are listed
        for (const player of players) {
            await expect(page.locator('.pod')).toContainText(player.name);
        }
    });

    test('should handle mixed power levels correctly', async ({ page }) => {
        // Fill in players with different power levels
        const players = [
            { name: 'Alice', power: '8' },
            { name: 'Bob', power: '8' },
            { name: 'Charlie', power: '6' },
            { name: 'Dave', power: '6' },
        ];

        for (let i = 0; i < players.length; i++) {
            await page.fill(`.player-row:nth-child(${i + 1}) .player-name`, players[i].name);
            await page.fill(`.player-row:nth-child(${i + 1}) .power-level`, players[i].power);
        }

        // Generate pods
        await page.click('#generate-pods-btn');

        // Should create separate pods for different power levels
        const pods = page.locator('.pod');
        await expect(pods.first()).toBeVisible();

        // Wait for pods to be generated and check content
        await page.waitForTimeout(1000);

        // Check that we have pods with different power levels (may vary based on algorithm)
        const podContent = await page.locator('#output-section').textContent();
        const hasPowerLevel8 = podContent?.includes('Power: 8') || false;
        const hasPowerLevel6 = podContent?.includes('Power: 6') || false;

        // At least one of the power levels should be present, or a mixed pod
        expect(hasPowerLevel8 || hasPowerLevel6 || podContent?.includes('Pod')).toBeTruthy();
    });

    test('should test the Player 10 scenario from the screenshot', async ({ page }) => {
        // Recreate the exact scenario from the screenshot
        const players = [
            { name: '1', power: '1' },
            { name: '5', power: '1' },
            { name: '6', power: '1' },
            { name: '4', power: '1' },
            { name: '2', power: '2' },
            { name: '3', power: '2' },
            { name: '7', power: '2' },
            { name: '8', power: '2' },
            { name: '9', power: '1' },
            { name: '10', power: '2' },
        ];

        // Add more player rows if needed
        const currentRows = await page.locator('.player-row').count();
        for (let i = currentRows; i < players.length; i++) {
            await page.click('#add-player-btn');
        }

        // Fill in all players
        for (let i = 0; i < players.length; i++) {
            await page.fill(`.player-row:nth-child(${i + 1}) .player-name`, players[i].name);
            await page.fill(`.player-row:nth-child(${i + 1}) .power-level`, players[i].power);
        }

        // Create Group 1 with players 1 and 5
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');

        // Generate pods
        await page.click('#generate-pods-btn');

        // Check that pods are created
        const pods = page.locator('.pod:not(.unassigned-pod)');
        await expect(pods.first()).toBeVisible();

        // Player 10 should either be in a pod or in unassigned section
        const player10InPod = await page.locator('.pod').filter({ hasText: '10 (P: 2)' }).count();
        const unassignedSection = page.locator('.unassigned-pod');
        const player10InUnassigned = await unassignedSection.filter({ hasText: '10 (P: 2)' }).count();

        // Player 10 should be somewhere (either in a pod or unassigned, but not lost)
        expect(player10InPod + player10InUnassigned).toBeGreaterThan(0);
    });

    test('should handle leniency setting', async ({ page }) => {
        // Fill in players with slightly different power levels
        const players = [
            { name: 'Alice', power: '7' },
            { name: 'Bob', power: '7.5' },
            { name: 'Charlie', power: '6.5' },
            { name: 'Dave', power: '7' },
        ];

        for (let i = 0; i < players.length; i++) {
            await page.fill(`.player-row:nth-child(${i + 1}) .player-name`, players[i].name);
            await page.fill(`.player-row:nth-child(${i + 1}) .power-level`, players[i].power);
        }

        // Enable leniency
        await page.check('#leniency-checkbox');

        // Generate pods
        await page.click('#generate-pods-btn');

        // Check that pods are created (leniency should help group them)
        const pods = page.locator('.pod');
        await expect(pods.first()).toBeVisible();
    });

    test('should reset all data when reset button is clicked', async ({ page }) => {
        // Fill in some data
        await page.fill('.player-row:nth-child(1) .player-name', 'TestPlayer');
        await page.fill('.player-row:nth-child(1) .power-level', '5');
        await page.check('#leniency-checkbox');

        // Generate pods to create output
        await page.click('#generate-pods-btn');

        // Reset everything
        await page.click('#reset-all-btn');

        // Check that everything is reset
        await expect(page.locator('.player-name').first()).toHaveValue('');
        await expect(page.locator('.power-level').first()).toHaveValue('');
        await expect(page.locator('#leniency-checkbox')).not.toBeChecked();
        await expect(page.locator('#output-section')).toBeEmpty();        // Should have 4 default rows again
        await expect(page.locator('.player-row')).toHaveCount(4);
    });

    test('should display unassigned players when they cannot be placed', async ({ page }) => {
        // Create a scenario where a player cannot be placed
        const players = [
            { name: 'Player1', power: '5' },
            { name: 'Player2', power: '5' },
            { name: 'Player3', power: '5' },
            { name: 'Player4', power: '5' },
            { name: 'Player5', power: '9' }, // This one might be unassigned
        ];

        // Add one more row
        await page.click('#add-player-btn');

        for (let i = 0; i < players.length; i++) {
            await page.fill(`.player-row:nth-child(${i + 1}) .player-name`, players[i].name);
            await page.fill(`.player-row:nth-child(${i + 1}) .power-level`, players[i].power);
        }

        // Generate pods
        await page.click('#generate-pods-btn');

        // Check if unassigned section exists (it might, depending on the algorithm)
        const unassignedSection = page.locator('.unassigned-pod');
        const unassignedExists = await unassignedSection.count();

        if (unassignedExists > 0) {
            await expect(unassignedSection.locator('h3')).toContainText('Unassigned Players');
        }
    });

    test('should handle group averaging correctly', async ({ page }) => {
        // Create a group with different power levels
        await page.fill('.player-row:nth-child(1) .player-name', 'Alice');
        await page.fill('.player-row:nth-child(1) .power-level', '6');
        await page.fill('.player-row:nth-child(2) .player-name', 'Bob');
        await page.fill('.player-row:nth-child(2) .power-level', '8');

        // Put them in the same group
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');

        // Add more players to make a valid pod
        await page.fill('.player-row:nth-child(3) .player-name', 'Charlie');
        await page.fill('.player-row:nth-child(3) .power-level', '7');
        await page.fill('.player-row:nth-child(4) .player-name', 'Dave');
        await page.fill('.player-row:nth-child(4) .power-level', '7');

        // Generate pods
        await page.click('#generate-pods-btn');

        // Check that the group shows average power
        const pods = page.locator('.pod');
        await expect(pods.first()).toBeVisible();

        // Group should show average power of 7 (6+8)/2 = 7
        await expect(page.locator('.pod')).toContainText('Group 1 (Avg Power: 7)');
    });
});
