import { Pod } from './types.js';

export class DisplayModeManager {
    private isDisplayMode = false;
    private handleKeyDown: ((e: KeyboardEvent) => void) | null = null;

    // Pool of 25 high-contrast colors for pod borders
    private readonly borderColors = [
        '#FF6B6B', // Red
        '#4ECDC4', // Teal
        '#45B7D1', // Blue
        '#FFA726', // Orange
        '#66BB6A', // Green
        '#AB47BC', // Purple
        '#EF5350', // Light Red
        '#26A69A', // Dark Teal
        '#42A5F5', // Light Blue
        '#FF7043', // Deep Orange
        '#9CCC65', // Light Green
        '#7E57C2', // Deep Purple
        '#EC407A', // Pink
        '#29B6F6', // Cyan
        '#FFCA28', // Amber
        '#8BC34A', // Lime
        '#673AB7', // Indigo
        '#F06292', // Light Pink
        '#00BCD4', // Dark Cyan
        '#FFEB3B', // Yellow
        '#795548', // Brown
        '#607D8B', // Blue Grey
        '#E91E63', // Deep Pink
        '#009688', // Dark Teal
        '#FF9800'  // Pure Orange
    ];

    private getShuffledColors(count: number): string[] {
        // Create a copy of colors and shuffle them
        const shuffled = [...this.borderColors];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // If we need more colors than available, repeat the pattern
        if (count > shuffled.length) {
            const repeated = [];
            for (let i = 0; i < count; i++) {
                repeated.push(shuffled[i % shuffled.length]);
            }
            return repeated;
        }

        return shuffled.slice(0, count);
    }

