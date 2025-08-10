// Debug script to check pod titles
import { test } from '@playwright/test';
import TestHelper from './tests/test-helpers.js';
import { setupBasicTest, teardownBasicTest } from './tests/test-setup.js';

test('debug pod titles', async ({ page }) => {
    const helper = await setupBasicTest(page);

    // Create players with groups like the failing test
    await helper.players.createPlayers([
        { name: 'Alice', power: [6] },
        { name: 'Bob', power: [8] },
        { name: 'Charlie', power: [7] },
        { name: 'Dave', power: [7] }
    ]);

    // Put Alice and Bob in the same group
    await helper.groups.createNewGroup(1);
    await helper.groups.addPlayerToGroup(2, 'group-1');

    // Generate pods
    await helper.pods.generatePods();

    // Debug: Print the actual pod arrangement
    const podArrangement = await helper.pods.getPodArrangement();
    console.log('Actual pod arrangement:', JSON.stringify(podArrangement, null, 2));

    await teardownBasicTest(helper);
});
