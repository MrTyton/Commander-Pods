import { Player, Group, LeniencySettings } from './types.js';
import { parsePowerLevels } from './utils.js';

export class PlayerManager {
    private groups: Map<string, Player[]> = new Map();
    private nextPlayerId = 0;
    private nextGroupId = 1;

    getNextPlayerId(): number {
        return this.nextPlayerId++;
    }

    resetPlayerIds(): void {
        this.nextPlayerId = 0;
    }

    getNextGroupId(): number {
        return this.nextGroupId++;
    }

    resetGroupIds(): void {
        this.nextGroupId = 1;
    }

    getGroups(): Map<string, Player[]> {
        return this.groups;
    }

    clearGroups(): void {
        this.groups.clear();
    }

    getPlayerFromRow(row: HTMLElement): Player | null {
        const nameInput = row.querySelector('.player-name') as HTMLInputElement;
        const powerCheckboxes = row.querySelectorAll('.power-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
        nameInput.classList.remove('input-error');

        const name = nameInput.value.trim();
        const powerData = parsePowerLevels(powerCheckboxes);

        if (!name) {
            nameInput.classList.add('input-error');
            return null;
        }

        if (powerData.availablePowers.length === 0) {
            const powerSelectorBtn = row.querySelector('.power-selector-btn') as HTMLButtonElement;
            powerSelectorBtn.classList.add('error');
            return null;
        } else {
            // Remove error styling
            const powerSelectorBtn = row.querySelector('.power-selector-btn') as HTMLButtonElement;
            powerSelectorBtn.classList.remove('error');
        }

        return {
            id: parseInt(row.dataset.playerId!),
            name,
            power: powerData.averagePower,
            availablePowers: powerData.availablePowers,
            powerRange: powerData.powerRange,
            rowElement: row
        };
    }

    handleGroupChange(playerRowsContainer: HTMLElement): void {
        this.groups.clear();
        const allRows = Array.from(playerRowsContainer.querySelectorAll('.player-row'));

        // Find existing group IDs to determine the next available ID
        const existingGroupIds = new Set<string>();
        allRows.forEach(row => {
            const select = row.querySelector('.group-select') as HTMLSelectElement;
            if (select.dataset.createdGroupId) {
                existingGroupIds.add(select.dataset.createdGroupId);
            } else if (select.value.startsWith('group-')) {
                existingGroupIds.add(select.value);
            }
        });

        allRows.forEach(row => {
            const select = row.querySelector('.group-select') as HTMLSelectElement;
            if (select.value === 'new-group') {
                // Find the next available group ID
                let newGroupId = '';
                if (!select.dataset.createdGroupId) {
                    let groupNum = 1;
                    while (existingGroupIds.has(`group-${groupNum}`)) {
                        groupNum++;
                    }
                    newGroupId = `group-${groupNum}`;
                    existingGroupIds.add(newGroupId);
                    select.dataset.createdGroupId = newGroupId;
                } else {
                    newGroupId = select.dataset.createdGroupId;
                }

                const player = this.getPlayerFromRow(row as HTMLElement);
                if (player) {
                    if (!this.groups.has(newGroupId)) this.groups.set(newGroupId, []);
                    this.groups.get(newGroupId)!.push(player);
                }
            } else if (select.value.startsWith('group-')) {
                const player = this.getPlayerFromRow(row as HTMLElement);
                if (player) {
                    if (!this.groups.has(select.value)) this.groups.set(select.value, []);
                    this.groups.get(select.value)!.push(player);
                }
            }
        });
    }

    updateAllGroupDropdowns(playerRowsContainer: HTMLElement): void {
        const createdGroupIds = new Set<string>();
        const allRows = Array.from(playerRowsContainer.querySelectorAll('.player-row'));

        // First pass: find all created groups
        allRows.forEach(row => {
            const select = row.querySelector('.group-select') as HTMLSelectElement;
            if (select.value === 'new-group' && select.dataset.createdGroupId) {
                createdGroupIds.add(select.dataset.createdGroupId);
            } else if (select.value.startsWith('group-')) {
                createdGroupIds.add(select.value);
            }
        });

        // Second pass: update dropdowns
        allRows.forEach(row => {
            const select = row.querySelector('.group-select') as HTMLSelectElement;
            const currentValue = select.value;

            // Preserve "new-group" if it created a group
            const createdId = select.dataset.createdGroupId;

            const options = Array.from(select.options);
            options.forEach(opt => {
                if (opt.value.startsWith('group-')) {
                    select.remove(opt.index);
                }
            });

            createdGroupIds.forEach(id => {
                const groupNumber = id.split('-')[1];
                const option = new Option(`Group ${groupNumber}`, id);
                select.add(option);
            });

            if (createdId && createdGroupIds.has(createdId)) {
                select.value = createdId;
            } else {
                select.value = currentValue;
            }
        });
    }

    arePlayersCompatible(player1: Player, player2: Player, leniencySettings: LeniencySettings): boolean {
        // Check for direct overlap in available powers
        const directOverlap = player1.availablePowers.some(power1 =>
            player2.availablePowers.some(power2 => Math.abs(power1 - power2) < 0.01)
        );

        if (directOverlap) return true;

        // Check for overlap within leniency tolerance
        if (leniencySettings.allowLeniency) {
            return player1.availablePowers.some(power1 =>
                player2.availablePowers.some(power2 =>
                    Math.abs(power1 - power2) <= leniencySettings.maxTolerance
                )
            );
        }

        return false;
    }

    findAllCommonPowers(players: Player[], leniencySettings: LeniencySettings): number[] {
        if (players.length === 0) return [];

        const allPowers = [...new Set(players.flatMap(p => p.availablePowers))].sort((a, b) => a - b);

        return allPowers.filter(power => {
            return players.every(player => {
                return player.availablePowers.some(availPower => {
                    const diff = Math.abs(availPower - power);
                    return diff < 0.01 || (leniencySettings.allowLeniency && diff <= leniencySettings.maxTolerance);
                });
            });
        });
    }

    findBestCommonPowerLevel(players: Player[]): number | null {
        if (players.length === 0) return null;

        // Find the most common power level across all players
        const powerCounts = new Map<number, number>();

        for (const player of players) {
            for (const power of player.availablePowers) {
                powerCounts.set(power, (powerCounts.get(power) || 0) + 1);
            }
        }

        if (powerCounts.size === 0) return null;

        // Return the power level that appears most frequently
        let bestPower = players[0].availablePowers[0]; // fallback
        let maxCount = 0;

        for (const [power, count] of powerCounts.entries()) {
            if (count > maxCount) {
                maxCount = count;
                bestPower = power;
            }
        }

        return bestPower;
    }

    calculatePodPower(items: (Player | Group)[]): number {
        if (items.length === 0) return 0;

        const totalPower = items.reduce((sum, item) => {
            if ('players' in item) {
                return sum + item.averagePower;
            } else {
                // For individual players, use their average power
                const powerValues = item.powerRange.split(',').map(p => parseFloat(p.trim()));
                const avgPower = powerValues.reduce((s, p) => s + p, 0) / powerValues.length;
                return sum + avgPower;
            }
        }, 0);

        return Math.round((totalPower / items.length) * 10) / 10;
    }
}
