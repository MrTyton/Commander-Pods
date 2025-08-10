import { test } from '@playwright/test';
import TestHelper from './test-helpers';
import { setupBasicTest, teardownBasicTest } from './test-setup';

test.describe('Debug Pod Titles', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownBasicTest(helper);
    });

    test('debug pod titles and group behavior', async ({ page }) => {
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

        // Test the new helper methods
        const hasGroupInfo = await helper.pods.podContainsGroupInfo(1, 'Group 1', 7);
        console.log('Pod contains Group 1 with Avg Power 7:', hasGroupInfo);

        const groupInfo = await helper.pods.getPodGroupInfo(1);
        console.log('Group info from pod:', JSON.stringify(groupInfo, null, 2));

        // Let's also check the raw HTML to see what's actually there
        const podElements = await helper.pods.getPods().all();
        for (let i = 0; i < podElements.length; i++) {
            const podHtml = await podElements[i].innerHTML();
            console.log(`Pod ${i + 1} HTML:`, podHtml);
        }
    });
});
