// ============================================================
// Flyer Style Presets
// ============================================================

export interface FlyerStylePreset {
    id: string;
    name: string;
    background: string;        // CSS gradient/pattern
    headlineFont: string;       // Google Font name
    bodyFont: string;
    headlineColor: string;
    bodyColor: string;
    overlayOpacity: number;
    preview: string;            // emoji/icon for picker
}

export const FLYER_STYLES: FlyerStylePreset[] = [
    {
        id: 'neon-club',
        name: 'Neon Club',
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        headlineFont: 'Bebas Neue',
        bodyFont: 'Inter',
        headlineColor: '#e879f9',
        bodyColor: '#e2e8f0',
        overlayOpacity: 20,
        preview: '🌃',
    },
    {
        id: 'elegant',
        name: 'Elegant',
        background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        headlineFont: 'Playfair Display',
        bodyFont: 'Lato',
        headlineColor: '#fbbf24',
        bodyColor: '#f1f5f9',
        overlayOpacity: 15,
        preview: '✨',
    },
    {
        id: 'retro',
        name: 'Retro',
        background: 'linear-gradient(135deg, #ff6b35 0%, #f7c59f 30%, #1a535c 70%, #4ecdc4 100%)',
        headlineFont: 'Righteous',
        bodyFont: 'Roboto',
        headlineColor: '#ffffff',
        bodyColor: '#fef3c7',
        overlayOpacity: 30,
        preview: '🕺',
    },
    {
        id: 'minimal',
        name: 'Minimal',
        background: 'linear-gradient(180deg, #111827 0%, #1f2937 100%)',
        headlineFont: 'Outfit',
        bodyFont: 'Inter',
        headlineColor: '#ffffff',
        bodyColor: '#9ca3af',
        overlayOpacity: 0,
        preview: '⚡',
    },
    {
        id: 'festival',
        name: 'Festival',
        background: 'linear-gradient(135deg, #667eea 0%, #f093fb 25%, #f5576c 50%, #ffd86f 75%, #4facfe 100%)',
        headlineFont: 'Bangers',
        bodyFont: 'Rubik',
        headlineColor: '#ffffff',
        bodyColor: '#ffffff',
        overlayOpacity: 25,
        preview: '🎪',
    },
];

export const ASPECT_RATIOS = {
    '9:16': { width: 1080, height: 1920, label: 'Stories (9:16)' },
    '1:1': { width: 1080, height: 1080, label: 'Square (1:1)' },
    '16:9': { width: 1920, height: 1080, label: 'Landscape (16:9)' },
} as const;

export const FONT_OPTIONS = [
    'Bebas Neue', 'Playfair Display', 'Righteous', 'Outfit', 'Bangers',
    'Inter', 'Lato', 'Roboto', 'Rubik', 'Poppins', 'Montserrat',
    'Oswald', 'Permanent Marker', 'Archivo Black', 'Press Start 2P',
];

export function getStylePreset(id: string): FlyerStylePreset | undefined {
    return FLYER_STYLES.find(s => s.id === id);
}
