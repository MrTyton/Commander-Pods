import { LeniencySettings, Pod } from './types.js';

export function calculatePodSizes(n: number): number[] {
    if (n < 3) return [];
    if (n === 3) return [3];
    if (n === 4) return [4];
    if (n === 5) return [5];
    if (n === 6) return [3, 3];
    if (n === 7) return [4, 3];
    if (n === 8) return [4, 4];
    if (n === 9) return [3, 3, 3];
    if (n === 10) return [5, 5]; // Or [4,3,3] but 5s are often fine

    let fours = Math.floor(n / 4);
    let remainder = n % 4;

    if (remainder === 0) return Array(fours).fill(4);
    if (remainder === 1) {
        if (fours >= 2) return [...Array(fours - 2).fill(4), 5, 4]; // 4,4,1 -> 5,4
        return [3, 3, 3, 2]; // Should not happen with good logic
    }
    if (remainder === 2) {
        if (fours >= 1) return [...Array(fours - 1).fill(4), 3, 3]; // 4,2 -> 3,3
        return [3, 3, 3, 3]; // Should not happen
    }
    if (remainder === 3) return [...Array(fours).fill(4), 3];

    return []; // Fallback
}

export function calculatePodSizesAvoidFive(n: number): number[] {
    if (n < 3) return [];

    // For small numbers where avoiding 5s isn't possible or beneficial,
    // fall back to balanced algorithm
    if (n < 9) {
        return calculatePodSizes(n);
    }

    // For 9+ players, implement avoid-five logic
    if (n === 9) return [3, 3, 3];  // 9 = 3+3+3 instead of 5+4
    if (n === 10) return [4, 3, 3]; // 10 = 4+3+3 instead of 5+5
    if (n === 11) return [4, 4, 3]; // 11 = 4+4+3 instead of 5+4+2 (2 is invalid)
    if (n === 12) return [4, 4, 4]; // 12 = 4+4+4 instead of 5+5+2 (2 is invalid)
    if (n === 13) return [4, 3, 3, 3]; // 13 = 4+3+3+3 instead of 5+4+4
    if (n === 14) return [4, 4, 3, 3]; // 14 = 4+4+3+3 instead of 5+5+4
    if (n === 15) return [4, 4, 4, 3]; // 15 = 4+4+4+3 instead of 5+5+5

    // For larger numbers, use a general algorithm that prioritizes 4s and 3s
    const result: number[] = [];
    let remaining = n;

    // Try to use as many 4s as possible, then fill with 3s
    while (remaining >= 7) {
        result.push(4);
        remaining -= 4;
    }

    // Handle the remainder
    if (remaining === 6) {
        result.push(3, 3);
    } else if (remaining === 5) {
        // For remainder 5, we need to backtrack and use 3s instead
        if (result.length > 0) {
            // Remove one 4, add back to remaining, then split differently
            result.pop();
            remaining += 4; // remaining is now 9
            result.push(3, 3, 3); // 9 = 3+3+3
        } else {
            // This shouldn't happen with n>=9, but fallback to balanced
            return calculatePodSizes(n);
        }
    } else if (remaining === 4) {
        result.push(4);
    } else if (remaining === 3) {
        result.push(3);
    }

    return result.sort((a, b) => b - a); // Sort descending
}

export function getPodOptimizationSetting(): 'balanced' | 'avoid-five' {
    const avoidFiveRadio = document.getElementById('avoid-five-pods-radio') as HTMLInputElement;
    if (avoidFiveRadio && avoidFiveRadio.checked) {
        return 'avoid-five';
    }
    return 'balanced'; // Default to balanced
}

export function getLeniencySettings(): LeniencySettings {
    // Check if we're in bracket mode - if so, disable leniency
    const bracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;
    if (bracketRadio && bracketRadio.checked) {
        return {
            allowLeniency: false,
            allowSuperLeniency: false,
            maxTolerance: 0
        };
    }

    const noLeniencyRadio = document.getElementById('no-leniency-radio') as HTMLInputElement;
    const leniencyRadio = document.getElementById('leniency-radio') as HTMLInputElement;
    const superLeniencyRadio = document.getElementById('super-leniency-radio') as HTMLInputElement;

    if (superLeniencyRadio.checked) {
        return {
            allowLeniency: true,
            allowSuperLeniency: true,
            maxTolerance: 1.0
        };
    } else if (leniencyRadio.checked) {
        return {
            allowLeniency: true,
            allowSuperLeniency: false,
            maxTolerance: 0.5
        };
    } else {
        return {
            allowLeniency: false,
            allowSuperLeniency: false,
            maxTolerance: 0.0
        };
    }
}