    private calculateValidPowerRange(pod: Pod): string {
        // Get all individual players from the pod (flatten groups)
        const allPlayers = pod.players.flatMap(item =>
            'players' in item ? item.players : [item]
        );

        if (allPlayers.length === 0) return pod.power.toString();

        const tolerance = this.getCurrentLeniencyTolerance();

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

    private getCurrentLeniencyTolerance(): number {
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

    private calculateValidBracketRange(pod: Pod): string {
        // Get all individual players from the pod (flatten groups)
        const allPlayers = pod.players.flatMap(item =>
            'players' in item ? item.players : [item]
        );

        if (allPlayers.length === 0) return 'Unknown';

        // Find all bracket levels that every player can participate in
        const validBrackets: string[] = [];

        // Get all unique bracket levels that any player can play
        const allPossibleBrackets = new Set<string>();
        allPlayers.forEach(player => {
            if (player.brackets) {
                player.brackets.forEach(bracket => allPossibleBrackets.add(bracket));
            }
        });

        // Check each possible bracket level to see if all players can participate
        for (const testBracket of allPossibleBrackets) {
            const canAllPlayersParticipate = allPlayers.every(player =>
                player.brackets && player.brackets.includes(testBracket)
            );

            if (canAllPlayersParticipate) {
                validBrackets.push(testBracket);
            }
        }

        // Sort brackets in order: 1, 2, 3, 4, cedh
        const bracketOrder = ['1', '2', '3', '4', 'cedh'];
        validBrackets.sort((a, b) => bracketOrder.indexOf(a) - bracketOrder.indexOf(b));

        if (validBrackets.length === 0) {
            return 'Unknown'; // Fallback
        } else if (validBrackets.length === 1) {
            return validBrackets[0];
        } else {
            // Check if it's a consecutive range (for numeric brackets only)
            const numericBrackets = validBrackets.filter(b => b !== 'cedh');
            const hasConsecutiveNumbers = numericBrackets.length > 1 &&
                numericBrackets.every((bracket, index) => {
                    if (index === 0) return true;
                    const current = parseInt(bracket);
                    const previous = parseInt(numericBrackets[index - 1]);
                    return current === previous + 1;
                });

            if (hasConsecutiveNumbers && numericBrackets.length === validBrackets.length && validBrackets.length > 1) {
                // Show as range for consecutive numeric brackets
                return `${validBrackets[0]}-${validBrackets[validBrackets.length - 1]}`;
            } else {
                // Show as comma-separated list for discrete values or mixed brackets
                return validBrackets.join(', ');
            }
        }
    }

    enterDisplayMode(currentPods: Pod[]): void {
        if (currentPods.length === 0) return;

        this.isDisplayMode = true;
        document.body.classList.add('display-mode');

        // Calculate grid size using ceil(sqrt(pods))
        const gridSize = Math.ceil(Math.sqrt(currentPods.length));

        // Create fullscreen container that replaces everything
        const displayContainer = document.createElement('div');
        displayContainer.className = 'display-mode-container';
        displayContainer.style.position = 'fixed';
        displayContainer.style.top = '0';
        displayContainer.style.left = '0';
        displayContainer.style.width = '100vw';
        displayContainer.style.height = '100vh';
        displayContainer.style.background = '#1a1a1a';
        displayContainer.style.zIndex = '1000';
        displayContainer.style.padding = '20px';
        displayContainer.style.boxSizing = 'border-box';
        displayContainer.style.overflow = 'hidden';

        displayContainer.innerHTML = `
            <div class="display-mode-controls">
                <button id="exit-display-btn">Exit Display Mode</button>
            </div>
            <h1 style="text-align: center; margin: 0 0 20px 0; font-size: 2.5rem; color: white;">MTG Commander Pods</h1>
            <div id="display-output" style="flex-grow: 1; height: calc(100vh - 140px);"></div>
        `;

        // Hide the original container completely
        const originalContainer = document.querySelector('.container') as HTMLElement;
        if (originalContainer) {
            originalContainer.style.display = 'none';
        }

        document.body.appendChild(displayContainer);

        // Render pods in grid layout
        const displayOutput = displayContainer.querySelector('#display-output')!;
        const podsGrid = document.createElement('div');
        podsGrid.style.display = 'grid';
        podsGrid.style.gap = '20px';
        podsGrid.style.height = '100%';
        podsGrid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        podsGrid.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

        // Get shuffled colors for the pods
        const podColors = this.getShuffledColors(currentPods.length);

        currentPods.forEach((pod, index) => {
            const podElement = document.createElement('div');
            podElement.style.display = 'flex';
            podElement.style.flexDirection = 'column';
            podElement.style.background = '#2a2a2a';
            podElement.style.border = `3px solid ${podColors[index]}`; // Use random color with thicker border
            podElement.style.borderRadius = '8px';
            podElement.style.padding = '15px';
            podElement.style.boxSizing = 'border-box';
            podElement.style.minHeight = '0';
            podElement.style.boxShadow = `0 0 10px ${podColors[index]}40`; // Add subtle glow effect
            podElement.classList.add(`pod-color-${index % 10}`);

            const title = document.createElement('h3');

            // Check if we're in bracket mode (same logic as ui-manager.ts)
            const bracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;
            const isBracketMode = bracketRadio && bracketRadio.checked;

            if (isBracketMode) {
                // In bracket mode, calculate the valid bracket range like power level mode does
                const validBracketRange = this.calculateValidBracketRange(pod);
                title.textContent = `Pod ${index + 1} (Bracket: ${validBracketRange})`;
            } else {
                const validPowerRange = this.calculateValidPowerRange(pod);
                title.textContent = `Pod ${index + 1} (Power: ${validPowerRange})`;
            }

            title.style.fontSize = '1.6rem';
            title.style.margin = '0 0 15px 0';
            title.style.textAlign = 'center';
            title.style.color = podColors[index]; // Make title match border color
            title.style.fontWeight = 'bold';
            title.style.flexShrink = '0';
            title.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)'; // Add text shadow for better contrast
            podElement.appendChild(title);

            // Count total players in this pod for dynamic sizing
            let playerCount = 0;
            pod.players.forEach(item => {
                if ('players' in item) { // It's a Group
                    playerCount += item.players.length;
                } else { // It's a Player
                    playerCount += 1;
                }
            });

            const list = document.createElement('ul');
            list.style.flexGrow = '1';
            list.style.display = 'flex';
            list.style.flexDirection = 'column';
            list.style.justifyContent = 'center'; // Center players vertically in the box
            list.style.alignItems = 'center'; // Center players horizontally
            list.style.margin = '0';
            list.style.padding = '0';
            list.style.listStyle = 'none';
            list.style.overflowY = 'auto';
            list.style.width = '100%'; // Take full width for centering
            list.style.gap = '8px'; // Use gap instead of margin for better spacing

            pod.players.forEach(item => {
                if ('players' in item) { // It's a Group - flatten to show individual players
                    item.players.forEach(p => {
                        const playerItem = document.createElement('li');

                        // Check if we're in bracket mode for player display
                        const bracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;
                        const isBracketMode = bracketRadio && bracketRadio.checked;

                        if (isBracketMode && p.bracketRange) {
                            playerItem.textContent = `${p.name} (B: ${p.bracketRange})`;
                        } else {
                            playerItem.textContent = `${p.name} (P: ${p.powerRange})`;
                        }

                        // Make player names adaptive and centered with better proportions
                        playerItem.style.color = '#ffffff';
                        playerItem.style.textAlign = 'center';
                        playerItem.style.width = '80%';
                        playerItem.style.maxWidth = '80%';
                        playerItem.style.fontSize = 'clamp(1rem, 2.5vw, 2rem)'; // Adaptive font size
                        playerItem.style.lineHeight = '1.2';
                        playerItem.style.fontWeight = '500';
                        playerItem.style.wordBreak = 'break-word';
                        playerItem.style.hyphens = 'auto';
                        playerItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        playerItem.style.borderRadius = '8px';
                        playerItem.style.boxSizing = 'border-box';

                        // Dynamic height based on number of players - make boxes more square-like
                        const baseHeight = Math.max(50, Math.min(120, (100 / Math.max(playerCount, 1)) + 30));
                        playerItem.style.minHeight = `${baseHeight}px`;
                        playerItem.style.padding = `${Math.max(8, baseHeight * 0.15)}px 12px`;
                        playerItem.style.display = 'flex';
                        playerItem.style.alignItems = 'center';
                        playerItem.style.justifyContent = 'center';
                        list.appendChild(playerItem);
                    });
                } else { // It's a Player
                    const playerItem = document.createElement('li');

                    // Check if we're in bracket mode for player display
                    const bracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;
                    const isBracketMode = bracketRadio && bracketRadio.checked;

                    if (isBracketMode && item.bracketRange) {
                        playerItem.textContent = `${item.name} (B: ${item.bracketRange})`;
                    } else {
                        playerItem.textContent = `${item.name} (P: ${item.powerRange})`;
                    }

                    // Make player names adaptive and centered with better proportions
                    playerItem.style.color = '#ffffff';
                    playerItem.style.textAlign = 'center';
                    playerItem.style.width = '80%';
                    playerItem.style.maxWidth = '80%';
                    playerItem.style.fontSize = 'clamp(1rem, 2.5vw, 2rem)'; // Adaptive font size
                    playerItem.style.lineHeight = '1.2';
                    playerItem.style.fontWeight = '500';
                    playerItem.style.wordBreak = 'break-word';
                    playerItem.style.hyphens = 'auto';
                    playerItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    playerItem.style.borderRadius = '8px';
                    playerItem.style.boxSizing = 'border-box';

                    // Dynamic height based on number of players - make boxes more square-like
                    const baseHeight = Math.max(50, Math.min(120, (100 / Math.max(playerCount, 1)) + 30));
                    playerItem.style.minHeight = `${baseHeight}px`;
                    playerItem.style.padding = `${Math.max(8, baseHeight * 0.15)}px 12px`;
                    playerItem.style.display = 'flex';
                    playerItem.style.alignItems = 'center';
                    playerItem.style.justifyContent = 'center';
                    list.appendChild(playerItem);
                }
            });
            podElement.appendChild(list);
            podsGrid.appendChild(podElement);
        });

        displayOutput.appendChild(podsGrid);

        // Add exit button functionality
        const exitBtn = displayContainer.querySelector('#exit-display-btn')!;
        exitBtn.addEventListener('click', () => this.exitDisplayMode());

        // Add ESC key support
        this.handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.isDisplayMode) {
                this.exitDisplayMode();
            }
        };
        document.addEventListener('keydown', this.handleKeyDown);
    }

    exitDisplayMode(): void {
        this.isDisplayMode = false;
        document.body.classList.remove('display-mode');

        // Restore the original container
        const originalContainer = document.querySelector('.container') as HTMLElement;
        if (originalContainer) {
            originalContainer.style.display = '';
        }

        // Remove display mode container
        const displayContainer = document.querySelector('.display-mode-container');
        if (displayContainer) {
            displayContainer.remove();
        }

        // Remove ESC key listener if it exists
        if (this.handleKeyDown) {
            document.removeEventListener('keydown', this.handleKeyDown);
            this.handleKeyDown = null;
        }
    }

    getIsDisplayMode(): boolean {
        return this.isDisplayMode;
    }
}
