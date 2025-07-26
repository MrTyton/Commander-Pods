import { Player, Group, Pod, DragData } from './types.js';
import { PlayerManager } from './player-manager.js';

export class DragDropManager {
    private draggedElement: HTMLElement | null = null;
    private draggedItemData: DragData | null = null;
    private currentPods: Pod[] = [];
    private playerManager: PlayerManager;
    private onPodsChanged: (pods: Pod[]) => void;

    constructor(playerManager: PlayerManager, onPodsChanged: (pods: Pod[]) => void) {
        this.playerManager = playerManager;
        this.onPodsChanged = onPodsChanged;
    }

    setCurrentPods(pods: Pod[]): void {
        this.currentPods = [...pods];
    }

    handleDragStart = (e: DragEvent): void => {
        const target = e.target as HTMLElement;
        this.draggedElement = target;
        target.classList.add('dragging');

        this.draggedItemData = {
            type: target.dataset.itemType!,
            id: target.dataset.itemId!,
            podIndex: target.dataset.podIndex!,
            itemIndex: target.dataset.itemIndex!
        };

        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData('text/html', target.outerHTML);
    };

    handleDragEnd = (e: DragEvent): void => {
        const target = e.target as HTMLElement;
        target.classList.remove('dragging');
        this.draggedElement = null;
        this.draggedItemData = null;
    };

    handleDragOver = (e: DragEvent): void => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        const target = e.currentTarget as HTMLElement;
        target.classList.add('drag-over');
    };

    handleDragLeave = (e: DragEvent): void => {
        const target = e.currentTarget as HTMLElement;
        target.classList.remove('drag-over');
    };

    handleDrop = (e: DragEvent): void => {
        e.preventDefault();
        const target = e.currentTarget as HTMLElement;
        target.classList.remove('drag-over');

        if (!this.draggedItemData) return;

        const targetPodIndex = target.dataset.podIndex;
        const sourcePodIndex = this.draggedItemData.podIndex;

        // Don't drop on the same pod
        if (targetPodIndex === sourcePodIndex) return;

        // Move the item between pods
        this.moveItemBetweenPods(this.draggedItemData, targetPodIndex!);
    };

    private moveItemBetweenPods(itemData: DragData, targetPodIndex: string): void {
        const sourcePodIndex = itemData.podIndex;
        const itemIndex = parseInt(itemData.itemIndex);

        // Find the item to move
        let itemToMove: Player | Group | null = null;

        if (sourcePodIndex === 'unassigned') {
            // Handle unassigned items later if needed
            return;
        } else {
            const sourcePod = this.currentPods[parseInt(sourcePodIndex)];
            itemToMove = sourcePod.players[itemIndex];
            // Remove from source pod
            sourcePod.players.splice(itemIndex, 1);
            // Recalculate source pod power
            sourcePod.power = this.playerManager.calculatePodPower(sourcePod.players);
        }

        if (!itemToMove) return;

        // Add to target pod
        if (targetPodIndex === 'unassigned') {
            // Handle unassigned area later if needed
            return;
        } else {
            const targetPod = this.currentPods[parseInt(targetPodIndex)];
            targetPod.players.push(itemToMove);
            // Recalculate target pod power
            targetPod.power = this.playerManager.calculatePodPower(targetPod.players);
        }

        // Notify that pods have changed
        this.onPodsChanged(this.currentPods);
    }
}
