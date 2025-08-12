import { Pod } from './types.js';
import { calculateValidPowerRange, getCurrentLeniencyTolerance, formatPlayerPowerRangeWithBolding, getValidPowersArrayForPod, formatPlayerBracketRangeWithBolding } from './utils.js';

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
        // More aggressive font size calculation for grid layout
        const podArea = podWidth * podHeight;

        // Calculate grid dimensions to determine cell size
        const gridCols = Math.ceil(Math.sqrt(playerCount));
        const gridRows = Math.ceil(playerCount / gridCols);

        // Approximate cell dimensions (accounting for gap)
        const cellWidth = (podWidth - (gridCols - 1) * 10) / gridCols; // 10px gap
        const cellHeight = (podHeight - (gridRows - 1) * 10) / gridRows; // 10px gap

        // Much more aggressive scaling - use cell dimensions directly
        const cellMinDimension = Math.min(cellWidth, cellHeight);

        // Base size should fill a significant portion of the cell
        // For a 2-line layout, we want each line to be roughly 1/3 of cell height
        const baseSize = Math.min(cellMinDimension * 0.25, cellHeight * 0.35);

        // Minimal player count penalty since grid handles density well
        const playerCountFactor = Math.max(0.9, 1 - (playerCount - 3) * 0.02);

        // Much higher minimum and maximum for better space utilization
        const finalSize = Math.max(24, Math.min(72, baseSize * playerCountFactor));

        return `${Math.round(finalSize)}px`;
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

    private getValidBracketsArrayForPod(pod: Pod): string[] {
        // Get all individual players from the pod (flatten groups)
        const allPlayers = pod.players.flatMap(item =>
            'players' in item ? item.players : [item]
        );

        if (allPlayers.length === 0) return [];

        // Use frequency-based approach for highlighting (like power levels)
        // Find the most common bracket levels across all players
        const bracketCounts = new Map<string, number>();

        allPlayers.forEach(player => {
            if (player.brackets) {
                player.brackets.forEach(bracket => {
                    bracketCounts.set(bracket, (bracketCounts.get(bracket) || 0) + 1);
                });
            }
        });

        if (bracketCounts.size === 0) return [];

        // Return brackets that appear frequently (more than half the players)
        const threshold = Math.ceil(allPlayers.length / 2);
        const validBrackets: string[] = [];

        for (const [bracket, count] of bracketCounts.entries()) {
            if (count >= threshold) {
                validBrackets.push(bracket);
            }
        }

        // Sort brackets in order: 1, 2, 3, 4, cedh
        const bracketOrder = ['1', '2', '3', '4', 'cedh'];
        validBrackets.sort((a, b) => bracketOrder.indexOf(a) - bracketOrder.indexOf(b));

        return validBrackets;
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
            podElement.classList.add('pod', `pod-color-${index % 10}`);

            const title = document.createElement('h3');

            // Check if we're in bracket mode (same logic as ui-manager.ts)
            const titleBracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;
            const titleIsBracketMode = titleBracketRadio && titleBracketRadio.checked;

            if (titleIsBracketMode) {
                // In bracket mode, calculate the valid bracket range like power level mode does
                const validBracketRange = this.calculateValidBracketRange(pod);
                title.textContent = `Pod ${index + 1} (Bracket: ${validBracketRange})`;
            } else {
                const validPowerRange = calculateValidPowerRange(pod);
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
                        const text = titleIsBracketMode && p.bracketRange
                            ? `${p.name} (B: ${p.bracketRange})`
                            : `${p.name} (P: ${p.powerRange})`;
                        if (text.length > longestText.length) {
                            longestText = text;
                        }
                    });
                } else { // It's a Player
                    const text = titleIsBracketMode && item.bracketRange
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
            // Calculate grid dimensions based on player count
            const gridCols = Math.ceil(Math.sqrt(playerCount));
            const gridRows = Math.ceil(playerCount / gridCols);

            // Set up grid layout for better space utilization
            list.style.display = 'grid';
            list.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
            list.style.gridTemplateRows = `repeat(${gridRows}, 1fr)`;
            list.style.gap = '12px';
            list.style.margin = '0';
            list.style.padding = '0';
            list.style.listStyle = 'none';
            list.style.width = '100%';
            list.style.height = '100%';
            list.style.alignItems = 'stretch';
            list.style.justifyItems = 'stretch';

            // Collect all players (flattening groups)
            const allPlayers: Array<{ name: string, powerRange?: string, bracketRange?: string }> = [];

            pod.players.forEach(item => {
                if ('players' in item) { // It's a Group - flatten to show individual players
                    item.players.forEach(p => allPlayers.push(p));
                } else { // It's a Player
                    allPlayers.push(item);
                }
            });

            // Check if we're in bracket mode for player display
            const playerBracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;
            const playerIsBracketMode = playerBracketRadio && playerBracketRadio.checked;

            allPlayers.forEach((player, playerIndex) => {
                const playerItem = document.createElement('li');

                // Create structured layout with name and power/bracket on separate lines
                const nameDiv = document.createElement('div');
                nameDiv.textContent = player.name;
                nameDiv.className = 'player-name';

                const powerDiv = document.createElement('div');
                if (playerIsBracketMode && player.bracketRange) {
                    // Use the bracket highlighting function for bracket levels in display mode
                    const validBracketsForPod = this.getValidBracketsArrayForPod(pod);
                    const formattedBracketRange = formatPlayerBracketRangeWithBolding(player, validBracketsForPod);
                    powerDiv.innerHTML = `B: ${formattedBracketRange}`;
                } else {
                    // Use the bolding function for power levels in display mode
                    const validPowersForPod = getValidPowersArrayForPod(pod);
                    const formattedPowerRange = formatPlayerPowerRangeWithBolding(player, validPowersForPod);
                    powerDiv.innerHTML = `P: ${formattedPowerRange}`;
                }
                powerDiv.className = 'player-power';

                playerItem.appendChild(nameDiv);
                playerItem.appendChild(powerDiv);

                // Style the player item container
                playerItem.style.display = 'flex';
                playerItem.style.flexDirection = 'column';
                playerItem.style.justifyContent = 'center';
                playerItem.style.alignItems = 'center';
                playerItem.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                playerItem.style.border = '2px solid rgba(255, 255, 255, 0.2)';
                playerItem.style.borderRadius = '12px';
                playerItem.style.padding = '8px';
                playerItem.style.boxSizing = 'border-box';
                playerItem.style.textAlign = 'center';
                playerItem.style.height = '100%';

                // Style the name
                nameDiv.style.color = '#ffffff';
                nameDiv.style.fontWeight = 'bold';
                nameDiv.style.lineHeight = '1.1';
                nameDiv.style.marginBottom = '4px';
                nameDiv.style.wordBreak = 'break-word';
                nameDiv.style.hyphens = 'auto';
                nameDiv.style.flexGrow = '1';
                nameDiv.style.display = 'flex';
                nameDiv.style.alignItems = 'center';
                nameDiv.style.justifyContent = 'center';

                // Style the power/bracket
                powerDiv.style.color = '#b0b0b0';
                powerDiv.style.fontWeight = '500';
                powerDiv.style.lineHeight = '1';
                powerDiv.style.opacity = '0.9';

                // Store reference for dynamic font sizing
                playerItem.dataset.podRef = index.toString();
                playerItem.classList.add('dynamic-font-item');

                list.appendChild(playerItem);
            });

            podElement.appendChild(list);
            podsGrid.appendChild(podElement);
        });

        displayOutput.appendChild(podsGrid);

        // Apply dynamic font sizing after DOM is rendered and pods are sized
        // Use requestAnimationFrame for smoother rendering
        requestAnimationFrame(() => {
            const allPods = podsGrid.querySelectorAll('.pod');
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
                    const nameDiv = item.querySelector('.player-name') as HTMLElement;
                    const powerDiv = item.querySelector('.player-power') as HTMLElement;

                    if (nameDiv) {
                        // Name gets the full calculated font size
                        nameDiv.style.fontSize = dynamicFontSize;
                    }
                    if (powerDiv) {
                        // Power gets 75% of the calculated size for better proportion
                        const powerFontSize = Math.round(parseInt(dynamicFontSize) * 0.75);
                        powerDiv.style.fontSize = `${powerFontSize}px`;
                    }
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
