import { Player, Group, Pod, LeniencySettings, VirtualPlayer, BacktrackingSolution, GenerationResult } from './types.js';

export class PodGenerator {

    generatePodsWithBacktracking(
        items: (Player | Group)[],
        targetSizes: number[],
        leniencySettings: LeniencySettings
    ): GenerationResult {
        const totalPlayers = items.reduce((sum, item) => sum + ('size' in item ? item.size : 1), 0);

        // For small groups (3-5 players), just put them all in one pod
        if (totalPlayers >= 3 && totalPlayers <= 5) {
            // Find the best common power level for all players in the pod
            const allPlayersInPod = items.flatMap(item =>
                'players' in item ? item.players : [item]
            );
            const bestPower = this.findBestCommonPowerLevel(allPlayersInPod);

            // Only create a pod if the players are actually compatible
            if (bestPower !== null) {
                return {
                    pods: [{ players: items, power: bestPower }],
                    unassigned: []
                };
            } else {
                // If no compatible power level, mark as unassigned
                return { pods: [], unassigned: items };
            }
        }

        // For everything else, use the virtual player optimization
        const pods = this.findOptimalPodAssignment(items, targetSizes, leniencySettings);

        // Create a set of assigned item IDs (both players and groups)
        const assignedItemIds = new Set<string>();
        for (const pod of pods) {
            for (const item of pod.players) {
                if ('players' in item) {
                    // It's a group - add the group ID
                    assignedItemIds.add(item.id);
                } else {
                    // It's a player - add the player ID as string
                    assignedItemIds.add(item.id.toString());
                }
            }
        }

        const unassigned = items.filter(item => {
            if ('players' in item) {
                // Group - unassigned if the group ID is not in assigned set
                return !assignedItemIds.has(item.id);
            } else {
                // Individual player - unassigned if player ID is not in assigned set
                return !assignedItemIds.has(item.id.toString());
            }
        });
        return { pods, unassigned };
    }

    private findOptimalPodAssignment(
        items: (Player | Group)[],
        targetSizes: number[],
        leniencySettings: LeniencySettings
    ): Pod[] {
        // Treat both groups and individuals as virtual players in the same optimization
        const virtualPlayerPods = this.optimizeVirtualPlayerAssignmentUnified(items, targetSizes, leniencySettings);
        return virtualPlayerPods;
    }

    private optimizeVirtualPlayerAssignmentUnified(
        items: (Player | Group)[],
        targetSizes: number[],
        leniencySettings: LeniencySettings
    ): Pod[] {
        if (items.length === 0) return [];

        const virtualPlayers = this.createVirtualPlayersUnified(items);

        // Group virtual players by exact power level first
        const powerGroups = new Map<number, VirtualPlayer[]>();

        for (const vp of virtualPlayers) {
            if (!powerGroups.has(vp.powerLevel)) {
                powerGroups.set(vp.powerLevel, []);
            }
            powerGroups.get(vp.powerLevel)!.push(vp);
        }

        // Use backtracking with leniency support
        const bestSolution: BacktrackingSolution = { pods: [], totalPods: 0 };

        if (leniencySettings.allowLeniency) {
            // Use leniency-aware backtracking with actual tolerance from settings
            this.backtrackVirtualPlayersWithLeniencyUnified(
                virtualPlayers,
                targetSizes,
                leniencySettings.maxTolerance,
                [],
                new Set<string>(),
                targetSizes,
                bestSolution
            );
        } else {
            // Use exact power level matching
            this.backtrackVirtualPlayersUnified(
                Array.from(powerGroups.entries()),
                [],
                new Set<string>(),
                targetSizes,
                bestSolution
            );
        }

        return bestSolution.pods;
    }

