export interface Player {
    id: number;
    name: string;
    power: number;
    availablePowers: number[]; // All power levels this player can play
    powerRange: string; // Original input string for display
    rowElement: HTMLElement;
    brackets?: string[]; // Available brackets when in bracket mode
    bracketRange?: string; // Original bracket input for display
}

export interface Group {
    id: string;
    players: Player[];
    averagePower: number;
    size: number;
}

export interface Pod {
    players: (Player | Group)[];
    power: number;
}

export interface LeniencySettings {
    allowLeniency: boolean;
    allowSuperLeniency: boolean;
    maxTolerance: number;
}

export interface VirtualPlayer {
    item: Player | Group;
    powerLevel: number;
}

export interface DragData {
    type: string;
    id: string;
    podIndex: string;
    itemIndex: string;
}

export interface BacktrackingSolution {
    pods: Pod[];
    totalPods: number;
}

export interface GenerationResult {
    pods: Pod[];
    unassigned: (Player | Group)[];
}

// UI-specific interfaces
export interface PlayerResetData {
    name: string;
    groupValue: string;
    createdGroupId?: string;
    selectedPowers: string[];
    selectedBrackets: string[];
}

export interface LeniencyResetData {
    noLeniency: boolean;
    leniency: boolean;
    superLeniency: boolean;
    bracket: boolean;
}

export interface ResetData {
    players: PlayerResetData[];
    leniencySettings: LeniencyResetData;
    currentPods: Pod[];
    currentUnassigned: (Player | Group)[];
}
