import { InventoryItem } from './types';

// ============================================================
// Default Gear Inventory — YOUR capability list
// The agent will NEVER quote gear not on this list.
// Edit this to match your actual kit.
// ============================================================

export const DEFAULT_INVENTORY: InventoryItem[] = [
    // Speakers
    {
        id: 'spk-top-1',
        name: 'Powered Top Speaker (L)',
        category: 'speakers',
        quantity: 1,
        backupAvailable: false,
        notes: 'QSC K12.2 or equivalent',
    },
    {
        id: 'spk-top-2',
        name: 'Powered Top Speaker (R)',
        category: 'speakers',
        quantity: 1,
        backupAvailable: false,
        notes: 'QSC K12.2 or equivalent',
    },

    // Subs
    {
        id: 'sub-1',
        name: 'Powered Subwoofer (L)',
        category: 'subs',
        quantity: 1,
        backupAvailable: false,
        notes: 'QSC KS118 or equivalent',
    },
    {
        id: 'sub-2',
        name: 'Powered Subwoofer (R)',
        category: 'subs',
        quantity: 1,
        backupAvailable: false,
        notes: 'QSC KS118 or equivalent',
    },

    // Mixer / Controller
    {
        id: 'mixer-1',
        name: 'DJ Controller + Mixer',
        category: 'mixer',
        quantity: 1,
        backupAvailable: false,
        notes: 'Pioneer DDJ-1000 or equivalent',
    },

    // Microphones
    {
        id: 'mic-wired-1',
        name: 'Wired Dynamic Microphone',
        category: 'microphones',
        quantity: 2,
        backupAvailable: true,
        notes: 'Shure SM58 — wireless NOT available',
    },

    // Stands
    {
        id: 'stand-spk',
        name: 'Speaker Stand',
        category: 'stands',
        quantity: 4,
        backupAvailable: false,
        notes: 'Adjustable tripod',
    },
    {
        id: 'stand-mic',
        name: 'Mic Stand (boom)',
        category: 'stands',
        quantity: 2,
        backupAvailable: false,
        notes: '',
    },
    {
        id: 'stand-light',
        name: 'Lighting Stand',
        category: 'stands',
        quantity: 2,
        backupAvailable: false,
        notes: 'T-bar style',
    },

    // Cables
    {
        id: 'cable-xlr',
        name: 'XLR Cable (25 ft)',
        category: 'cables',
        quantity: 6,
        backupAvailable: true,
        notes: '',
    },
    {
        id: 'cable-power',
        name: 'Power Cable + Extension',
        category: 'cables',
        quantity: 4,
        backupAvailable: true,
        notes: '50 ft heavy-duty',
    },

    // Lighting
    {
        id: 'light-uplight',
        name: 'LED Uplight',
        category: 'lighting',
        quantity: 4,
        backupAvailable: false,
        notes: 'RGBW, battery-powered',
    },
    {
        id: 'light-moving',
        name: 'Moving Head Light',
        category: 'lighting',
        quantity: 2,
        backupAvailable: false,
        notes: 'Spot/wash combo',
    },

    // Effects
    {
        id: 'fx-fog',
        name: 'Fog Machine',
        category: 'effects',
        quantity: 1,
        backupAvailable: false,
        notes: 'Includes fog fluid',
    },

    // Backups
    {
        id: 'backup-cables',
        name: 'Spare Cable Kit',
        category: 'backups',
        quantity: 1,
        backupAvailable: false,
        notes: 'XLR, 1/4", RCA, adapters',
    },
    {
        id: 'backup-mic',
        name: 'Backup Microphone',
        category: 'backups',
        quantity: 1,
        backupAvailable: false,
        notes: 'SM58 spare',
    },
    {
        id: 'backup-laptop',
        name: 'Backup Laptop',
        category: 'backups',
        quantity: 1,
        backupAvailable: false,
        notes: 'Pre-loaded with music library',
    },
];

/** Lookup an inventory item by ID */
export function getInventoryItem(id: string): InventoryItem | undefined {
    return DEFAULT_INVENTORY.find((i) => i.id === id);
}

/** Get all items in a category */
export function getByCategory(category: string): InventoryItem[] {
    return DEFAULT_INVENTORY.filter((i) => i.category === category);
}

/** Validate that all required items exist in inventory */
export function validateRequirements(
    requirements: { itemId: string; quantity: number }[]
): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const req of requirements) {
        const item = getInventoryItem(req.itemId);
        if (!item) {
            issues.push(`Unknown gear item: ${req.itemId}`);
        } else if (req.quantity > item.quantity) {
            issues.push(
                `Requested ${req.quantity}× ${item.name} but only ${item.quantity} available`
            );
        }
    }
    return { valid: issues.length === 0, issues };
}