    private createVirtualPlayersUnified(items: (Player | Group)[]): VirtualPlayer[] {
        const virtualPlayers: VirtualPlayer[] = [];

        for (const item of items) {
            if ('players' in item) {
                // It's a group - always create virtual players for min, max, and average
                // Groups prioritize staying together and accept power level imbalance

                // Get all power levels from group members
                const allGroupPowers = item.players.flatMap(p => p.availablePowers);
                const minPower = Math.min(...allGroupPowers);
                const maxPower = Math.max(...allGroupPowers);
                const avgPower = item.averagePower;

                // Create virtual players in preference order: average, min, max
                // This promotes balance while allowing flexibility
                const groupPowers = [avgPower, minPower, maxPower];
                const uniqueGroupPowers = [...new Set(groupPowers)]; // Remove duplicates

                for (const powerLevel of uniqueGroupPowers) {
                    virtualPlayers.push({ item, powerLevel });
                }
            } else {
                // It's an individual player
                for (const powerLevel of item.availablePowers) {
                    virtualPlayers.push({ item, powerLevel });
                }
            }
        }

        return virtualPlayers;
    }

    private backtrackVirtualPlayersUnified(
        powerGroups: [number, VirtualPlayer[]][],
        currentPods: Pod[],
        usedItemIds: Set<string>,
        remainingTargetSizes: number[],
        bestSolution: BacktrackingSolution
    ): void {
        // Base case: no more target sizes to fill
        if (remainingTargetSizes.length === 0) {
            if (currentPods.length > bestSolution.totalPods) {
                bestSolution.pods = [...currentPods];
                bestSolution.totalPods = currentPods.length;
            }
            return;
        }

        // Pruning: if we can't possibly beat the best solution
        if (currentPods.length + remainingTargetSizes.length <= bestSolution.totalPods) {
            return;
        }

        const targetSize = remainingTargetSizes[0];
        const newRemainingTargetSizes = remainingTargetSizes.slice(1);

        // Try each power level that has enough available items
        for (const [powerLevel, virtualItemsAtThisPower] of powerGroups) {
            const availableVirtualItems = virtualItemsAtThisPower.filter(vi => {
                const itemId = 'players' in vi.item ? vi.item.id : vi.item.id.toString();
                return !usedItemIds.has(itemId);
            });

            // Calculate total actual player count (accounting for group sizes)
            const totalActualPlayers = availableVirtualItems.reduce((sum, vi) => {
                return sum + ('players' in vi.item ? vi.item.size : 1);
            }, 0);

            if (totalActualPlayers >= Math.max(3, targetSize)) {
                // Use simple selection instead of complex combinations
                // Try to form pods that match the target size as closely as possible
                const sortedBySize = availableVirtualItems.sort((a, b) => {
                    const aSize = 'players' in a.item ? a.item.size : 1;
                    const bSize = 'players' in b.item ? b.item.size : 1;
                    return bSize - aSize; // Larger items first to better fill target sizes
                });

                // Greedily select items to meet target size
                const selectedItems: VirtualPlayer[] = [];
                const selectedItemIds = new Set<string>();
                let currentSize = 0;

                for (const item of sortedBySize) {
                    const itemId = 'players' in item.item ? item.item.id : item.item.id.toString();
                    const itemSize = 'players' in item.item ? item.item.size : 1;

                    // Skip if we've already selected this item (prevents duplicate groups)
                    if (selectedItemIds.has(itemId)) {
                        continue;
                    }

                    if (currentSize + itemSize <= targetSize) {
                        selectedItems.push(item);
                        selectedItemIds.add(itemId);
                        currentSize += itemSize;

                        // If we hit the target exactly, use this combination
                        if (currentSize === targetSize) {
                            break;
                        }
                    }
                }

                // Only proceed if we have at least 3 actual players
                if (currentSize >= 3) {
                    const podItems = selectedItems.map(vi => vi.item);

                    const newPod: Pod = {
                        players: podItems,
                        power: powerLevel
                    };

                    const newUsedItemIds = new Set(usedItemIds);
                    for (const item of podItems) {
                        const itemId = 'players' in item ? item.id : item.id.toString();
                        newUsedItemIds.add(itemId);
                    }

                    // Recursive call
                    this.backtrackVirtualPlayersUnified(
                        powerGroups,
                        [...currentPods, newPod],
                        newUsedItemIds,
                        newRemainingTargetSizes,
                        bestSolution
                    );
                }
            }
        }

        // Also try skipping this target size (in case we can't fill it optimally)
        this.backtrackVirtualPlayersUnified(
            powerGroups,
            currentPods,
            usedItemIds,
            newRemainingTargetSizes,
            bestSolution
        );
    }

