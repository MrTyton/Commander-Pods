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
            powers.forEach(power => {
                const checkbox = dropdown.querySelector(`input[value="${power}"]`) as HTMLInputElement;
                if (checkbox) checkbox.checked = true;
            });

            // Close the dropdown by clicking the button again
            if (btn) btn.click();
        }
    }, { playerIndex, powers });
}

test.describe('Display Mode Styling', () => {
    test('should have centered, adaptive player names in display mode', async ({ page }) => {
        await page.goto('./index.html');

        // Add 4 players with power levels
        await page.fill('.player-row:nth-child(1) .player-name', 'Alice');
        await setPowerLevels(page, 1, [6]);
        await page.fill('.player-row:nth-child(2) .player-name', 'Bob');
        await setPowerLevels(page, 2, [6]);
        await page.fill('.player-row:nth-child(3) .player-name', 'Charlie');
        await setPowerLevels(page, 3, [6]);
        await page.fill('.player-row:nth-child(4) .player-name', 'David');
        await setPowerLevels(page, 4, [6]);

        // Generate pods
        await page.click('#generate-pods-btn');
        await page.waitForTimeout(100);

        // Enter display mode
        await page.click('#display-mode-btn');

        // Check that we entered display mode
        await expect(page.locator('.display-mode-container')).toBeVisible();

        // Verify player items have the new styling
        const firstPlayerItem = page.locator('.display-mode-container li').first();
        
        // Check text alignment
        await expect(firstPlayerItem).toHaveCSS('text-align', 'center');
        
        // Check that width is approximately 80% by comparing to parent container
        const playerItemWidth = await firstPlayerItem.evaluate(el => el.getBoundingClientRect().width);
        const containerWidth = await page.locator('.display-mode-container ul').first().evaluate(el => el.getBoundingClientRect().width);
        const widthRatio = playerItemWidth / containerWidth;
        expect(widthRatio).toBeCloseTo(0.8, 1); // 80% with 1 decimal tolerance
        
        // Check that font-size uses clamp (should be larger than 1rem)
        const fontSize = await firstPlayerItem.evaluate(el => getComputedStyle(el).fontSize);
        const fontSizeValue = parseFloat(fontSize);
        expect(fontSizeValue).toBeGreaterThanOrEqual(16); // 1rem = 16px typically
        
        // Check background color for better visibility
        await expect(firstPlayerItem).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.1)');
        
        // Check border radius is now larger (8px instead of 4px)
        await expect(firstPlayerItem).toHaveCSS('border-radius', '8px');
        
        // Check that player items now have flex display for better centering
        await expect(firstPlayerItem).toHaveCSS('display', 'flex');
        await expect(firstPlayerItem).toHaveCSS('align-items', 'center');
        await expect(firstPlayerItem).toHaveCSS('justify-content', 'center');
        
        // Check that player items have dynamic minimum height
        const minHeight = await firstPlayerItem.evaluate(el => getComputedStyle(el).minHeight);
        const minHeightValue = parseFloat(minHeight);
        expect(minHeightValue).toBeGreaterThanOrEqual(50); // Should be at least 50px
        
        // Verify the ul container centers items and uses gap
        const playersList = page.locator('.display-mode-container ul').first();
        await expect(playersList).toHaveCSS('justify-content', 'center');
        await expect(playersList).toHaveCSS('align-items', 'center');
        await expect(playersList).toHaveCSS('gap', '8px');

        // Exit display mode to clean up
        await page.click('#exit-display-btn');
        await expect(page.locator('.display-mode-container')).not.toBeVisible();
    });
});
