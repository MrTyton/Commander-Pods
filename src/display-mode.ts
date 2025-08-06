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

    private calculateOptimalWidthForText(text: string): number {
        // Base calculation: estimate text width more accurately
        // Different characters have different widths, but we'll use a simple heuristic
        let weightedLength = 0;

        for (const char of text) {
            if (char === ' ') {
                weightedLength += 0.3; // Spaces are narrower
            } else if (/[iIl1]/.test(char)) {
                weightedLength += 0.4; // Narrow characters
            } else if (/[mwMW]/.test(char)) {
                weightedLength += 0.8; // Wide characters
            } else if (/[A-Z]/.test(char)) {
                weightedLength += 0.7; // Capital letters are generally wider
            } else {
                weightedLength += 0.6; // Average character width
            }
        }

        // Reduce padding - only add 10% on each side (20% total) instead of 15%
        const widthWithPadding = weightedLength * 1.2;

        // Convert to percentage with tighter scaling - reduce blank space significantly
        // Base it on a reasonable character count assumption (about 25 chars = 85% width)
        const percentage = Math.min(85, Math.max(25, (widthWithPadding / 25) * 85));

        return Math.round(percentage);
    }

    private calculateFontSizeForPod(podWidth: number, podHeight: number, playerCount: number): string {
        // Base font size calculation based on pod dimensions and player count
        const podArea = podWidth * podHeight;
        const baseSize = Math.sqrt(podArea) / 40; // Slightly adjusted scaling factor

        // Adjust based on player count - more players = smaller font, but less dramatic
        const playerCountFactor = Math.max(0.7, 1 - (playerCount - 3) * 0.06);

        // Calculate final font size with tighter bounds for more consistent sizing
        const finalSize = Math.max(14, Math.min(24, baseSize * playerCountFactor));

        return `${Math.round(finalSize)}px`;
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

            // Calculate longest text in this pod for dynamic width calculation
            let longestText = '';
            pod.players.forEach(item => {
                if ('players' in item) { // It's a Group
                    item.players.forEach(p => {
                        const text = isBracketMode && p.bracketRange
                            ? `${p.name} (B: ${p.bracketRange})`
                            : `${p.name} (P: ${p.powerRange})`;
                        if (text.length > longestText.length) {
                            longestText = text;
                        }
                    });
                } else { // It's a Player
                    const text = isBracketMode && item.bracketRange
                        ? `${item.name} (B: ${item.bracketRange})`
                        : `${item.name} (P: ${item.powerRange})`;
                    if (text.length > longestText.length) {
                        longestText = text;
                    }
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

            // Calculate dynamic width based on longest text in this pod
            const optimalWidth = this.calculateOptimalWidthForText(longestText);

            // Store pod element reference for later font size calculation
            const podElementRef = podElement;

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

                        // Make player names adaptive and centered with dynamic width
                        playerItem.style.color = '#ffffff';
                        playerItem.style.textAlign = 'center';
                        playerItem.style.width = `${optimalWidth}%`;
                        playerItem.style.maxWidth = `${optimalWidth}%`;
                        playerItem.style.lineHeight = '1.2';
                        playerItem.style.fontWeight = '500';
                        playerItem.style.wordBreak = 'break-word';
                        playerItem.style.hyphens = 'auto';
                        playerItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        playerItem.style.borderRadius = '8px';
                        playerItem.style.boxSizing = 'border-box';

                        // Dynamic height based on number of players - make boxes more square-like
                        const baseHeight = Math.max(45, Math.min(100, (100 / Math.max(playerCount, 1)) + 25));
                        playerItem.style.minHeight = `${baseHeight}px`;
                        playerItem.style.padding = `${Math.max(6, baseHeight * 0.12)}px 10px`; // Reduced padding
                        playerItem.style.display = 'flex';
                        playerItem.style.alignItems = 'center';
                        playerItem.style.justifyContent = 'center';

                        // Store reference to apply font size after pod is sized
                        playerItem.dataset.podRef = index.toString();
                        playerItem.classList.add('dynamic-font-item');

                        // Set initial font size to prevent flicker - use a reasonable default
                        playerItem.style.fontSize = '18px';

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

                    // Make player names adaptive and centered with dynamic width
                    playerItem.style.color = '#ffffff';
                    playerItem.style.textAlign = 'center';
                    playerItem.style.width = `${optimalWidth}%`;
                    playerItem.style.maxWidth = `${optimalWidth}%`;
                    playerItem.style.lineHeight = '1.2';
                    playerItem.style.fontWeight = '500';
                    playerItem.style.wordBreak = 'break-word';
                    playerItem.style.hyphens = 'auto';
                    playerItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    playerItem.style.borderRadius = '8px';
                    playerItem.style.boxSizing = 'border-box';

                    // Dynamic height based on number of players - make boxes more square-like
                    const baseHeight = Math.max(45, Math.min(100, (100 / Math.max(playerCount, 1)) + 25));
                    playerItem.style.minHeight = `${baseHeight}px`;
                    playerItem.style.padding = `${Math.max(6, baseHeight * 0.12)}px 10px`; // Reduced padding
                    playerItem.style.display = 'flex';
                    playerItem.style.alignItems = 'center';
                    playerItem.style.justifyContent = 'center';

                    // Store reference to apply font size after pod is sized
                    playerItem.dataset.podRef = index.toString();
                    playerItem.classList.add('dynamic-font-item');

                    // Set initial font size to prevent flicker - use a reasonable default
                    playerItem.style.fontSize = '18px';

                    list.appendChild(playerItem);
                }
            });
            podElement.appendChild(list);
            podsGrid.appendChild(podElement);
        });

        displayOutput.appendChild(podsGrid);

        // Apply dynamic font sizing after DOM is rendered and pods are sized
        // Use requestAnimationFrame for smoother rendering
        requestAnimationFrame(() => {
            const allPods = podsGrid.querySelectorAll('div');
            allPods.forEach((podElement, podIndex) => {
                const rect = podElement.getBoundingClientRect();
                const podWidth = rect.width;
                const podHeight = rect.height;

                // Count players in this pod for font calculation
                let podPlayerCount = 0;
                currentPods[podIndex].players.forEach(item => {
                    if ('players' in item) {
                        podPlayerCount += item.players.length;
                    } else {
                        podPlayerCount += 1;
                    }
                });

                const dynamicFontSize = this.calculateFontSizeForPod(podWidth, podHeight, podPlayerCount);

                // Apply font size to all player items in this pod
                const playerItems = podElement.querySelectorAll('.dynamic-font-item');
                playerItems.forEach(item => {
                    (item as HTMLElement).style.fontSize = dynamicFontSize;
                });
            });
        });

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
