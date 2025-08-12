import { test, expect } from '@playwright/test';
import { setupWithPods, teardownBasicTest } from './test-setup.js';
import TestHelper from './test-helpers.js';

test.describe('Player Power Level Bolding', () => {
    let helper: TestHelper;

    test.afterEach(async () => {
        if (helper) {
            await teardownBasicTest(helper);
        }
    });

    test('Valid power levels should be bolded in pod player display', async ({ page }) => {
        // Create players where only power 7 and 8 work for all
        helper = await setupWithPods(page, [
            { name: 'Alice', power: [6, 7, 8] },    // 6 won't be valid (Bob can't play it)
            { name: 'Bob', power: [7, 8, 9] },      // 9 won't be valid (others can't play it)
            { name: 'Charlie', power: [7, 8] },     // All valid
            { name: 'Dave', power: [5, 7, 8] }      // 5 won't be valid (others can't play it)
        ]);

        // Check the pod players to see bolded power levels
        const playerElements = await helper.page.locator('.pod li.pod-player').all();

        // Alice should have 7,8 highlighted but not 6
        const aliceText = await playerElements[0].innerHTML();
        expect(aliceText).toContain('<span class="power-highlight">7</span>');
        expect(aliceText).toContain('<span class="power-highlight">8</span>');
        expect(aliceText).not.toContain('<span class="power-highlight">6</span>');
        expect(aliceText).toContain('6'); // 6 should be present but not highlighted

        // Bob should have 7,8 highlighted but not 9
        const bobText = await playerElements[1].innerHTML();
        expect(bobText).toContain('<span class="power-highlight">7</span>');
        expect(bobText).toContain('<span class="power-highlight">8</span>');
        expect(bobText).not.toContain('<span class="power-highlight">9</span>');
        expect(bobText).toContain('9'); // 9 should be present but not highlighted

        // Charlie should have all power levels highlighted (7,8)
        const charlieText = await playerElements[2].innerHTML();
        expect(charlieText).toContain('<span class="power-highlight">7</span>');
        expect(charlieText).toContain('<span class="power-highlight">8</span>');

        // Dave should have 7,8 highlighted but not 5
        const daveText = await playerElements[3].innerHTML();
        expect(daveText).toContain('<span class="power-highlight">7</span>');
        expect(daveText).toContain('<span class="power-highlight">8</span>');
        expect(daveText).not.toContain('<span class="power-highlight">5</span>');
        expect(daveText).toContain('5'); // 5 should be present but not highlighted
    });

    test('Single valid power level should be bolded correctly', async ({ page }) => {
        // Create players where only power 8 works for all
        helper = await setupWithPods(page, [
            { name: 'Alice', power: [7, 8] },
            { name: 'Bob', power: [8, 9] },
            { name: 'Charlie', power: [8] },
            { name: 'Dave', power: [6, 8] }
        ]);

        // Check that only power 8 is highlighted for all players
        const playerElements = await helper.page.locator('.pod li.pod-player').all();

        for (let i = 0; i < playerElements.length; i++) {
            const playerText = await playerElements[i].innerHTML();
            expect(playerText).toContain('<span class="power-highlight">8</span>'); // 8 should always be highlighted
            expect(playerText).not.toContain('<span class="power-highlight">7</span>'); // 7 should not be highlighted
            expect(playerText).not.toContain('<span class="power-highlight">9</span>'); // 9 should not be highlighted
            expect(playerText).not.toContain('<span class="power-highlight">6</span>'); // 6 should not be highlighted
        }
    });

    test('All power levels bolded when everyone can play all levels', async ({ page }) => {
        // Create players where all can play power 7 and 8
        helper = await setupWithPods(page, [
            { name: 'Alice', power: [7, 8] },
            { name: 'Bob', power: [7, 8] },
            { name: 'Charlie', power: [7, 8] },
            { name: 'Dave', power: [7, 8] }
        ]);

        // Check that both 7 and 8 are highlighted for all players
        const playerElements = await helper.page.locator('.pod li.pod-player').all();

        for (let i = 0; i < playerElements.length; i++) {
            const playerText = await playerElements[i].innerHTML();
            expect(playerText).toContain('<span class="power-highlight">7</span>');
            expect(playerText).toContain('<span class="power-highlight">8</span>');
        }
    });

    test('Bracket mode should not use power level bolding', async ({ page }) => {
        // Create players in bracket mode
        helper = await setupWithPods(page, [
            { name: 'Alice', bracket: [1, 2] },
            { name: 'Bob', bracket: [1, 2] },
            { name: 'Charlie', bracket: [1, 2] },
            { name: 'Dave', bracket: [1, 2] }
        ], 'bracket');

        // Check that players show bracket info, not power bolding
        const playerElements = await helper.page.locator('.pod li.pod-player').all();

        for (let i = 0; i < playerElements.length; i++) {
            const playerText = await playerElements[i].textContent() || '';
            expect(playerText).toContain('(B:'); // Should show bracket format
            expect(playerText).not.toContain('(P:'); // Should not show power format

            const playerHTML = await playerElements[i].innerHTML();
            expect(playerHTML).not.toContain('power-highlight'); // Should not contain any highlighting classes
        }
    });
});
