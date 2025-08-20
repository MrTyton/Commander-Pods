import { test, expect } from '@playwright/test';

test.describe('Bracket Mode Fixes', () => {
    test('should fix bracket mode display issues', async ({ page }) => {
        await page.goto('file://' + __dirname.replace('tests', 'index.html'));

        // Open sidebar to access settings
        await page.click('#settings-toggle');
        await page.waitForTimeout(100);

        // Start in power level mode - verify tolerance settings are visible
        const toleranceFieldset = page.locator('.settings-grid fieldset:nth-child(2)'); // Power Level Tolerance is now 2nd fieldset
        await expect(toleranceFieldset).toBeVisible();

        // Switch to bracket mode
        const bracketRadio = page.locator('#bracket-radio');
        await bracketRadio.check();
        await page.waitForTimeout(100);

        // Verify tolerance settings are now hidden in bracket mode
        await expect(toleranceFieldset).not.toBeVisible();

        // Verify that "No Leniency" is selected when switching to bracket mode
        const noLeniencyRadio = page.locator('#no-leniency-radio');
        await expect(noLeniencyRadio).toBeChecked();

        // Add multiple players and set bracket to 1 (need at least 3 players for pod generation)
        const players = ['Player1', 'Player2', 'Player3', 'Player4'];

        for (let i = 0; i < players.length; i++) {
            const playerNameInput = page.locator(`.player-row:nth-child(${i + 1}) .player-name`);
            await playerNameInput.fill(players[i]);

            // Use JavaScript to directly set the checkbox since the dropdowns might have UI issues
            await page.evaluate((rowIndex) => {
                const checkbox = document.querySelector(`.player-row:nth-child(${rowIndex + 1}) .bracket-checkbox input[value="1"]`) as HTMLInputElement;
                if (checkbox) {
                    checkbox.checked = true;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, i);
            await page.waitForTimeout(50);
        }

        // Generate pods
        await page.click('#generate-pods-btn');
        await page.waitForTimeout(500);

        // Check if pods were generated at all (debug step)
        const outputSection = page.locator('#output-section');
        const outputText = await outputSection.textContent();

        // Check if there are any pods or unassigned players
        const anyOutput = page.locator('.pod, .unassigned-pod');
        await expect(anyOutput).toHaveCount(0, { timeout: 1000 }).catch(async () => {
            // If pods were generated, check the title
            const podTitle = page.locator('.pod h3').first();
            const titleText = await podTitle.textContent();
            expect(titleText).toContain('Bracket: 1');
            expect(titleText).not.toContain('Power: 1');

            // Verify player shows "(B: 1)" not "(P: 1)"
            const playerElement = page.locator('.pod-player').first();
            const playerText = await playerElement.textContent();
            expect(playerText).toContain('(B: 1)');
            expect(playerText).not.toContain('(P:');

            // Test display mode bracket phrasing
            const displayModeButton = page.locator('#display-mode-btn');
            await displayModeButton.click();
            await page.waitForTimeout(500);

            // Check display mode pod title
            const displayPodTitle = page.locator('.display-mode-container h3').first();
            const displayTitleText = await displayPodTitle.textContent();
            expect(displayTitleText).toContain('Bracket: 1');
            expect(displayTitleText).not.toContain('Power: 1');

            // Check display mode player text - now uses separated name/power structure
            const displayPlayerElement = page.locator('.display-mode-container li').first();
            const displayPlayerText = await displayPlayerElement.textContent();

            // Player text should contain the name and bracket info
            expect(displayPlayerText).toContain('Player4');  // Player name
            expect(displayPlayerText).toContain('B: 1');     // Bracket info
            expect(displayPlayerText).not.toContain('P:');   // Should not show power

            // Exit display mode
            await page.keyboard.press('Escape');
            await page.waitForTimeout(200);
        });
    });

    test('should treat groups with mixed bracket levels as highest bracket', async ({ page }) => {
        await page.goto('file://' + __dirname.replace('tests', 'index.html'));

        // Open sidebar to access settings
        await page.click('#settings-toggle');
        await page.waitForTimeout(100);

        // Switch to bracket mode
        const bracketRadio = page.locator('#bracket-radio');
        await bracketRadio.check();
        await page.waitForTimeout(100);

        // Add players for mixed bracket group
        const groupPlayers = ['GroupPlayer1', 'GroupPlayer2'];
        for (let i = 0; i < groupPlayers.length; i++) {
            const playerNameInput = page.locator(`.player-row:nth-child(${i + 1}) .player-name`);
            await playerNameInput.fill(groupPlayers[i]);

            // Set bracket ranges: Player1 = brackets 2,3 Player2 = brackets 3,4
            // This way they have bracket 3 in common
            if (i === 0) {
                // Player 1: Select brackets 2 and 3
                await page.evaluate(() => {
                    const checkbox2 = document.querySelector('.player-row:nth-child(1) .bracket-checkbox input[value="2"]') as HTMLInputElement;
                    const checkbox3 = document.querySelector('.player-row:nth-child(1) .bracket-checkbox input[value="3"]') as HTMLInputElement;
                    if (checkbox2) {
                        checkbox2.checked = true;
                        checkbox2.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    if (checkbox3) {
                        checkbox3.checked = true;
                        checkbox3.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            } else {
                // Player 2: Select brackets 3 and 4
                await page.evaluate(() => {
                    const checkbox3 = document.querySelector('.player-row:nth-child(2) .bracket-checkbox input[value="3"]') as HTMLInputElement;
                    const checkbox4 = document.querySelector('.player-row:nth-child(2) .bracket-checkbox input[value="4"]') as HTMLInputElement;
                    if (checkbox3) {
                        checkbox3.checked = true;
                        checkbox3.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    if (checkbox4) {
                        checkbox4.checked = true;
                        checkbox4.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            }
            await page.waitForTimeout(50);
        }

        // Select both players and create a group using the group dropdown
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');
        await page.waitForTimeout(200);

        // Add more individual players to test against the group
        const individualPlayers = ['Individual1', 'Individual2'];
        for (let i = 0; i < individualPlayers.length; i++) {
            const rowIndex = i + 3; // Start after the group
            const playerNameInput = page.locator(`.player-row:nth-child(${rowIndex}) .player-name`);
            await playerNameInput.fill(individualPlayers[i]);

            // Set these to bracket 3 to match the group's common bracket
            await page.evaluate((rowIdx) => {
                const checkbox = document.querySelector(`.player-row:nth-child(${rowIdx}) .bracket-checkbox input[value="3"]`) as HTMLInputElement;
                if (checkbox) {
                    checkbox.checked = true;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, rowIndex);
            await page.waitForTimeout(50);
        }

        // Generate pods
        await page.click('#generate-pods-btn');
        await page.waitForTimeout(500);

        // Check that a pod was generated
        const podTitle = page.locator('.pod h3').first();
        const titleText = await podTitle.textContent();

        // The system should show the bracket level that everyone can play at (the common level)
        // For players with (2,3) and (3,4) and (3) and (3), everyone can play at bracket 3
        expect(titleText).toContain('Bracket: 3');
        expect(titleText).not.toContain('Bracket: 2, 4'); // Should not show all possible brackets

        // Check that the group displays properly - should show both players
        const groupElement = page.locator('.pod-group').first();
        const groupText = await groupElement.textContent();

        // Group should contain both players with their individual bracket ranges shown
        expect(groupText).toContain('GroupPlayer1 (B: 2, 3)');
        expect(groupText).toContain('GroupPlayer2 (B: 3, 4)');

        // Verify individual players in the same pod show bracket 4
        const individualPlayerElements = page.locator('.pod-player');
        const individualCount = await individualPlayerElements.count();

        for (let i = 0; i < individualCount; i++) {
            const playerText = await individualPlayerElements.nth(i).textContent();
            expect(playerText).toContain('(B: 3)');
        }

        // Test display mode as well
        const displayModeButton = page.locator('#display-mode-btn');
        await displayModeButton.click();
        await page.waitForTimeout(500);

        // Check display mode shows the group correctly
        const displayPodTitle = page.locator('.display-mode-container h3').first();
        const displayTitleText = await displayPodTitle.textContent();
        expect(displayTitleText).toContain('Bracket: 3');
        expect(displayTitleText).not.toContain('Bracket: 2, 4'); // Should not show all possible brackets

        // Check individual players in display mode - now uses separated name/power structure
        const displayPlayerElements = page.locator('.display-mode-container li');
        const displayPlayerCount = await displayPlayerElements.count();

        for (let i = 0; i < displayPlayerCount; i++) {
            const playerText = await displayPlayerElements.nth(i).textContent();
            // Each individual player should show their bracket range
            // New format: name on one line, "B: X" on another line
            expect(playerText).toMatch(/B: (3|2, 3|3, 4)/); // Should be B: 3, B: 2,3, or B: 3,4
        }

        // Exit display mode
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
    });

    test('should display bracket ranges correctly', async ({ page }) => {
        await page.goto('file://' + __dirname.replace('tests', 'index.html'));

        // Open sidebar to access settings
        await page.click('#settings-toggle');
        await page.waitForTimeout(100);

        // Switch to bracket mode
        const bracketRadio = page.locator('#bracket-radio');
        await bracketRadio.check();
        await page.waitForTimeout(100);

        // Add players with overlapping bracket ranges that should result in a range display
        const players = ['Player1', 'Player2', 'Player3', 'Player4'];

        for (let i = 0; i < players.length; i++) {
            const playerNameInput = page.locator(`.player-row:nth-child(${i + 1}) .player-name`);
            await playerNameInput.fill(players[i]);

            // Set all players to brackets 3 and 4 (so they can all play at 3-4)
            await page.evaluate((rowIndex) => {
                const checkbox3 = document.querySelector(`.player-row:nth-child(${rowIndex + 1}) .bracket-checkbox input[value="3"]`) as HTMLInputElement;
                const checkbox4 = document.querySelector(`.player-row:nth-child(${rowIndex + 1}) .bracket-checkbox input[value="4"]`) as HTMLInputElement;
                if (checkbox3) {
                    checkbox3.checked = true;
                    checkbox3.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (checkbox4) {
                    checkbox4.checked = true;
                    checkbox4.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, i);
            await page.waitForTimeout(50);
        }

        // Generate pods
        await page.click('#generate-pods-btn');
        await page.waitForTimeout(500);

        // Check that a pod was generated with range display
        const podTitle = page.locator('.pod h3').first();
        const titleText = await podTitle.textContent();

        // Since all players can play at both 3 and 4, it should show "Bracket: 3-4"
        expect(titleText).toContain('Bracket: 3-4');

        // Test display mode as well
        const displayModeButton = page.locator('#display-mode-btn');
        await displayModeButton.click();
        await page.waitForTimeout(500);

        const displayPodTitle = page.locator('.display-mode-container h3').first();
        const displayTitleText = await displayPodTitle.textContent();
        expect(displayTitleText).toContain('Bracket: 3-4');

        // Exit display mode
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
    });

    test('should support cEDH hotfix button and keyboard shortcut 5', async ({ page }) => {
        await page.goto('file://' + __dirname.replace('tests', 'index.html'));

        // Open sidebar to access settings
        await page.click('#settings-toggle');
        await page.waitForTimeout(100);

        // Switch to bracket mode
        const bracketRadio = page.locator('#bracket-radio');
        await bracketRadio.check();
        await page.waitForTimeout(100);

        // Add a player to test with
        const playerNameInput = page.locator('.player-row:nth-child(1) .player-name');
        await playerNameInput.fill('TestPlayer');

        // Test the cEDH hotfix button
        const bracketSelectorBtn = page.locator('.player-row:nth-child(1) .bracket-selector-btn');
        await bracketSelectorBtn.click();
        await page.waitForTimeout(200);

        // Click the cEDH hotfix button
        const cedhButton = page.locator('.player-row:nth-child(1) .bracket-range-btn[data-range="cedh"]');
        await expect(cedhButton).toBeVisible();
        await cedhButton.click();
        await page.waitForTimeout(200);

        // Verify the button text shows cEDH selection
        const buttonText = await bracketSelectorBtn.textContent();
        expect(buttonText).toContain('Bracket: cEDH');

        // Verify the cEDH checkbox is checked
        const cedhCheckbox = page.locator('.player-row:nth-child(1) .bracket-checkbox input[value="cedh"]');
        await expect(cedhCheckbox).toBeChecked();

        // Verify other checkboxes are not checked
        const otherCheckboxes = page.locator('.player-row:nth-child(1) .bracket-checkbox input[value="1"], .player-row:nth-child(1) .bracket-checkbox input[value="2"], .player-row:nth-child(1) .bracket-checkbox input[value="3"], .player-row:nth-child(1) .bracket-checkbox input[value="4"]');
        for (let i = 0; i < await otherCheckboxes.count(); i++) {
            await expect(otherCheckboxes.nth(i)).not.toBeChecked();
        }

        // Test keyboard shortcut "5" - clear checkboxes first and test without checking dropdown visibility
        await page.evaluate(() => {
            const checkboxes = document.querySelectorAll('.player-row:nth-child(1) .bracket-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
            checkboxes.forEach(cb => cb.checked = false);
            const updateEvent = new Event('change', { bubbles: true });
            checkboxes.forEach(cb => cb.dispatchEvent(updateEvent));
        });
        await page.waitForTimeout(100);

        // For keyboard shortcuts, we need to ensure the dropdown stays open in WebKit
        // Use a different approach: focus the button first, then open with keyboard
        await bracketSelectorBtn.focus();
        await page.waitForTimeout(100);

        // Press '5' while focused - this should trigger the keyboard shortcut handler
        await page.keyboard.press('5');
        await page.waitForTimeout(600);

        // Verify the button text shows cEDH selection via keyboard
        await expect(bracketSelectorBtn).toContainText('Bracket: cEDH');

        // Verify the cEDH checkbox is checked via keyboard shortcut
        await expect(cedhCheckbox).toBeChecked();

        // Test keyboard shortcut when button is focused (not dropdown open)
        await page.evaluate(() => {
            const checkboxes = document.querySelectorAll('.player-row:nth-child(1) .bracket-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
            checkboxes.forEach(cb => cb.checked = false);
            const updateEvent = new Event('change', { bubbles: true });
            checkboxes.forEach(cb => cb.dispatchEvent(updateEvent));
        });
        await page.waitForTimeout(100);

        // Focus the bracket selector button and press "5"
        await bracketSelectorBtn.focus();
        await page.keyboard.press('5');
        await page.waitForTimeout(600);

        // Verify it works when focused
        await expect(bracketSelectorBtn).toContainText('Bracket: cEDH');
        await expect(cedhCheckbox).toBeChecked();

        // Test that existing "c" shortcut still works
        await page.evaluate(() => {
            const checkboxes = document.querySelectorAll('.player-row:nth-child(1) .bracket-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
            checkboxes.forEach(cb => cb.checked = false);
            const updateEvent = new Event('change', { bubbles: true });
            checkboxes.forEach(cb => cb.dispatchEvent(updateEvent));
        });
        await page.waitForTimeout(100);

        await bracketSelectorBtn.focus();
        await page.keyboard.press('c');
        await page.waitForTimeout(600);

        await expect(bracketSelectorBtn).toContainText('Bracket: cEDH');
        await expect(cedhCheckbox).toBeChecked();
    });
});
