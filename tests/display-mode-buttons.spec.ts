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

test.describe('Display Mode Button Functionality', () => {
    test('should show both top and bottom display mode buttons after generating pods', async ({ page }) => {
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

        // Check that both display mode buttons are hidden initially
        const topDisplayBtn = page.locator('#display-mode-btn');
        const bottomDisplayBtn = page.locator('#display-mode-btn-bottom');

        await expect(topDisplayBtn).toHaveCSS('display', 'none');
        await expect(bottomDisplayBtn).toHaveCount(0); // Bottom button doesn't exist until pods are generated

        // Generate pods
        await page.click('#generate-pods-btn');
        await page.waitForTimeout(100);

        // Check that both display mode buttons are now visible
        await expect(topDisplayBtn).toHaveCSS('display', 'inline-block');
        await expect(bottomDisplayBtn).toBeVisible();

        // Verify both buttons have the correct text
        await expect(topDisplayBtn).toHaveText('Display Mode');
        await expect(bottomDisplayBtn).toHaveText('Display Mode');

        // Verify bottom button is positioned before help section
        const helpBtn = page.locator('#help-btn');
        await expect(helpBtn).toBeVisible();

        // Check that bottom button comes before help button in DOM order
        const bottomBtnBox = await bottomDisplayBtn.boundingBox();
        const helpBtnBox = await helpBtn.boundingBox();
        expect(bottomBtnBox!.y).toBeLessThan(helpBtnBox!.y);
    });

    test('should allow entering display mode from both top and bottom buttons', async ({ page }) => {
        await page.goto('./index.html');

        // Add 4 players and generate pods
        await page.fill('.player-row:nth-child(1) .player-name', 'Alice');
        await setPowerLevels(page, 1, [6]);
        await page.fill('.player-row:nth-child(2) .player-name', 'Bob');
        await setPowerLevels(page, 2, [6]);
        await page.fill('.player-row:nth-child(3) .player-name', 'Charlie');
        await setPowerLevels(page, 3, [6]);
        await page.fill('.player-row:nth-child(4) .player-name', 'David');
        await setPowerLevels(page, 4, [6]);

        await page.click('#generate-pods-btn');
        await page.waitForTimeout(100);

        // Test top button functionality
        await page.click('#display-mode-btn');

        // Check that we entered display mode
        await expect(page.locator('.display-mode-container')).toBeVisible();
        await expect(page.locator('#exit-display-btn')).toBeVisible();

        // Exit display mode
        await page.click('#exit-display-btn');
        await expect(page.locator('.display-mode-container')).not.toBeVisible();

        // Test bottom button functionality
        await page.click('#display-mode-btn-bottom');

        // Check that we entered display mode again
        await expect(page.locator('.display-mode-container')).toBeVisible();
        await expect(page.locator('#exit-display-btn')).toBeVisible();

        // Exit display mode
        await page.click('#exit-display-btn');
        await expect(page.locator('.display-mode-container')).not.toBeVisible();
    });

    test('should remove bottom button when pods are cleared', async ({ page }) => {
        await page.goto('./index.html');

        // Add 4 players and generate pods
        await page.fill('.player-row:nth-child(1) .player-name', 'Alice');
        await setPowerLevels(page, 1, [6]);
        await page.fill('.player-row:nth-child(2) .player-name', 'Bob');
        await setPowerLevels(page, 2, [6]);
        await page.fill('.player-row:nth-child(3) .player-name', 'Charlie');
        await setPowerLevels(page, 3, [6]);
        await page.fill('.player-row:nth-child(4) .player-name', 'David');
        await setPowerLevels(page, 4, [6]);

        await page.click('#generate-pods-btn');
        await page.waitForTimeout(100);

        // Verify both buttons exist
        await expect(page.locator('#display-mode-btn')).toHaveCSS('display', 'inline-block');
        await expect(page.locator('#display-mode-btn-bottom')).toBeVisible();

        // Set up dialog handler to accept the reset confirmation
        page.on('dialog', dialog => {
            dialog.accept();
        });

        // Reset all (this should clear the pods and bottom button)
        await page.click('#reset-all-btn');
        await page.waitForTimeout(300);

        // Check that output section is cleared (pods are gone)
        await expect(page.locator('#output-section')).toBeEmpty();

        // Check that top button is hidden after reset
        await expect(page.locator('#display-mode-btn')).toHaveCSS('display', 'none');

        // And check that bottom button is removed
        await expect(page.locator('#display-mode-btn-bottom')).toHaveCount(0);
    });
});
