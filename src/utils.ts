import { LeniencySettings } from './types.js';

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
