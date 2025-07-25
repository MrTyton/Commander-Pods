"use strict";
document.addEventListener('DOMContentLoaded', () => {
    const playerRowsContainer = document.getElementById('player-rows');
    const addPlayerBtn = document.getElementById('add-player-btn');
    const generatePodsBtn = document.getElementById('generate-pods-btn');
    const resetAllBtn = document.getElementById('reset-all-btn');
    const leniencyCheckbox = document.getElementById('leniency-checkbox');
    const outputSection = document.getElementById('output-section');
    const playerRowTemplate = document.getElementById('player-row-template');
    let nextPlayerId = 0;
    let nextGroupId = 1;
    let groups = new Map();
    const addPlayerRow = () => {
        const newRow = playerRowTemplate.content.cloneNode(true);
        const playerRowDiv = newRow.querySelector('.player-row');
        playerRowDiv.dataset.playerId = nextPlayerId.toString();
        const removeBtn = newRow.querySelector('.remove-player-btn');
        removeBtn.addEventListener('click', () => {
            playerRowsContainer.removeChild(playerRowDiv);
            updateAllGroupDropdowns();
        });
        const groupSelect = newRow.querySelector('.group-select');
        groupSelect.addEventListener('change', handleGroupChange);
        playerRowsContainer.appendChild(newRow);
        nextPlayerId++;
        updateAllGroupDropdowns();
    };
    const handleGroupChange = () => {
        groups.clear();
        nextGroupId = 1;
        const allRows = Array.from(playerRowsContainer.querySelectorAll('.player-row'));
        allRows.forEach(row => {
            const select = row.querySelector('.group-select');
            if (select.value === 'new-group') {
                const newGroupId = `group-${nextGroupId++}`;
                const player = getPlayerFromRow(row);
                if (player) {
                    if (!groups.has(newGroupId))
                        groups.set(newGroupId, []);
                    groups.get(newGroupId).push(player);
                }
                select.dataset.createdGroupId = newGroupId;
            }
            else if (select.value.startsWith('group-')) {
                const player = getPlayerFromRow(row);
                if (player) {
                    if (!groups.has(select.value))
                        groups.set(select.value, []);
                    groups.get(select.value).push(player);
                }
            }
        });
        updateAllGroupDropdowns();
    };
    const updateAllGroupDropdowns = () => {
        const createdGroupIds = new Set();
        const allRows = Array.from(playerRowsContainer.querySelectorAll('.player-row'));
        // First pass: find all created groups
        allRows.forEach(row => {
            const select = row.querySelector('.group-select');
            if (select.value === 'new-group' && select.dataset.createdGroupId) {
                createdGroupIds.add(select.dataset.createdGroupId);
            }
            else if (select.value.startsWith('group-')) {
                createdGroupIds.add(select.value);
            }
        });
        // Second pass: update dropdowns
        allRows.forEach(row => {
            const select = row.querySelector('.group-select');
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
            }
            else {
                select.value = currentValue;
            }
        });
    };
    const getPlayerFromRow = (row) => {
        const nameInput = row.querySelector('.player-name');
        const powerInput = row.querySelector('.power-level');
        nameInput.classList.remove('input-error');
        powerInput.classList.remove('input-error');
        const name = nameInput.value.trim();
        const power = parseFloat(powerInput.value);
        if (!name) {
            nameInput.classList.add('input-error');
            return null;
        }
        if (isNaN(power) || power < 1 || power > 10) {
            powerInput.classList.add('input-error');
            return null;
        }
        return {
            id: parseInt(row.dataset.playerId),
            name,
            power,
            rowElement: row
        };
    };
    const generatePods = () => {
        outputSection.innerHTML = '';
        handleGroupChange(); // Recalculate groups based on current selections
        const allPlayers = [];
        const playerRows = Array.from(playerRowsContainer.querySelectorAll('.player-row'));
        let validationFailed = false;
        for (const row of playerRows) {
            const player = getPlayerFromRow(row);
            if (player) {
                allPlayers.push(player);
            }
            else {
                validationFailed = true;
            }
        }
        if (validationFailed) {
            alert('Please fix the errors before generating pods.');
            return;
        }
        const processedGroups = new Map();
        groups.forEach((players, id) => {
            const totalPower = players.reduce((sum, p) => sum + p.power, 0);
            const averagePower = Math.round((totalPower / players.length) * 2) / 2; // Round to nearest 0.5
            processedGroups.set(id, {
                id,
                players,
                averagePower,
                size: players.length
            });
        });
        const groupedPlayerIds = new Set([...groups.values()].flat().map(p => p.id));
        const ungroupedPlayers = allPlayers.filter(p => !groupedPlayerIds.has(p.id));
        let itemsToPod = [...ungroupedPlayers];
        processedGroups.forEach(group => {
            itemsToPod.push({
                id: group.id,
                players: group.players,
                averagePower: group.averagePower,
                size: group.size
            });
        });
        const totalPlayerCount = allPlayers.length;
        if (totalPlayerCount < 3) {
            alert("You need at least 3 players to form a pod.");
            return;
        }
        const podSizes = calculatePodSizes(totalPlayerCount);
        // Use backtracking algorithm for optimal pod assignment
        const result = generatePodsWithBacktracking(itemsToPod, podSizes, leniencyCheckbox.checked);
        const pods = result.pods;
        let unassignedPlayers = result.unassigned;
        // Try to squeeze remaining players into existing pods if possible
        const finalUnassigned = [];
        for (const item of unassignedPlayers) {
            let placed = false;
            const itemSize = 'size' in item ? item.size : 1;
            const itemPower = 'power' in item ? item.power : item.averagePower;
            // Try to place in existing pods (prefer same power level, then leniency if enabled)
            for (const pod of pods) {
                const currentPodSize = pod.players.reduce((sum, p) => sum + ('size' in p ? p.size : 1), 0);
                const canFit = currentPodSize + itemSize <= 5; // Max pod size is 5
                const powerMatch = Math.abs(pod.power - itemPower) < 0.01; // Exact match
                const leniencyMatch = leniencyCheckbox.checked && Math.abs(pod.power - itemPower) <= 0.5;
                if (canFit && (powerMatch || leniencyMatch)) {
                    pod.players.push(item);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                finalUnassigned.push(item);
            }
        }
        renderPods(pods, finalUnassigned);
    };
    const calculatePodSizes = (n) => {
        if (n < 3)
            return [];
        if (n === 3)
            return [3];
        if (n === 4)
            return [4];
        if (n === 5)
            return [5];
        if (n === 6)
            return [3, 3];
        if (n === 7)
            return [4, 3];
        if (n === 8)
            return [4, 4];
        if (n === 9)
            return [3, 3, 3];
        if (n === 10)
            return [5, 5]; // Or [4,3,3] but 5s are often fine
        let fours = Math.floor(n / 4);
        let remainder = n % 4;
        if (remainder === 0)
            return Array(fours).fill(4);
        if (remainder === 1) {
            if (fours >= 2)
                return [...Array(fours - 2).fill(4), 5, 4]; // 4,4,1 -> 5,4
            return [3, 3, 3, 2]; // Should not happen with good logic
        }
        if (remainder === 2) {
            if (fours >= 1)
                return [...Array(fours - 1).fill(4), 3, 3]; // 4,2 -> 3,3
            return [3, 3, 3, 3]; // Should not happen
        }
        if (remainder === 3)
            return [...Array(fours).fill(4), 3];
        return []; // Fallback
    };
    const renderPods = (pods, unassignedPlayers = []) => {
        outputSection.innerHTML = '';
        if (pods.length === 0) {
            outputSection.textContent = 'Could not form pods with the given players.';
            return;
        }
        pods.forEach((pod, index) => {
            const podElement = document.createElement('div');
            podElement.classList.add('pod', `pod-color-${index % 10}`);
            const title = document.createElement('h3');
            title.textContent = `Pod ${index + 1} (Power: ${pod.power})`;
            podElement.appendChild(title);
            const list = document.createElement('ul');
            pod.players.forEach(item => {
                if ('players' in item) { // It's a Group
                    const groupItem = document.createElement('li');
                    groupItem.innerHTML = `<strong>Group ${item.id.split('-')[1]} (Avg Power: ${item.averagePower}):</strong>`;
                    const subList = document.createElement('ul');
                    item.players.forEach(p => {
                        const playerItem = document.createElement('li');
                        playerItem.textContent = `${p.name} (P: ${p.power})`;
                        subList.appendChild(playerItem);
                    });
                    groupItem.appendChild(subList);
                    list.appendChild(groupItem);
                }
                else { // It's a Player
                    const playerItem = document.createElement('li');
                    playerItem.textContent = `${item.name} (P: ${item.power})`;
                    list.appendChild(playerItem);
                }
            });
            podElement.appendChild(list);
            outputSection.appendChild(podElement);
        });
        // Display unassigned players if any
        if (unassignedPlayers.length > 0) {
            const unassignedElement = document.createElement('div');
            unassignedElement.classList.add('pod', 'unassigned-pod');
            unassignedElement.style.borderColor = '#ff6b6b';
            unassignedElement.style.backgroundColor = '#2a1f1f';
            const title = document.createElement('h3');
            title.textContent = 'Unassigned Players';
            title.style.color = '#ff6b6b';
            unassignedElement.appendChild(title);
            const list = document.createElement('ul');
            unassignedPlayers.forEach(item => {
                if ('players' in item) { // It's a Group
                    const groupItem = document.createElement('li');
                    groupItem.innerHTML = `<strong>Group ${item.id.split('-')[1]} (Avg Power: ${item.averagePower}):</strong>`;
                    const subList = document.createElement('ul');
                    item.players.forEach(p => {
                        const playerItem = document.createElement('li');
                        playerItem.textContent = `${p.name} (P: ${p.power})`;
                        subList.appendChild(playerItem);
                    });
                    groupItem.appendChild(subList);
                    list.appendChild(groupItem);
                }
                else { // It's a Player
                    const playerItem = document.createElement('li');
                    playerItem.textContent = `${item.name} (P: ${item.power})`;
                    list.appendChild(playerItem);
                }
            });
            unassignedElement.appendChild(list);
            outputSection.appendChild(unassignedElement);
        }
    };
    const resetAll = () => {
        playerRowsContainer.innerHTML = '';
        outputSection.innerHTML = '';
        groups.clear();
        nextPlayerId = 0;
        nextGroupId = 1;
        leniencyCheckbox.checked = false;
        // Add a few default rows to start
        addPlayerRow();
        addPlayerRow();
        addPlayerRow();
        addPlayerRow();
    };
    addPlayerBtn.addEventListener('click', addPlayerRow);
    generatePodsBtn.addEventListener('click', generatePods);
    resetAllBtn.addEventListener('click', resetAll);
    // Initial state
    resetAll();
    // Backtracking algorithm for optimal pod assignment
    const findOptimalPodAssignment = (items, targetSizes, allowLeniency) => {
        const bestSolution = { pods: [], unassignedCount: items.length };
        // Sort items by power level for better pruning
        const sortedItems = [...items].sort((a, b) => {
            const powerA = 'power' in a ? a.power : a.averagePower;
            const powerB = 'power' in b ? b.power : b.averagePower;
            return powerB - powerA;
        });
        backtrack(sortedItems, [], targetSizes, allowLeniency, bestSolution);
        return bestSolution.pods;
    };
    const backtrack = (remainingItems, currentPods, remainingSizes, allowLeniency, bestSolution) => {
        // Pruning: if current unassigned count already >= best, skip
        if (remainingItems.length >= bestSolution.unassignedCount) {
            return;
        }
        // Base case: no more pod sizes to try
        if (remainingSizes.length === 0) {
            if (remainingItems.length < bestSolution.unassignedCount) {
                bestSolution.pods = [...currentPods];
                bestSolution.unassignedCount = remainingItems.length;
            }
            return;
        }
        const targetSize = remainingSizes[0];
        const newRemainingSizes = remainingSizes.slice(1);
        // Get unique power levels from remaining items
        const powerLevels = [...new Set(remainingItems.map(item => 'power' in item ? item.power : item.averagePower))].sort((a, b) => b - a);
        // Try to form a pod with each possible power level
        for (const targetPower of powerLevels) {
            const validCombinations = findValidCombinations(remainingItems, targetSize, targetPower, allowLeniency);
            for (const combination of validCombinations) {
                const newRemainingItems = remainingItems.filter(item => !combination.includes(item));
                const newPod = { players: combination, power: targetPower };
                const newCurrentPods = [...currentPods, newPod];
                // Recursive backtrack
                backtrack(newRemainingItems, newCurrentPods, newRemainingSizes, allowLeniency, bestSolution);
            }
        }
        // Also try skipping this pod size (in case we can't fill it optimally)
        backtrack(remainingItems, currentPods, newRemainingSizes, allowLeniency, bestSolution);
    };
    const findValidCombinations = (items, targetSize, targetPower, allowLeniency) => {
        // Filter items that match the power criteria
        const candidates = items.filter(item => {
            const itemPower = 'power' in item ? item.power : item.averagePower;
            const powerMatch = Math.abs(itemPower - targetPower) < 0.01;
            const leniencyMatch = allowLeniency && Math.abs(itemPower - targetPower) <= 0.5;
            return powerMatch || leniencyMatch;
        });
        const validCombinations = [];
        generateCombinations(candidates, targetSize, [], validCombinations, allowLeniency);
        return validCombinations;
    };
    const generateCombinations = (candidates, targetSize, currentCombination, validCombinations, allowLeniency = false) => {
        const currentSize = currentCombination.reduce((sum, item) => sum + ('size' in item ? item.size : 1), 0);
        if (currentSize === targetSize) {
            // Validate that all players in the combination are compatible with each other
            if (isPodValid(currentCombination, allowLeniency)) {
                validCombinations.push([...currentCombination]);
            }
            return;
        }
        if (currentSize > targetSize) {
            return;
        }
        for (let i = 0; i < candidates.length; i++) {
            const item = candidates[i];
            const itemSize = 'size' in item ? item.size : 1;
            if (currentSize + itemSize <= targetSize) {
                const newCombination = [...currentCombination, item];
                const newCandidates = candidates.slice(i + 1); // Avoid duplicates
                generateCombinations(newCandidates, targetSize, newCombination, validCombinations, allowLeniency);
            }
        }
    };
    // Validate that all players in a pod are compatible with each other
    const isPodValid = (podPlayers, allowLeniency) => {
        if (podPlayers.length <= 1)
            return true;
        // Get all individual power levels from the pod
        const powerLevels = [];
        podPlayers.forEach(item => {
            if ('players' in item) {
                // It's a group, add all player powers
                item.players.forEach(p => powerLevels.push(p.power));
            }
            else {
                // It's a player
                powerLevels.push(item.power);
            }
        });
        // Check that all power levels are compatible with each other
        for (let i = 0; i < powerLevels.length; i++) {
            for (let j = i + 1; j < powerLevels.length; j++) {
                const diff = Math.abs(powerLevels[i] - powerLevels[j]);
                if (diff > 0.01 && (!allowLeniency || diff > 0.5)) {
                    return false;
                }
            }
        }
        return true;
    };
    // Enhanced pod generation with backtracking
    const generatePodsWithBacktracking = (items, targetSizes, allowLeniency) => {
        const totalPlayers = items.reduce((sum, item) => sum + ('size' in item ? item.size : 1), 0);
        // For 3-5 players, just put them all in one pod regardless of power levels
        if (totalPlayers >= 3 && totalPlayers <= 5) {
            const powers = items.map(item => 'power' in item ? item.power : item.averagePower);
            const avgPower = Math.round((powers.reduce((a, b) => a + b, 0) / powers.length) * 2) / 2;
            return {
                pods: [{ players: items, power: avgPower }],
                unassigned: []
            };
        }
        // For 6+ players, we might have multiple pods, so use backtracking for optimal assignment
        if (totalPlayers >= 6) {
            const optimalPods = findOptimalPodAssignment(items, targetSizes, allowLeniency);
            if (optimalPods.length > 0) {
                const assignedItems = new Set();
                optimalPods.forEach(pod => {
                    pod.players.forEach(item => assignedItems.add(item));
                });
                const unassigned = items.filter(item => !assignedItems.has(item));
                return { pods: optimalPods, unassigned };
            }
        }
        // Fallback to greedy for edge cases
        return generatePodsGreedy(items, targetSizes, allowLeniency);
    };
    // Greedy algorithm for edge cases and fallback
    const generatePodsGreedy = (items, targetSizes, allowLeniency) => {
        const pods = [];
        let remainingItems = [...items];
        for (const targetSize of targetSizes) {
            if (remainingItems.length === 0)
                break;
            // Try to create a pod of the target size
            let pod = [];
            let podSize = 0;
            // Sort remaining items by power level (descending)
            const sortedItems = [...remainingItems].sort((a, b) => {
                const powerA = 'power' in a ? a.power : a.averagePower;
                const powerB = 'power' in b ? b.power : b.averagePower;
                return powerB - powerA;
            });
            // Try to fill the pod greedily while respecting power compatibility
            for (const item of sortedItems) {
                if (remainingItems.includes(item)) {
                    const itemSize = 'size' in item ? item.size : 1;
                    if (podSize + itemSize <= targetSize) {
                        // Check if this item can be added to the current pod
                        const tempPod = [...pod, item];
                        if (isPodValid(tempPod, allowLeniency)) {
                            pod.push(item);
                            podSize += itemSize;
                            remainingItems = remainingItems.filter(r => r !== item);
                        }
                    }
                }
            }
            // If we have a valid pod, add it
            if (pod.length > 0 && podSize >= 3) { // Minimum pod size is 3
                // Calculate the pod's representative power level
                const powers = pod.map(item => 'power' in item ? item.power : item.averagePower);
                const avgPower = Math.round((powers.reduce((a, b) => a + b, 0) / powers.length) * 2) / 2;
                pods.push({ players: pod, power: avgPower });
            }
            else if (pod.length > 0) {
                // Put items back if pod is too small
                remainingItems.push(...pod);
            }
        }
        return { pods, unassigned: remainingItems };
    };
});
