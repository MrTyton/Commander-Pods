import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers';
import { setupBasicTest, teardownBasicTest } from './test-setup';

test.describe('Debug Shuffle Functionality', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownBasicTest(helper);
    });

    test('Debug shuffle test with console capture', async ({ page }) => {
        console.log('Starting debug shuffle test...');

        // Capture console output
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', error => console.error('PAGE ERROR:', error.message));

        // Add 4 simple players
        const players = ['Alice', 'Bob', 'Charlie', 'David'];
        console.log('Creating players:', players);

        await helper.players.createPlayers(players.map(name => ({ name, power: [6] })));

        // Check players were created
        const playerCount = await helper.validation.getPlayerCount();
        console.log('Player count after creation:', playerCount);

        // Generate pods
        console.log('Generating pods...');
        await helper.pods.generatePods();

        // Wait a bit for pods to be generated
        await page.waitForTimeout(1000);

        // Check what happened
        const podCount = await helper.pods.getPodCount();
        console.log('Pod count after generation:', podCount);

        // Check the actual DOM structure
        const outputSection = page.locator('#output-section');
        const outputContent = await outputSection.textContent();
        console.log('Output section content:', outputContent);

        // Check for any error messages
        const errorElements = page.locator('.error, .alert, .warning');
        const errorCount = await errorElements.count();
        console.log('Error elements found:', errorCount);

        for (let i = 0; i < errorCount; i++) {
            const errorText = await errorElements.nth(i).textContent();
            console.log(`Error ${i}:`, errorText);
        }

        // Check if generate button exists and is enabled
        const generateButton = page.locator('#generate-pods-btn');
        const buttonExists = await generateButton.count();
        const buttonEnabled = buttonExists > 0 ? await generateButton.isEnabled() : false;
        console.log('Generate button exists:', buttonExists, 'enabled:', buttonEnabled);

        // Take a screenshot for debugging
        await page.screenshot({ path: 'debug-shuffle-state.png', fullPage: true });

        expect(podCount).toBeGreaterThan(0);
    });
});
