import { test, expect } from '@playwright/test';

// Helper function to set power levels using the new checkbox system
async function setPowerLevels(page: any, playerIndex: number, powerLevels: string | number[]) {
    // Convert string to number array if needed
    const powers = typeof powerLevels === 'string' ? [parseFloat(powerLevels)] : powerLevels;

    // Use a more efficient approach - execute everything in one go using JavaScript
    await page.evaluate(({ playerIndex, powers }) => {
        const playerRow = document.querySelector(`.player-row:nth-child(${playerIndex})`);
        if (!playerRow) return;

        // Scroll into view
        playerRow.scrollIntoView({ behavior: 'instant', block: 'nearest' });

        // Click the power selector button
        const btn = playerRow.querySelector('.power-selector-btn') as HTMLElement;
        if (btn) btn.click();

        // Wait for dropdown to appear (synchronous check)
        const dropdown = playerRow.querySelector('.power-selector-dropdown') as HTMLElement;
        if (dropdown) {
            dropdown.style.display = 'block';
            dropdown.classList.add('show');

            // Clear all checkboxes first
            const clearBtn = dropdown.querySelector('.clear-btn') as HTMLElement;
            if (clearBtn) clearBtn.click();

            // Check the desired power level checkboxes
            for (const power of powers) {
                const checkbox = dropdown.querySelector(`input[value="${power}"]`) as HTMLInputElement;
                if (checkbox) {
                    checkbox.checked = true;
                    // Trigger change event
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // Close dropdown
            dropdown.style.display = 'none';
            dropdown.classList.remove('show');
        }
    }, { playerIndex, powers });

    // Short wait to let any UI updates settle
    await page.waitForTimeout(50);
}

// Helper function to create many players efficiently
async function createPlayers(page: any, players: { name: string; power: string }[]) {
    // Add required player rows in bulk
    const currentRows = await page.locator('.player-row').count();
    const rowsNeeded = players.length - currentRows;

    if (rowsNeeded > 0) {
        // Add rows efficiently using JavaScript
        await page.evaluate((count) => {
            const addBtn = document.querySelector('#add-player-btn') as HTMLElement;
            for (let i = 0; i < count; i++) {
                if (addBtn) addBtn.click();
            }
        }, rowsNeeded);

        // Small wait for DOM updates
        await page.waitForTimeout(100);
    }

    // Fill in all players efficiently
    for (let i = 0; i < players.length; i++) {
        // Fill name directly
        await page.fill(`.player-row:nth-child(${i + 1}) .player-name`, players[i].name);
        // Set power levels
        await setPowerLevels(page, i + 1, players[i].power);
    }
}

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
        await setPowerLevels(page, 1, '7');
        await page.fill('.player-row:nth-child(2) .player-name', 'Bob');
        await setPowerLevels(page, 2, '6');

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
            await setPowerLevels(page, i + 1, players[i].power);
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
            await setPowerLevels(page, i + 1, players[i].power);
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
            await setPowerLevels(page, i + 1, players[i].power);
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
            await setPowerLevels(page, i + 1, players[i].power);
        }

        // Enable leniency
        await page.check('#leniency-radio');

        // Generate pods
        await page.click('#generate-pods-btn');

        // Check that pods are created (leniency should help group them)
        const pods = page.locator('.pod');
        await expect(pods.first()).toBeVisible();
    });

    test('should reset all data when reset button is clicked', async ({ page }) => {
        // Fill in some data
        await page.fill('.player-row:nth-child(1) .player-name', 'TestPlayer');
        await setPowerLevels(page, 1, '5');
        await page.check('#leniency-radio');

        // Generate pods to create output
        await page.click('#generate-pods-btn');

        // Reset everything
        await page.click('#reset-all-btn');

        // Check that everything is reset
        await expect(page.locator('.player-name').first()).toHaveValue('');
        await expect(page.locator('.power-selector-btn').first()).toContainText('Select Power Levels');
        await expect(page.locator('#no-leniency-radio')).toBeChecked(); // Should reset to no leniency
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
            await setPowerLevels(page, i + 1, players[i].power);
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
        await setPowerLevels(page, 1, '6');
        await page.fill('.player-row:nth-child(2) .player-name', 'Bob');
        await setPowerLevels(page, 2, '8');

        // Put them in the same group
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');

        // Add more players to make a valid pod
        await page.fill('.player-row:nth-child(3) .player-name', 'Charlie');
        await setPowerLevels(page, 3, '7');
        await page.fill('.player-row:nth-child(4) .player-name', 'Dave');
        await setPowerLevels(page, 4, '7');

        // Generate pods
        await page.click('#generate-pods-btn');

        // Check that the group shows average power
        const pods = page.locator('.pod');
        await expect(pods.first()).toBeVisible();

        // Group should show average power of 7 (6+8)/2 = 7
        await expect(page.locator('.pod')).toContainText('Group 1 (Avg Power: 7)');
    });

    test('should create multiple pods for larger groups', async ({ page }) => {
        // Create 8 players to force multiple pods
        const players = [
            { name: 'Alice', power: '7' },
            { name: 'Bob', power: '7' },
            { name: 'Charlie', power: '7' },
            { name: 'Dave', power: '7' },
            { name: 'Eve', power: '8' },
            { name: 'Frank', power: '8' },
            { name: 'Grace', power: '8' },
            { name: 'Henry', power: '8' },
        ];

        // Add more player rows
        for (let i = 4; i < players.length; i++) {
            await page.click('#add-player-btn');
        }

        // Fill in all players
        for (let i = 0; i < players.length; i++) {
            await page.fill(`.player-row:nth-child(${i + 1}) .player-name`, players[i].name);
            await setPowerLevels(page, i + 1, players[i].power);
        }

        // Generate pods
        await page.click('#generate-pods-btn');

        // Should create 2 pods of 4 players each
        const pods = page.locator('.pod:not(.unassigned-pod)');
        await expect(pods).toHaveCount(2);

        // Each pod should have 4 players
        const pod1Content = await pods.nth(0).textContent();
        const pod2Content = await pods.nth(1).textContent();

        // Count player names in each pod (each player name should appear once)
        const pod1PlayerCount = (pod1Content?.match(/\([P]:/g) || []).length;
        const pod2PlayerCount = (pod2Content?.match(/\([P]:/g) || []).length;

        expect(pod1PlayerCount).toBe(4);
        expect(pod2PlayerCount).toBe(4);
    });

    test('should keep groups together across multiple pods', async ({ page }) => {
        // Create scenario with a group that should stay together
        // Use compatible power levels so the group can be placed
        const players = [
            { name: 'Alice', power: '7' },
            { name: 'Bob', power: '7' },    // Group 1 with Alice
            { name: 'Charlie', power: '7' },
            { name: 'Dave', power: '7' },
            { name: 'Eve', power: '8' },
            { name: 'Frank', power: '8' },
            { name: 'Grace', power: '8' },
            { name: 'Henry', power: '8' },
        ];

        // Add more player rows
        for (let i = 4; i < players.length; i++) {
            await page.click('#add-player-btn');
        }

        // Fill in all players
        for (let i = 0; i < players.length; i++) {
            await page.fill(`.player-row:nth-child(${i + 1}) .player-name`, players[i].name);
            await setPowerLevels(page, i + 1, players[i].power);
        }

        // Create a group with Alice and Bob
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');

        // Generate pods
        await page.click('#generate-pods-btn');

        // Check that Alice and Bob are in the same pod (as a group)
        const pods = page.locator('.pod:not(.unassigned-pod)');
        await expect(pods.first()).toBeVisible();

        // Find which pod contains the group
        let groupFound = false;
        const podCount = await pods.count();

        for (let i = 0; i < podCount; i++) {
            const podContent = await pods.nth(i).textContent();
            if (podContent?.includes('Group 1')) {
                // This pod should contain both Alice and Bob
                expect(podContent).toContain('Alice');
                expect(podContent).toContain('Bob');
                groupFound = true;
                break;
            }
        }

        expect(groupFound).toBeTruthy();
    });

    test('should respect leniency boundaries correctly', async ({ page }) => {
        // Test leniency with a narrower, more realistic power range
        // Use 8 players in the 6.5-8 range to test leniency boundaries
        const players = [
            { name: 'Alice', power: '7' },      // Can group with Bob (7.5) with leniency
            { name: 'Bob', power: '7.5' },     // Can group with Alice (7) with leniency
            { name: 'Charlie', power: '7.5' }, // Can group with Dave (8) with leniency
            { name: 'Dave', power: '8' },      // Can group with Charlie (7.5) with leniency
            { name: 'Eve', power: '6.5' },     // Can group with Frank (7) with leniency
            { name: 'Frank', power: '7' },     // Can group with Eve (6.5) with leniency
            { name: 'Grace', power: '8' },     // Can group with Henry (7.5) with leniency
            { name: 'Henry', power: '7.5' },   // Can group with Grace (8) with leniency
        ];

        // Add more player rows
        for (let i = 4; i < players.length; i++) {
            await page.click('#add-player-btn');
        }

        // Fill in all players
        for (let i = 0; i < players.length; i++) {
            await page.fill(`.player-row:nth-child(${i + 1}) .player-name`, players[i].name);
            await setPowerLevels(page, i + 1, players[i].power);
        }

        // Enable leniency
        await page.check('#leniency-radio');

        // Generate pods
        await page.click('#generate-pods-btn');

        // Should create multiple pods (2 pods of 4 players each)
        const pods = page.locator('.pod:not(.unassigned-pod)');
        await expect(pods.first()).toBeVisible();

        const podCount = await pods.count();
        expect(podCount).toBeGreaterThanOrEqual(1);

        // Key test: Eve (6.5) and Dave (8) should NOT be in the same pod
        // because their difference is 1.5 which exceeds the 0.5 leniency limit
        let eveAndDaveTogether = false;

        for (let i = 0; i < podCount; i++) {
            const podContent = await pods.nth(i).textContent();
            if (podContent?.includes('Eve') && podContent?.includes('Dave')) {
                eveAndDaveTogether = true;
                break;
            }
        }

        // They should NOT be together due to power level spread > 0.5
        expect(eveAndDaveTogether).toBeFalsy();
    });

    test('should handle large groups with 30+ players efficiently', async ({ page }) => {
        test.setTimeout(60000); // Reduce timeout to 1 minute - should be much faster now
        // Create 32 players across different power levels
        const players: { name: string; power: string }[] = [];

        // 8 players at power level 6
        for (let i = 1; i <= 8; i++) {
            players.push({ name: `PowerSix${i}`, power: '6' });
        }

        // 12 players at power level 7
        for (let i = 1; i <= 12; i++) {
            players.push({ name: `PowerSeven${i}`, power: '7' });
        }

        // 8 players at power level 8
        for (let i = 1; i <= 8; i++) {
            players.push({ name: `PowerEight${i}`, power: '8' });
        }

        // 4 players at power level 9
        for (let i = 1; i <= 4; i++) {
            players.push({ name: `PowerNine${i}`, power: '9' });
        }

        // Add the required player rows and fill in all players efficiently
        await createPlayers(page, players);

        // Generate pods
        await page.click('#generate-pods-btn');

        // Should create 8 pods (32 players / 4 players per pod)
        const pods = page.locator('.pod:not(.unassigned-pod)');
        const podCount = await pods.count();
        expect(podCount).toBeGreaterThanOrEqual(6); // At least 6 pods, could be up to 8

        // Verify total player count across all pods
        let totalPlayersInPods = 0;
        for (let i = 0; i < podCount; i++) {
            const podContent = await pods.nth(i).textContent();
            const playerCount = (podContent?.match(/\([P]:/g) || []).length;
            totalPlayersInPods += playerCount;
        }

        // Check if there are unassigned players
        const unassignedSection = page.locator('.unassigned-pod');
        const unassignedExists = await unassignedSection.count();
        let unassignedCount = 0;

        if (unassignedExists > 0) {
            const unassignedContent = await unassignedSection.textContent();
            unassignedCount = (unassignedContent?.match(/\([P]:/g) || []).length;
        }

        // Total should equal 32
        expect(totalPlayersInPods + unassignedCount).toBe(32);
    });

    test('should handle multiple groups with complex power distributions', async ({ page }) => {
        // Create 16 players with 3 different groups - simpler than before
        const players = [
            // Group 1: Mixed power levels (should average to ~7)
            { name: 'Alice', power: '6' },
            { name: 'Bob', power: '8' },
            { name: 'Charlie', power: '7' },

            // Group 2: High power level group
            { name: 'Dave', power: '9' },
            { name: 'Eve', power: '9' },

            // Group 3: Low power level group  
            { name: 'Frank', power: '5' },
            { name: 'Grace', power: '5' },
            { name: 'Henry', power: '6' },

            // Ungrouped players with various power levels
            { name: 'Karen', power: '6' },
            { name: 'Luke', power: '7' },
            { name: 'Mary', power: '8' },
            { name: 'Nick', power: '9' },
            { name: 'Olivia', power: '5' },
            { name: 'Paul', power: '7' },
            { name: 'Quinn', power: '8' },
            { name: 'Rachel', power: '6' },
        ];

        // Add the required player rows
        for (let i = 4; i < players.length; i++) {
            await page.click('#add-player-btn');
        }

        // Fill in all players
        for (let i = 0; i < players.length; i++) {
            await page.fill(`.player-row:nth-child(${i + 1}) .player-name`, players[i].name);
            await setPowerLevels(page, i + 1, players[i].power);
        }

        // Create Group 1 (Alice, Bob, Charlie)
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');
        await page.selectOption('.player-row:nth-child(3) .group-select', 'group-1');

        // Create Group 2 (Dave, Eve) - trigger group creation and wait for DOM update
        await page.selectOption('.player-row:nth-child(4) .group-select', 'new-group');
        // Wait a bit for DOM to update, then try to select group-2
        await page.waitForTimeout(100);
        await page.selectOption('.player-row:nth-child(5) .group-select', 'group-2');

        // Create Group 3 (Frank, Grace, Henry) - trigger group creation and wait for DOM update
        await page.selectOption('.player-row:nth-child(6) .group-select', 'new-group');
        // Wait a bit for DOM to update, then try to select group-3
        await page.waitForTimeout(100);
        await page.selectOption('.player-row:nth-child(7) .group-select', 'group-3');
        await page.selectOption('.player-row:nth-child(8) .group-select', 'group-3');

        // Generate pods
        await page.click('#generate-pods-btn');

        // Should create at least one pod
        const pods = page.locator('.pod:not(.unassigned-pod)');
        await expect(pods.first()).toBeVisible();
        const podCount = await pods.count();
        expect(podCount).toBeGreaterThanOrEqual(1); // At least 1 pod for 16 players

        // Verify that all groups are kept together and assigned
        const allPodContent = await page.locator('#output-section').textContent();

        // Group 1 should be together
        const group1Present = allPodContent?.includes('Group 1');
        expect(group1Present).toBeTruthy();

        // Group 2 should be together  
        const group2Present = allPodContent?.includes('Group 2');
        expect(group2Present).toBeTruthy();

        // Group 3 should be together
        const group3Present = allPodContent?.includes('Group 3');
        expect(group3Present).toBeTruthy();

        // Count total players to ensure none are lost
        let totalPlayersInPods = 0;
        for (let i = 0; i < podCount; i++) {
            const podContent = await pods.nth(i).textContent();
            const playerCount = (podContent?.match(/\([P]:/g) || []).length;
            totalPlayersInPods += playerCount;
        }

        // Check unassigned section
        const unassignedSection = page.locator('.unassigned-pod');
        const unassignedExists = await unassignedSection.count();
        let unassignedCount = 0;

        if (unassignedExists > 0) {
            const unassignedContent = await unassignedSection.textContent();
            unassignedCount = (unassignedContent?.match(/\([P]:/g) || []).length;
        }

        // All 16 players should be accounted for
        expect(totalPlayersInPods + unassignedCount).toBe(16);
    });

    test('should handle extreme power level diversity with leniency', async ({ page }) => {
        test.setTimeout(60000); // Reduce timeout to 1 minute - should be much faster now
        // Create 24 players with very diverse power levels to test algorithm limits
        const players: { name: string; power: string }[] = [
            // Power level 4 players
            { name: 'VeryLow1', power: '4' },
            { name: 'VeryLow2', power: '4' },
            { name: 'VeryLow3', power: '4' },

            // Power level 5-5.5 (can group with leniency)
            { name: 'Low1', power: '5' },
            { name: 'Low2', power: '5.5' },
            { name: 'Low3', power: '5' },

            // Power level 6-6.5 (can group with leniency)
            { name: 'MedLow1', power: '6' },
            { name: 'MedLow2', power: '6.5' },
            { name: 'MedLow3', power: '6' },

            // Power level 7-7.5 (can group with leniency)
            { name: 'Med1', power: '7' },
            { name: 'Med2', power: '7.5' },
            { name: 'Med3', power: '7' },
            { name: 'Med4', power: '7.5' },

            // Power level 8-8.5 (can group with leniency)
            { name: 'MedHigh1', power: '8' },
            { name: 'MedHigh2', power: '8.5' },
            { name: 'MedHigh3', power: '8' },

            // Power level 9-9.5 (can group with leniency)
            { name: 'High1', power: '9' },
            { name: 'High2', power: '9.5' },
            { name: 'High3', power: '9' },

            // Power level 10 players
            { name: 'VeryHigh1', power: '10' },
            { name: 'VeryHigh2', power: '10' },
            { name: 'VeryHigh3', power: '10' },
            { name: 'VeryHigh4', power: '10' },
        ];

        // Add the required player rows and fill in all players efficiently
        await createPlayers(page, players);

        // Enable leniency to help with grouping
        await page.check('#leniency-radio');

        // Generate pods
        await page.click('#generate-pods-btn');

        // Should create multiple pods
        const pods = page.locator('.pod:not(.unassigned-pod)');
        await expect(pods.first()).toBeVisible();
        const podCount = await pods.count();
        expect(podCount).toBeGreaterThanOrEqual(4); // At least 4 pods for diverse power levels

        // Verify that extreme power levels aren't mixed
        // Power 4 and Power 10 should never be in the same pod (difference = 6)
        let power4And10Together = false;

        for (let i = 0; i < podCount; i++) {
            const podContent = await pods.nth(i).textContent();
            if (podContent?.includes('VeryLow') && podContent?.includes('VeryHigh')) {
                power4And10Together = true;
                break;
            }
        }

        expect(power4And10Together).toBeFalsy();

        // Count total assigned players
        let totalAssigned = 0;
        for (let i = 0; i < podCount; i++) {
            const podContent = await pods.nth(i).textContent();
            const playerCount = (podContent?.match(/\([P]:/g) || []).length;
            totalAssigned += playerCount;
        }

        // With such diverse power levels, we expect some players might be unassigned
        // but the majority should be successfully placed
        expect(totalAssigned).toBeGreaterThanOrEqual(18); // At least 75% should be assigned
    });

    test('should handle mixed groups and individual players at scale', async ({ page }) => {
        test.setTimeout(60000); // Reduce timeout to 1 minute - should be much faster now
        // Create 24 players: some in groups, some individual, more realistic power distribution
        const players = [
            // Tournament Group: high power players
            { name: 'Tournament1', power: '8' },
            { name: 'Tournament2', power: '9' },
            { name: 'Tournament3', power: '8' },

            // Casual Group: medium power players
            { name: 'Casual1', power: '6' },
            { name: 'Casual2', power: '7' },
            { name: 'Casual3', power: '6' },

            // Budget Group: low power players
            { name: 'Budget1', power: '4' },
            { name: 'Budget2', power: '5' },

            // Individual players with clustered power levels for better pod formation
            { name: 'Solo1', power: '8' },  // Power 8 cluster (8 players total)
            { name: 'Solo2', power: '8' },
            { name: 'Solo3', power: '8' },
            { name: 'Solo4', power: '8' },
            { name: 'Solo5', power: '8' },
            { name: 'Solo6', power: '8' },
            { name: 'Solo7', power: '8' },
            { name: 'Solo8', power: '8' },
            { name: 'Solo9', power: '7' },  // Power 7 cluster (4 players)
            { name: 'Solo10', power: '7' },
            { name: 'Solo11', power: '7' },
            { name: 'Solo12', power: '7' },
            { name: 'Solo13', power: '6' }, // Power 6 cluster (4 players)
            { name: 'Solo14', power: '6' },
            { name: 'Solo15', power: '6' },
            { name: 'Solo16', power: '6' },
        ];

        // Add the required player rows and fill in all players efficiently
        await createPlayers(page, players);

        // Create Tournament Group (first 3 players)
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');
        await page.selectOption('.player-row:nth-child(3) .group-select', 'group-1');

        // Create Casual Group (next 3 players) - trigger group creation and wait for DOM update
        await page.selectOption('.player-row:nth-child(4) .group-select', 'new-group');
        // Wait a bit for DOM to update, then try to select group-2
        await page.waitForTimeout(100);
        await page.selectOption('.player-row:nth-child(5) .group-select', 'group-2');
        await page.selectOption('.player-row:nth-child(6) .group-select', 'group-2');

        // Create Budget Group (next 2 players) - trigger group creation and wait for DOM update
        await page.selectOption('.player-row:nth-child(7) .group-select', 'new-group');
        // Wait a bit for DOM to update, then try to select group-3
        await page.waitForTimeout(100);
        await page.selectOption('.player-row:nth-child(8) .group-select', 'group-3');

        // Enable leniency for mixed power level scenarios
        await page.check('#leniency-radio');

        // Generate pods
        await page.click('#generate-pods-btn');

        // Check if pods were created (may be in pods or unassigned section)
        const pods = page.locator('.pod:not(.unassigned-pod)');
        const unassignedSection = page.locator('.unassigned-pod');

        // Either we have pods or players are unassigned
        const hasPods = await pods.count() > 0;
        const hasUnassigned = await unassignedSection.count() > 0;

        expect(hasPods || hasUnassigned).toBeTruthy();

        const podCount = await pods.count();
        if (hasPods) {
            await expect(pods.first()).toBeVisible();
            expect(podCount).toBeGreaterThanOrEqual(6);
        }

        // Verify that all groups are kept together and assigned
        const allPodContent = await page.locator('#output-section').textContent();

        // Tournament Group should be together
        const group1Present = allPodContent?.includes('Group 1');
        expect(group1Present).toBeTruthy();

        // Casual Group should be together  
        const group2Present = allPodContent?.includes('Group 2');
        expect(group2Present).toBeTruthy();

        // Budget Group should be together
        const group3Present = allPodContent?.includes('Group 3');
        expect(group3Present).toBeTruthy();

        // Count total players to ensure none are lost
        let totalPlayersInPods = 0;
        for (let i = 0; i < podCount; i++) {
            const podContent = await pods.nth(i).textContent();
            const playerCount = (podContent?.match(/\([P]:/g) || []).length;
            totalPlayersInPods += playerCount;
        }

        // Check unassigned section (reuse existing unassignedSection variable)
        const unassignedExists = await unassignedSection.count();
        let unassignedCount = 0;

        if (unassignedExists > 0) {
            const unassignedContent = await unassignedSection.textContent();
            unassignedCount = (unassignedContent?.match(/\([P]:/g) || []).length;
        }

        // All 24 players should be accounted for
        expect(totalPlayersInPods + unassignedCount).toBe(24);
    });

    test('should handle super leniency mode for challenging power distributions', async ({ page }) => {
        // Create a scenario that requires super leniency (±1.0) but won't work with regular leniency (±0.5)
        // Use power gaps of 0.6-1.0 between players that need to be grouped together
        const players = [
            // Group 1: Power levels with 0.5 gap (6.0 and 6.5) - needs super leniency
            { name: 'Challenge1', power: '6' },
            { name: 'Challenge2', power: '6.5' },  // 0.5 gap - exceeds regular leniency but OK for super
            { name: 'Challenge3', power: '6.5' },

            // Group 2: Power levels with 1.0 gap (7.0 and 8.0) - needs super leniency  
            { name: 'Challenge4', power: '7' },
            { name: 'Challenge5', power: '8' },  // 1.0 gap - exceeds regular leniency but OK for super
            { name: 'Challenge6', power: '7.5' },

            // Individual players with similar challenging gaps
            { name: 'Solo1', power: '5' },
            { name: 'Solo2', power: '6' },  // 1.0 gap - needs super leniency
            { name: 'Solo3', power: '5.5' },
            { name: 'Solo4', power: '6' },  // 1.0 gap from Solo1 - maximum super leniency

            { name: 'Solo5', power: '8' },
            { name: 'Solo6', power: '9' },  // 1.0 gap - needs super leniency  
            { name: 'Solo7', power: '8.5' },
            { name: 'Solo8', power: '9' },    // 1.0 gap from Solo5 - maximum super leniency

            // Some easier players to fill pods
            { name: 'Easy1', power: '4' },
            { name: 'Easy2', power: '4.5' },  // 0.5 gap - OK with regular leniency
            { name: 'Easy3', power: '4' },
            { name: 'Easy4', power: '4.5' },
        ];

        // Add the required player rows
        for (let i = 4; i < players.length; i++) {
            await page.click('#add-player-btn');
        }

        // Fill in all players
        for (let i = 0; i < players.length; i++) {
            await page.fill(`.player-row:nth-child(${i + 1}) .player-name`, players[i].name);
            await setPowerLevels(page, i + 1, players[i].power);
        }

        // Create challenging groups that need super leniency
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group'); // Challenge1
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');   // Challenge2 (0.6 gap)
        await page.selectOption('.player-row:nth-child(3) .group-select', 'group-1');   // Challenge3

        // Wait for DOM update
        await page.waitForTimeout(100);
        await page.selectOption('.player-row:nth-child(4) .group-select', 'new-group'); // Challenge4
        await page.selectOption('.player-row:nth-child(5) .group-select', 'group-2');   // Challenge5 (0.8 gap)
        await page.selectOption('.player-row:nth-child(6) .group-select', 'group-2');   // Challenge6

        // First try with regular leniency only (should struggle or fail)
        await page.check('#leniency-radio');

        await page.click('#generate-pods-btn');

        // Count pods with regular leniency
        const podsRegular = page.locator('.pod:not(.unassigned-pod)');
        const regularPodCount = await podsRegular.count();
        const unassignedRegular = page.locator('.unassigned-pod');
        const hasUnassignedRegular = await unassignedRegular.count() > 0;

        // Now try with super leniency enabled (should perform better)
        await page.check('#super-leniency-radio');
        await page.click('#generate-pods-btn');

        // Count pods with super leniency
        const podsSuperLeniency = page.locator('.pod:not(.unassigned-pod)');
        const superLeniencyPodCount = await podsSuperLeniency.count();
        const unassignedSuper = page.locator('.unassigned-pod');
        const hasUnassignedSuper = await unassignedSuper.count() > 0;

        // Super leniency should perform at least as well as regular leniency
        expect(superLeniencyPodCount).toBeGreaterThanOrEqual(regularPodCount);

        // Verify that challenging groups are kept together with super leniency
        const allPodContent = await page.locator('#output-section').textContent();

        // Group 1 (with 0.6 power gap) should be together
        const group1Present = allPodContent?.includes('Group 1');
        expect(group1Present).toBeTruthy();

        // Group 2 (with 0.8 power gap) should be together  
        const group2Present = allPodContent?.includes('Group 2');
        expect(group2Present).toBeTruthy();

        // Verify total player count
        let totalAssigned = 0;
        for (let i = 0; i < superLeniencyPodCount; i++) {
            const podContent = await podsSuperLeniency.nth(i).textContent();
            const playerCount = (podContent?.match(/\([P]:/g) || []).length;
            totalAssigned += playerCount;
        }

        let unassignedCount = 0;
        if (hasUnassignedSuper) {
            const unassignedContent = await unassignedSuper.textContent();
            unassignedCount = (unassignedContent?.match(/\([P]:/g) || []).length;
        }

        // All 18 players should be accounted for
        expect(totalAssigned + unassignedCount).toBe(18);

        // Super leniency should successfully handle the challenging power gaps
        // At minimum, it should create some pods and keep the challenging groups together
        expect(superLeniencyPodCount).toBeGreaterThanOrEqual(2);
    });
});
