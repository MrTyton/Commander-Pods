import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers';

test.describe('Group Setup Debug', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
        await helper.setup.goto();
    });

    test('debug group setup and membership', async ({ page }) => {
        // Create players exactly like the failing test
        await helper.players.createPlayers([
            { name: 'Alice', power: [6] },
            { name: 'Bob', power: [8] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [7] }
        ]);

        // Put Alice and Bob in the same group (like the failing test)
        await helper.groups.createNewGroup(1); // Alice creates new group

        await helper.groups.addPlayerToGroup(2, 'group-1'); // Bob joins group-1

        // Check the actual group assignments (only check first 3 to avoid timeout)
        for (let i = 1; i <= 3; i++) {
            try {
                const groupSelect = await helper.players.getGroupSelect(i);
                const selectedValue = await groupSelect.inputValue();
                const playerName = await helper.players.getPlayerName(i);
            } catch (e) {
                break;
            }
        }

        // Generate pods
        await helper.pods.generatePods();

        const podArrangement = await helper.pods.getPodArrangement();

        // Check which players are actually in the group
        const pod = helper.pods.getPod(1);
        const groupElements = pod.locator('.pod-group');
        const groupCount = await groupElements.count();

        if (groupCount > 0) {
            const groupHTML = await groupElements.first().innerHTML();

            const groupText = await groupElements.first().textContent();
        }
    });
});
