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

test.describe('Group Reassignment Bug Fix', () => {
    test('should not reassign players who moved to different groups', async ({ page }) => {
        await page.goto('./index.html');

        // Add 4 players with power levels
        await page.fill('.player-row:nth-child(1) .player-name', 'Player 1');
        await setPowerLevels(page, 1, [6]);
        await page.fill('.player-row:nth-child(2) .player-name', 'Player 2');
        await setPowerLevels(page, 2, [6]);
        await page.fill('.player-row:nth-child(3) .player-name', 'Player 3');
        await setPowerLevels(page, 3, [6]);
        await page.fill('.player-row:nth-child(4) .player-name', 'Player 4');
        await setPowerLevels(page, 4, [6]);

        // Create groups 1, 2, 3
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group'); // Player 1 creates Group 1
        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group'); // Player 2 creates Group 2
        await page.selectOption('.player-row:nth-child(3) .group-select', 'new-group'); // Player 3 creates Group 3

        // Verify initial state
        let player2Value = await page.locator('.player-row:nth-child(2) .group-select').inputValue();
        expect(player2Value).toBe('group-2');

        // Move Player 2 from Group 2 to Group 1
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');

        // Verify Player 2 is now in Group 1
        player2Value = await page.locator('.player-row:nth-child(2) .group-select').inputValue();
        expect(player2Value).toBe('group-1');

        // Create a new group with Player 4 (should reuse Group 2)
        await page.selectOption('.player-row:nth-child(4) .group-select', 'new-group');

        // Verify Player 4 is in Group 2
        const player4Value = await page.locator('.player-row:nth-child(4) .group-select').inputValue();
        expect(player4Value).toBe('group-2');

        // CRITICAL: Verify Player 2 is STILL in Group 1 (not reassigned back to Group 2)
        const finalPlayer2Value = await page.locator('.player-row:nth-child(2) .group-select').inputValue();
        expect(finalPlayer2Value).toBe('group-1');

        // Verify final group assignments
        const player1Value = await page.locator('.player-row:nth-child(1) .group-select').inputValue();
        const player3Value = await page.locator('.player-row:nth-child(3) .group-select').inputValue();

        expect(player1Value).toBe('group-1'); // Player 1 in Group 1
        expect(finalPlayer2Value).toBe('group-1'); // Player 2 moved to Group 1 and stayed there
        expect(player3Value).toBe('group-3'); // Player 3 in Group 3
        expect(player4Value).toBe('group-2'); // Player 4 in reused Group 2
    });
});
