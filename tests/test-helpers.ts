import { Page, expect } from '@playwright/test';

export async function setPowerLevels(page: Page, playerIndex: number, powerLevels: (string | number)[]) {
    const powers = powerLevels.map(p => p.toString());

    await page.evaluate(({ playerIndex, powers }) => {
        const playerRow = document.querySelector(`.player-row:nth-child(${playerIndex})`);
        if (!playerRow) return;

        const btn = playerRow.querySelector('.power-selector-btn') as HTMLElement;
        if (btn) btn.click();

        const dropdown = playerRow.querySelector('.power-selector-dropdown');
        if (dropdown) {
            const clearBtn = dropdown.querySelector('.clear-btn') as HTMLElement;
            if (clearBtn) clearBtn.click();

            for (const power of powers) {
                const checkbox = dropdown.querySelector(`.power-checkbox input[value="${power}"]`) as HTMLInputElement;
                if (checkbox) {
                    checkbox.checked = true;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }
        if (btn) btn.click();
    }, { playerIndex, powers });
}

export async function setBracketLevels(page: Page, playerIndex: number, bracketLevels: (string | number)[]) {
    const brackets = bracketLevels.map(b => b.toString());

    await page.evaluate(({ playerIndex, brackets }) => {
        const playerRow = document.querySelector(`.player-row:nth-child(${playerIndex})`);
        if (!playerRow) return;

        const btn = playerRow.querySelector('.bracket-selector-btn') as HTMLElement;
        if (btn) btn.click();

        const dropdown = playerRow.querySelector('.bracket-selector-dropdown');
        if (dropdown) {
            const clearBtn = dropdown.querySelector('.clear-btn') as HTMLElement;
            if (clearBtn) clearBtn.click();

            for (const bracket of brackets) {
                const checkbox = dropdown.querySelector(`.bracket-checkbox input[value="${bracket}"]`) as HTMLInputElement;
                if (checkbox) {
                    checkbox.checked = true;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }
        if (btn) btn.click();
    }, { playerIndex, brackets });
}

export async function createPlayers(page: Page, players: { name: string; power?: (string | number)[]; brackets?: (string | number)[] }[], mode: 'power' | 'bracket' = 'power') {
    const currentRows = await page.locator('.player-row').count();
    const rowsNeeded = players.length - currentRows;

    if (rowsNeeded > 0) {
        for (let i = 0; i < rowsNeeded; i++) {
            await page.click('#add-player-btn');
        }
    }

    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const playerIndex = i + 1;
        await page.fill(`.player-row:nth-child(${playerIndex}) .player-name`, player.name);
        if (mode === 'power' && player.power) {
            await setPowerLevels(page, playerIndex, player.power);
        } else if (mode === 'bracket' && player.brackets) {
            await setBracketLevels(page, playerIndex, player.brackets);
        }
    }
}

export async function setLeniency(page: Page, leniency: 'none' | 'regular' | 'super') {
    switch (leniency) {
        case 'none':
            await page.check('#no-leniency-radio');
            break;
        case 'regular':
            await page.check('#leniency-radio');
            break;
        case 'super':
            await page.check('#super-leniency-radio');
            break;
    }
}

export async function expectPlayerValidation(page: Page, playerIndex: number, hasError: boolean) {
    const nameInput = page.locator(`.player-row:nth-child(${playerIndex}) .player-name`);
    const powerBtn = page.locator(`.player-row:nth-child(${playerIndex}) .power-selector-btn`);
    const bracketBtn = page.locator(`.player-row:nth-child(${playerIndex}) .bracket-selector-btn`);

    if (hasError) {
        await expect(nameInput).toHaveClass(/input-error/);
        const powerVisible = await powerBtn.isVisible();
        if (powerVisible) {
            await expect(powerBtn).toHaveClass(/error/);
        } else {
            await expect(bracketBtn).toHaveClass(/error/);
        }
    } else {
        await expect(nameInput).not.toHaveClass(/input-error/);
        const powerVisible = await powerBtn.isVisible();
        if (powerVisible) {
            await expect(powerBtn).not.toHaveClass(/error/);
        } else {
            await expect(bracketBtn).not.toHaveClass(/error/);
        }
    }
}
