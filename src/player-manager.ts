import { Player, Group, LeniencySettings } from './types.js';
import { parsePowerLevels } from './utils.js';

export class PlayerManager {
    private groups: Map<string, Player[]> = new Map();
    private nextPlayerId = 0;
    private nextGroupId = 1;
    private availableColors: number[] = [];
    private groupColorAssignments: Map<string, number> = new Map();

    constructor() {
        this.initializeAvailableColors();
    }

    private initializeAvailableColors(): void {
        // Initialize with all 50 colors available
        this.availableColors = Array.from({ length: 50 }, (_, i) => i + 1);
        this.shuffleArray(this.availableColors);
    }

    private shuffleArray(array: number[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    private assignRandomColor(groupId: string): number {
        if (this.groupColorAssignments.has(groupId)) {
            return this.groupColorAssignments.get(groupId)!;
        }

        if (this.availableColors.length === 0) {
            // If all colors are used, shuffle and restart (shouldn't happen with 50 colors)
            this.initializeAvailableColors();
        }

        const colorNumber = this.availableColors.pop()!;
        this.groupColorAssignments.set(groupId, colorNumber);
        return colorNumber;
    }

    private releaseColor(groupId: string): void {
        const colorNumber = this.groupColorAssignments.get(groupId);
        if (colorNumber) {
            this.availableColors.push(colorNumber);
            this.groupColorAssignments.delete(groupId);
        }
    }

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
        nameInput.classList.remove('input-error');

        const name = nameInput.value.trim();

        if (!name) {
            nameInput.classList.add('input-error');
            return null;
        }

        // Check if we're in bracket mode
        const bracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;
        const isBracketMode = bracketRadio.checked;

        if (isBracketMode) {
            // Handle bracket mode
            const bracketCheckboxes = row.querySelectorAll('.bracket-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
            const selectedBrackets: string[] = [];

            bracketCheckboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    selectedBrackets.push(checkbox.value);
                }
            });

            if (selectedBrackets.length === 0) {
                const bracketSelectorBtn = row.querySelector('.bracket-selector-btn') as HTMLButtonElement;
                bracketSelectorBtn.classList.add('error');
                return null;
            } else {
                // Remove error styling
                const bracketSelectorBtn = row.querySelector('.bracket-selector-btn') as HTMLButtonElement;
                bracketSelectorBtn.classList.remove('error');
            }

            // Convert brackets to power levels for algorithm compatibility
            // Map: 1=1, 2=2, 3=3, 4=4, cedh=10
            const bracketToPowerMap: { [key: string]: number } = {
                '1': 1,
                '2': 2,
                '3': 3,
                '4': 4,
                'cedh': 10
            };

            const availablePowers = selectedBrackets.map(bracket => bracketToPowerMap[bracket]);
            const averagePower = availablePowers.reduce((sum, power) => sum + power, 0) / availablePowers.length;

            return {
                id: parseInt(row.dataset.playerId!),
                name,
                power: Math.round(averagePower * 2) / 2, // Round to nearest 0.5
                availablePowers,
                powerRange: selectedBrackets.join(', '),
                brackets: selectedBrackets,
                bracketRange: selectedBrackets.join(', '),
                rowElement: row
            };
        } else {
            // Handle power level mode (existing logic)
            const powerCheckboxes = row.querySelectorAll('.power-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
            const powerData = parsePowerLevels(powerCheckboxes);

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
    }

    handleGroupChange(playerRowsContainer: HTMLElement): void {
        this.groups.clear();
        const allRows = Array.from(playerRowsContainer.querySelectorAll('.player-row'));

        // Clear all existing group classes first
        allRows.forEach(row => {
            for (let i = 1; i <= 50; i++) {
                const groupSelect = row.querySelector('.group-select') as HTMLSelectElement;
                groupSelect.classList.remove(`group-${i}`);
            }
        });

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

        // Apply group colors and collect group members
        allRows.forEach(row => {
            const select = row.querySelector('.group-select') as HTMLSelectElement;
            let groupId = '';

            if (select.value === 'new-group') {
                // Find the next available group ID
                if (!select.dataset.createdGroupId) {
                    let groupNum = 1;
                    while (existingGroupIds.has(`group-${groupNum}`)) {
                        groupNum++;
                    }
                    groupId = `group-${groupNum}`;
                    existingGroupIds.add(groupId);
                    select.dataset.createdGroupId = groupId;
                } else {
                    groupId = select.dataset.createdGroupId;
                }

                const player = this.getPlayerFromRow(row as HTMLElement);
                if (player) {
                    if (!this.groups.has(groupId)) this.groups.set(groupId, []);
                    this.groups.get(groupId)!.push(player);
                }
            } else if (select.value.startsWith('group-')) {
                groupId = select.value;
                const player = this.getPlayerFromRow(row as HTMLElement);
                if (player) {
                    if (!this.groups.has(select.value)) this.groups.set(select.value, []);
                    this.groups.get(select.value)!.push(player);
                }
            }

            // Apply visual styling to dropdown only
            if (groupId) {
                const colorNumber = this.assignRandomColor(groupId);
                if (colorNumber >= 1 && colorNumber <= 50) {
                    select.classList.add(`group-${colorNumber}`);
                }
            }
        });

        // Clean up unused group colors
        this.cleanupUnusedGroups(existingGroupIds);
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

        // Second pass: update dropdowns and maintain colors
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
                // Apply color styling for the current group
                const colorNumber = this.assignRandomColor(createdId);
                if (colorNumber >= 1 && colorNumber <= 50) {
                    select.classList.add(`group-${colorNumber}`);
                }
            } else if (currentValue.startsWith('group-') && createdGroupIds.has(currentValue)) {
                select.value = currentValue;
                // Apply color styling for the current group
                const colorNumber = this.assignRandomColor(currentValue);
                if (colorNumber >= 1 && colorNumber <= 50) {
                    select.classList.add(`group-${colorNumber}`);
                }
            } else {
                select.value = 'no-group';
                // Clear any group styling
                for (let i = 1; i <= 50; i++) {
                    select.classList.remove(`group-${i}`);
                }
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

    private cleanupUnusedGroups(activeGroupIds: Set<string>): void {
        // Release colors for groups that are no longer in use
        const assignedGroups = Array.from(this.groupColorAssignments.keys());
        assignedGroups.forEach(groupId => {
            if (!activeGroupIds.has(groupId)) {
                this.releaseColor(groupId);
            }
        });
    }
}