    private backtrackVirtualPlayersWithLeniencyUnified(
        virtualPlayers: VirtualPlayer[],
        targetSizes: number[],
        tolerance: number,
        currentPods: Pod[],
        usedItemIds: Set<string>,
        remainingTargetSizes: number[],
        bestSolution: BacktrackingSolution
    ): void {
        // Base case: no more target sizes to fill
        if (remainingTargetSizes.length === 0) {
            if (currentPods.length > bestSolution.totalPods) {
                bestSolution.pods = [...currentPods];
                bestSolution.totalPods = currentPods.length;
            }
            return;
        }

        // Pruning: if we can't possibly beat the best solution
        if (currentPods.length + remainingTargetSizes.length <= bestSolution.totalPods) {
            return;
        }

        const targetSize = remainingTargetSizes[0];
        const newRemainingTargetSizes = remainingTargetSizes.slice(1);

        // Get available virtual players
        const availableVirtualPlayers = virtualPlayers.filter(vp => {
            const itemId = 'players' in vp.item ? vp.item.id : vp.item.id.toString();
            return !usedItemIds.has(itemId);
        });

        // Get all unique power levels and try each as a base
        const uniquePowerLevels = [...new Set(availableVirtualPlayers.map(vp => vp.powerLevel))].sort((a, b) => a - b);

        for (const basePowerLevel of uniquePowerLevels) {
            // Find all virtual players compatible with this base power level
            const compatibleVirtualPlayers = availableVirtualPlayers.filter(vp => {
                // For individual Player: check if the virtual player's specific power level is within tolerance
                if (!('players' in vp.item)) {
                    return Math.abs(vp.powerLevel - basePowerLevel) <= tolerance;
                }
                // For Group: check if the virtual player's power level is within tolerance
                // (virtual players for groups are only created for power levels all members can play)
                return Math.abs(vp.powerLevel - basePowerLevel) <= tolerance;
            });

            // Deduplicate players - each player/group should appear only once
            // For players with multiple compatible power levels, prefer the one closest to basePowerLevel
            const deduplicatedPlayers = new Map<string, VirtualPlayer>();
            for (const vp of compatibleVirtualPlayers) {
                const itemId = 'players' in vp.item ? vp.item.id : vp.item.id.toString();

                if (!deduplicatedPlayers.has(itemId)) {
                    deduplicatedPlayers.set(itemId, vp);
                } else {
                    // If we already have this player, keep the one with power level closest to basePowerLevel
                    const existing = deduplicatedPlayers.get(itemId)!;
                    const existingDistance = Math.abs(existing.powerLevel - basePowerLevel);
                    const newDistance = Math.abs(vp.powerLevel - basePowerLevel);

                    if (newDistance < existingDistance) {
                        deduplicatedPlayers.set(itemId, vp);
                    }
                }
            }

            const uniqueCompatiblePlayers = Array.from(deduplicatedPlayers.values());

            // Sort compatible virtual players to prefer group average power, then individual players
            const sortedCompatiblePlayers = uniqueCompatiblePlayers.sort((a, b) => {
                // If both are groups, prefer based on power level proximity to average
                if ('players' in a.item && 'players' in b.item) {
                    const aIsAverage = Math.abs(a.powerLevel - a.item.averagePower) < 0.01;
                    const bIsAverage = Math.abs(b.powerLevel - b.item.averagePower) < 0.01;

                    if (aIsAverage && !bIsAverage) return -1;
                    if (!aIsAverage && bIsAverage) return 1;

                    // If both are average or both are not average, prefer the one closer to basePowerLevel
                    return Math.abs(a.powerLevel - basePowerLevel) - Math.abs(b.powerLevel - basePowerLevel);
                }

                // Prefer individual players over groups when power levels are similar
                if ('players' in a.item && !('players' in b.item)) return 1;
                if (!('players' in a.item) && 'players' in b.item) return -1;

                // For individual players, prefer closer to base power level
                return Math.abs(a.powerLevel - basePowerLevel) - Math.abs(b.powerLevel - basePowerLevel);
            });

            // Calculate total actual player count (accounting for group sizes)
            const totalActualPlayers = sortedCompatiblePlayers.reduce((sum, vp) => {
                return sum + ('players' in vp.item ? vp.item.size : 1);
            }, 0);

            if (totalActualPlayers >= Math.max(3, targetSize)) {
                // Use greedy selection to meet target size with preference-sorted players
                const sortedBySize = sortedCompatiblePlayers.sort((a, b) => {
                    const aSize = 'players' in a.item ? a.item.size : 1;
                    const bSize = 'players' in b.item ? b.item.size : 1;
                    return bSize - aSize; // Larger items first
                });

                // Greedily select items to meet target size, preventing duplicate groups
                const selectedItems: VirtualPlayer[] = [];
                const selectedItemIds = new Set<string>();
                let currentSize = 0;

                for (const item of sortedBySize) {
                    const itemId = 'players' in item.item ? item.item.id : item.item.id.toString();
                    const itemSize = 'players' in item.item ? item.item.size : 1;

                    // Skip if we've already selected this item (prevents duplicate groups in same pod)
                    if (selectedItemIds.has(itemId)) {
                        continue;
                    }

                    if (currentSize + itemSize <= targetSize) {
                        selectedItems.push(item);
                        selectedItemIds.add(itemId);
                        currentSize += itemSize;

                        if (currentSize === targetSize) {
                            break;
                        }
                    }
                }

                // Only proceed if we have at least 3 actual players
                if (currentSize >= 3) {
                    const podItems = selectedItems.map(vi => vi.item);

                    // Validate that the power spread doesn't exceed the leniency tolerance
                    if (!this.isPodPowerSpreadValid(selectedItems, tolerance)) {
                        continue; // Skip this power level and try the next one
                    }

                    // Calculate average power level for the pod
                    const avgPowerLevel = selectedItems.reduce((sum, vi) => sum + vi.powerLevel, 0) / selectedItems.length;

                    const newPod: Pod = {
                        players: podItems,
                        power: Math.round(avgPowerLevel * 2) / 2  // Round to nearest 0.5
                    };

                    const newUsedItemIds = new Set(usedItemIds);
                    for (const item of podItems) {
                        const itemId = 'players' in item ? item.id : item.id.toString();
                        newUsedItemIds.add(itemId);

                        // Also mark all other virtual players for this same item as used
                        // This prevents the same group/player from being assigned to multiple pods
                        virtualPlayers.forEach(vp => {
                            const vpItemId = 'players' in vp.item ? vp.item.id : vp.item.id.toString();
                            if (vpItemId === itemId) {
                                newUsedItemIds.add(vpItemId);
                            }
                        });
                    }

                    // Recursive call
                    this.backtrackVirtualPlayersWithLeniencyUnified(
                        virtualPlayers,
                        targetSizes,
                        tolerance,
                        [...currentPods, newPod],
                        newUsedItemIds,
                        newRemainingTargetSizes,
                        bestSolution
                    );
                }
            }
        }

        // Also try skipping this target size (in case we can't fill it optimally)
        this.backtrackVirtualPlayersWithLeniencyUnified(
            virtualPlayers,
            targetSizes,
            tolerance,
            currentPods,
            usedItemIds,
            newRemainingTargetSizes,
            bestSolution
        );
    }

    /**
     * Validates that the power level spread in a pod doesn't exceed the leniency tolerance.
     * With leniency, the maximum spread should equal the tolerance (not 2×).
     * This ensures that all players in the pod are within a reasonable range of each other.
     */
    private isPodPowerSpreadValid(selectedItems: VirtualPlayer[], tolerance: number): boolean {
        if (selectedItems.length === 0) return true;

        const powerLevels = selectedItems.map(vi => vi.powerLevel);
        const minPower = Math.min(...powerLevels);
        const maxPower = Math.max(...powerLevels);
        const spread = maxPower - minPower;

        // The maximum acceptable spread should equal the tolerance
        // This prevents scenarios like having players at 1.0, 1.5, 2.0 in the same pod with ±0.5 tolerance
        return spread <= tolerance;
    }

    private findBestCommonPowerLevel(players: Player[]): number | null {
        if (players.length === 0) return null;

        // Find the most common power level across all players (like original script.ts)
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
}
