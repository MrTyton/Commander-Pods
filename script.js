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
        const pods = [];
        const powerLevels = [...new Set(itemsToPod.map(item => 'power' in item ? item.power : item.averagePower))].sort((a, b) => b - a);
        for (const targetPower of powerLevels) {
            for (const size of [4, 5, 3]) {
                while (true) {
                    let podItems = [];
                    let remainingSize = size;
                    // Priority 1: Perfect matches
                    let availableItems = itemsToPod.filter(item => ('power' in item ? item.power : item.averagePower) === targetPower && ('size' in item ? item.size : 1) <= remainingSize);
                    while (availableItems.length > 0 && remainingSize > 0) {
                        const item = availableItems.shift();
                        const itemSize = 'size' in item ? item.size : 1;
                        if (itemSize <= remainingSize) {
                            podItems.push(item);
                            remainingSize -= itemSize;
                            itemsToPod = itemsToPod.filter(i => i !== item);
                        }
                    }
                    // Priority 2: Leniency
                    if (leniencyCheckbox.checked && remainingSize > 0) {
                        let lenientItems = itemsToPod.filter(item => {
                            const power = 'power' in item ? item.power : item.averagePower;
                            return (Math.abs(power - targetPower) === 0.5) && ('size' in item ? item.size : 1) <= remainingSize;
                        });
                        while (lenientItems.length > 0 && remainingSize > 0) {
                            const item = lenientItems.shift();
                            const itemSize = 'size' in item ? item.size : 1;
                            if (itemSize <= remainingSize) {
                                podItems.push(item);
                                remainingSize -= itemSize;
                                itemsToPod = itemsToPod.filter(i => i !== item);
                            }
                        }
                    }
                    if (podItems.length > 0 && remainingSize === 0) {
                        pods.push({ players: podItems, power: targetPower });
                    }
                    else {
                        // Return unused items and break from this size loop
                        itemsToPod.push(...podItems);
                        break;
                    }
                }
            }
        }
        // Handle leftovers
        let unassignedPlayers = [];
        if (itemsToPod.length > 0) {
            if (itemsToPod.length >= 3) {
                // Create a leftover pod if we have at least 3 players
                const leftoverPower = itemsToPod.reduce((sum, item) => sum + ('power' in item ? item.power : item.averagePower), 0) / itemsToPod.length;
                pods.push({ players: itemsToPod, power: Math.round(leftoverPower * 2) / 2 });
            }
            else {
                // Try to squeeze remaining players into existing pods if possible
                for (const item of itemsToPod) {
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
                        unassignedPlayers.push(item);
                    }
                }
            }
        }
        renderPods(pods, unassignedPlayers);
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
});
