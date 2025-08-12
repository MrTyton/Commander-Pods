import { test, expect } from '@playwright/test';
import { setupBasicTest, teardownBasicTest } from './test-setup';
import TestHelper from './test-helpers';

test.describe('Display Mode Power Level Bolding', () => {
    let helper: TestHelper;

    test.afterEach(async () => {
        if (helper) {
            try {
                // First try to exit display mode if we're in it
                const isInDisplayMode = await helper.page.locator('body.display-mode').count() > 0;
                if (isInDisplayMode) {
                    await helper.displayMode.exitDisplayMode();
                    // Wait a bit for transition
                    await helper.page.waitForTimeout(500);
                }
            } catch (error) {
                // If display mode exit fails, just reload the page
                await helper.page.reload();
                await helper.page.waitForLoadState('networkidle');
            }
            await teardownBasicTest(helper);
        }
    });

    test('should show bolded power levels in display mode', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Create players with overlapping power levels (7-8 will be valid for pod)
        await helper.players.createPlayers([
            { name: 'Alice', power: [6, 7, 8] },
            { name: 'Bob', power: [7, 8, 9] },
            { name: 'Charlie', power: [7, 8] },
            { name: 'Dave', power: [5, 7, 8] }
        ]);

        // Generate pods
        await helper.pods.generatePods();

        // Enter display mode
        await helper.displayMode.waitForDisplayModeButton();
        await helper.displayMode.enterDisplayMode();

        // Check that power levels are bolded in display mode
        // Alice should have 6, <b>7</b>, <b>8</b> (7 and 8 are valid for pod)
        const aliceInDisplayMode = page.locator('.display-mode-container .player-power').filter({ hasText: 'P: 6' }).first();
        const aliceHTML = await aliceInDisplayMode.innerHTML();

        console.log('Alice power display in display mode:', aliceHTML);

        // Verify Alice has highlighted valid powers (7 and 8)
        expect(aliceHTML).toContain('<span class="power-highlight">7</span>');
        expect(aliceHTML).toContain('<span class="power-highlight">8</span>');
        expect(aliceHTML).not.toContain('<span class="power-highlight">6</span>'); // 6 should not be highlighted

        // Bob should have <b>7</b>, <b>8</b>, 9 (7 and 8 are valid for pod)
        const bobInDisplayMode = page.locator('.display-mode-container .player-power').filter({ hasText: 'P: ' }).filter({ hasText: '9' }).first();
        const bobHTML = await bobInDisplayMode.innerHTML();

        console.log('Bob power display in display mode:', bobHTML);

        // Verify Bob has highlighted valid powers (7 and 8)
        expect(bobHTML).toContain('<span class="power-highlight">7</span>');
        expect(bobHTML).toContain('<span class="power-highlight">8</span>');
        expect(bobHTML).not.toContain('<span class="power-highlight">9</span>'); // 9 should not be highlighted

        // Dave should have 5, <b>7</b>, <b>8</b> (7 and 8 are valid for pod)
        const daveInDisplayMode = page.locator('.display-mode-container .player-power').filter({ hasText: 'P: 5' }).first();
        const daveHTML = await daveInDisplayMode.innerHTML();

        console.log('Dave power display in display mode:', daveHTML);

        // Verify Dave has highlighted valid powers (7 and 8)
        expect(daveHTML).toContain('<span class="power-highlight">7</span>');
        expect(daveHTML).toContain('<span class="power-highlight">8</span>');
        expect(daveHTML).not.toContain('<span class="power-highlight">5</span>'); // 5 should not be highlighted
    });

    test('should show bolded power levels in bracket mode display', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Switch to bracket mode
        await page.check('#bracket-radio');

        // Create players with bracket ranges
        await helper.players.createPlayers([
            { name: 'Alice', bracket: [2, 3] },
            { name: 'Bob', bracket: [2, 3] },
            { name: 'Charlie', bracket: [2, 3] },
            { name: 'Dave', bracket: [2, 3] }
        ]);

        // Generate pods
        await helper.pods.generatePods();

        // Enter display mode
        await helper.displayMode.waitForDisplayModeButton();
        await helper.displayMode.enterDisplayMode();

        // In bracket mode, verify bracket highlighting works
        const aliceInDisplayMode = page.locator('.display-mode-container .player-power').filter({ hasText: 'B: ' }).first();
        const aliceHTML = await aliceInDisplayMode.innerHTML();

        console.log('Alice bracket display in display mode:', aliceHTML);

        // Verify bracket highlighting is applied (both 2 and 3 should be valid for all players)
        expect(aliceHTML).toContain('<span class="bracket-highlight">2</span>');
        expect(aliceHTML).toContain('<span class="bracket-highlight">3</span>');
    });
});
