import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers';
import { setupBasicTest, teardownBasicTest } from './test-setup';

test.describe('Debug Player Names Extraction', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownBasicTest(helper);
    });

    test('Debug player names extraction', async ({ page }) => {
        console.log('Starting debug player names test...');

        // Add 4 simple players
        const inputOrder = ['Alice', 'Bob', 'Charlie', 'David'];
        console.log('Creating players:', inputOrder);

        await helper.players.createPlayers(inputOrder.map(name => ({ name, power: [6] })));

        // Generate pods
        console.log('Generating pods...');
        await helper.pods.generatePods();

        // Check what happened
        const podCount = await helper.pods.getPodCount();
        console.log('Pod count after generation:', podCount);

        // Extract player names from the pod
        for (let podIndex = 0; podIndex < podCount; podIndex++) {
            console.log(`\n=== Pod ${podIndex} ===`);

            // Get the pod element directly
            const pod = helper.pods.getPods().nth(podIndex);
            const podContent = await pod.textContent();
            console.log('Raw pod content:', podContent);

            // Use our helper method
            const playerNames = await helper.pods.getPlayerNamesInPod(podIndex);
            console.log('Extracted player names:', playerNames);

            // Check individual player elements
            const podPlayers = pod.locator('.pod-player');
            const playerCount = await podPlayers.count();
            console.log('Pod-player elements count:', playerCount);

            for (let i = 0; i < playerCount; i++) {
                const playerText = await podPlayers.nth(i).textContent();
                console.log(`Player ${i} text:`, playerText);
            }

            // Check group elements
            const podGroups = pod.locator('.pod-group');
            const groupCount = await podGroups.count();
            console.log('Pod-group elements count:', groupCount);

            for (let i = 0; i < groupCount; i++) {
                const groupText = await podGroups.nth(i).textContent();
                console.log(`Group ${i} text:`, groupText);

                const groupPlayers = podGroups.nth(i).locator('.pod-player');
                const groupPlayerCount = await groupPlayers.count();
                console.log(`Group ${i} player count:`, groupPlayerCount);

                for (let j = 0; j < groupPlayerCount; j++) {
                    const groupPlayerText = await groupPlayers.nth(j).textContent();
                    console.log(`Group ${i} Player ${j} text:`, groupPlayerText);
                }
            }
        }

        // Verify all players are present
        const allExtractedPlayers: string[] = [];
        for (let podIndex = 0; podIndex < podCount; podIndex++) {
            const playerNames = await helper.pods.getPlayerNamesInPod(podIndex);
            allExtractedPlayers.push(...playerNames);
        }

        console.log('\nAll extracted players:', allExtractedPlayers);
        console.log('Expected players:', inputOrder);
        console.log('Length match:', allExtractedPlayers.length === inputOrder.length);

        expect(allExtractedPlayers.length).toBe(inputOrder.length);
    });
});
