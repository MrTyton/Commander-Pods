import { test, expect } from '@playwright/test';

// Helper function to set power levels using the new checkbox system
async function setPowerLevels(page: any, playerIndex: number, powerLevels: string | number[]) {
    const powers = typeof powerLevels === 'string' ? [parseFloat(powerLevels)] : powerLevels;

    await page.evaluate(({ playerIndex, powers }) => {
        const playerRow = document.querySelector(`.player-row:nth-child(${playerIndex})`);
        if (!playerRow) return;

        playerRow.scrollIntoView({ behavior: 'instant', block: 'nearest' });

        const btn = playerRow.querySelector('.power-selector-btn') as HTMLElement;
        if (btn) btn.click();

        const dropdown = playerRow.querySelector('.power-selector-dropdown') as HTMLElement;
        if (dropdown) {
            dropdown.style.display = 'block';
            dropdown.classList.add('show');

            const clearBtn = dropdown.querySelector('.clear-btn') as HTMLElement;
            if (clearBtn) clearBtn.click();

            powers.forEach(power => {
                const checkbox = dropdown.querySelector(`input[value="${power}"]`) as HTMLInputElement;
                if (checkbox) checkbox.checked = true;
            });

            if (btn) btn.click();
        }
    }, { playerIndex, powers });
}

test.describe('Display Mode Visual Test', () => {
    test('visual demonstration of display mode improvements', async ({ page }) => {
        await page.goto('./index.html');

        // Create scenario with different name lengths but same power level to ensure success
        const players = [
            { name: 'Jo', powers: [6] },                    // Very short name
            { name: 'Sue', powers: [6] },                   // Short name
            { name: 'Bartholomew', powers: [6] },           // Very long name
            { name: 'Alexander', powers: [6] }              // Long name  
        ];

        // Fill in players
        for (let i = 0; i < players.length; i++) {
            await page.fill(`.player-row:nth-child(${i + 1}) .player-name`, players[i].name);
            await setPowerLevels(page, i + 1, players[i].powers);
        }

        // Generate pods
        await page.click('#generate-pods-btn');
        await page.waitForTimeout(500);

        // Wait for display mode button
        await expect(page.locator('#display-mode-btn')).toHaveCSS('display', 'inline-block');

        // Enter display mode for visual inspection
        await page.click('#display-mode-btn');
        await page.waitForTimeout(1000); // Wait for display mode and font sizing

        // Check that display mode is active
        const displayContainer = page.locator('.display-mode-container');
        await expect(displayContainer).toBeVisible();

        // Get detailed measurements for each pod
        const playerItems = page.locator('.dynamic-font-item');
        const itemCount = await playerItems.count();

        const measurements: { podIndex: string, name: string, width: number, fontSize: number }[] = [];

        for (let i = 0; i < itemCount; i++) {
            const item = playerItems.nth(i);
            const podRef = await item.getAttribute('data-pod-ref');
            const playerName = await item.textContent();
            const width = await item.evaluate(el => parseFloat(window.getComputedStyle(el).width));
            const fontSize = await item.evaluate(el => parseFloat(window.getComputedStyle(el).fontSize));

            measurements.push({
                podIndex: podRef || 'unknown',
                name: playerName || 'unknown',
                width: Math.round(width),
                fontSize: Math.round(fontSize * 10) / 10
            });
        }

        // Group by pod for better visualization
        const podGroups: { [key: string]: typeof measurements } = {};
        measurements.forEach(m => {
            if (!podGroups[m.podIndex]) {
                podGroups[m.podIndex] = [];
            }
            podGroups[m.podIndex].push(m);
        });

        Object.keys(podGroups).forEach(podIndex => {

            // Check if all items in pod have same width (based on longest text)
            const widths = podGroups[podIndex].map(m => m.width);
            const uniqueWidths = [...new Set(widths)];
        });

        // Basic validation
        expect(measurements.length).toBeGreaterThan(0);
        measurements.forEach(m => {
            expect(m.fontSize).toBeGreaterThanOrEqual(12);
            expect(m.fontSize).toBeLessThanOrEqual(28);
            expect(m.width).toBeGreaterThan(100);
        });

        // Exit display mode
        await page.press('body', 'Escape');
        await page.waitForTimeout(200);
    });
});