export function parsePowerLevels(powerCheckboxes: NodeListOf<HTMLInputElement>): {
    availablePowers: number[],
    powerRange: string,
    averagePower: number
} {
    const selectedPowers: number[] = [];

    powerCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const power = parseFloat(checkbox.value);
            if (!isNaN(power)) {
                selectedPowers.push(power);
            }
        }
    });

    if (selectedPowers.length === 0) {
        return {
            availablePowers: [],
            powerRange: '',
            averagePower: 0
        };
    }

    selectedPowers.sort((a, b) => a - b);

    // Create a display string for the power range
    let powerRange: string;
    if (selectedPowers.length === 1) {
        powerRange = selectedPowers[0].toString();
    } else {
        powerRange = selectedPowers.join(', ');
    }

    const averagePower = selectedPowers.reduce((sum, power) => sum + power, 0) / selectedPowers.length;

    return {
        availablePowers: selectedPowers,
        powerRange,
        averagePower: Math.round(averagePower * 2) / 2
    };
}

export function getCurrentLeniencyTolerance(): number {
    // Get current leniency setting from the DOM
    const leniencyRadio = document.querySelector('#leniency-radio') as HTMLInputElement;
    const superLeniencyRadio = document.querySelector('#super-leniency-radio') as HTMLInputElement;

    if (superLeniencyRadio?.checked) {
        return 1.0; // Super leniency
    } else if (leniencyRadio?.checked) {
        return 0.5; // Regular leniency
    } else {
        return 0.0; // No leniency
    }
}

export function calculateValidPowerRange(pod: Pod): string {
    // Get all individual players from the pod (flatten groups)
    const allPlayers = pod.players.flatMap(item =>
        'players' in item ? item.players : [item]
    );

    if (allPlayers.length === 0) return pod.power.toString();

    const tolerance = getCurrentLeniencyTolerance();

    // Find all powers that every player can participate in (considering leniency)
    const validPowers: number[] = [];

    // Get all unique power levels that any player can play
    const allPossiblePowers = new Set<number>();
    allPlayers.forEach(player => {
        player.availablePowers.forEach(power => allPossiblePowers.add(power));
    });

    // Check each possible power level to see if all players can participate
    for (const testPower of allPossiblePowers) {
        const canAllPlayersParticipate = allPlayers.every(player =>
            player.availablePowers.some(playerPower =>
                Math.abs(testPower - playerPower) <= tolerance
            )
        );

        if (canAllPlayersParticipate) {
            validPowers.push(testPower);
        }
    }

    // Sort the valid powers
    validPowers.sort((a, b) => a - b);

    if (validPowers.length === 0) {
        return pod.power.toString(); // Fallback to current power
    } else if (validPowers.length === 1) {
        return validPowers[0].toString();
    } else {
        // Check if it's a continuous range or discrete values
        const isConsecutive = validPowers.every((power, index) =>
            index === 0 || power - validPowers[index - 1] <= 0.5
        );

        if (isConsecutive && validPowers.length > 2) {
            // Show as range for 3+ consecutive values
            return `${validPowers[0]}-${validPowers[validPowers.length - 1]}`;
        } else {
            // Show as comma-separated list for discrete values or small ranges
            return validPowers.join(', ');
        }
    }
}

export function formatPlayerPowerRangeWithBolding(player: any, validPowersForPod: number[]): string {
    // Parse the player's available powers
    let playerPowers: number[] = [];
    if (Array.isArray(player.availablePowers)) {
        playerPowers = player.availablePowers;
    } else if (typeof player.powerRange === 'string') {
        // Parse from powerRange string like "5, 6, 7" or "7-9"
        if (player.powerRange.includes('-')) {
            const [start, end] = player.powerRange.split('-').map((x: string) => parseFloat(x.trim()));
            for (let i = start; i <= end; i += 0.5) {
                playerPowers.push(i);
            }
        } else {
            playerPowers = player.powerRange.split(',').map((x: string) => parseFloat(x.trim()));
        }
    }

    // Create formatted string with bolded valid powers
    const formattedPowers = playerPowers.map(power => {
        const isValidForPod = validPowersForPod.includes(power);
        return isValidForPod ? `<b>${power}</b>` : power.toString();
    });

    return formattedPowers.join(', ');
}

export function getValidPowersArrayForPod(pod: Pod): number[] {
    // Get all individual players from the pod (flatten groups)
    const allPlayers = pod.players.flatMap(item =>
        'players' in item ? item.players : [item]
    );

    if (allPlayers.length === 0) return [];

    const tolerance = getCurrentLeniencyTolerance();

    // Find all powers that every player can participate in (considering leniency)
    const validPowers: number[] = [];

    // Get all unique power levels that any player can play
    const allPossiblePowers = new Set<number>();
    allPlayers.forEach(player => {
        player.availablePowers.forEach(power => allPossiblePowers.add(power));
    });

    // Check each possible power level to see if all players can participate
    for (const testPower of allPossiblePowers) {
        const canAllPlayersParticipate = allPlayers.every(player =>
            player.availablePowers.some(playerPower =>
                Math.abs(testPower - playerPower) <= tolerance
            )
        );

        if (canAllPlayersParticipate) {
            validPowers.push(testPower);
        }
    }

    // Sort the valid powers and return the array
    validPowers.sort((a, b) => a - b);
    return validPowers;
}
