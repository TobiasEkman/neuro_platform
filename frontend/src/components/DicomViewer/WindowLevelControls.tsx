import React from 'react';

interface WindowLevel {
    center: number;
    width: number;
    name: string;
}

const PRESETS: WindowLevel[] = [
    { center: 40, width: 80, name: 'Brain' },
    { center: 400, width: 2000, name: 'Bone' },
    { center: -600, width: 1500, name: 'Lung' },
    { center: 50, width: 350, name: 'Soft Tissue' }
];

interface Props {
    center: number;
    width: number;
    onChange: (center: number, width: number) => void;
}

export const WindowLevelControls: React.FC<Props> = ({ center, width, onChange }) => {
    return (
        <div className="window-level-controls">
            <div className="presets">
                {PRESETS.map(preset => (
                    <button
                        key={preset.name}
                        onClick={() => onChange(preset.center, preset.width)}
                        className={center === preset.center && width === preset.width ? 'active' : ''}
                    >
                        {preset.name}
                    </button>
                ))}
            </div>
            <div className="manual-controls">
                <div className="control">
                    <label>Center: {center}</label>
                    <input
                        type="range"
                        min="-1000"
                        max="1000"
                        value={center}
                        onChange={e => onChange(parseInt(e.target.value), width)}
                    />
                </div>
                <div className="control">
                    <label>Width: {width}</label>
                    <input
                        type="range"
                        min="1"
                        max="4000"
                        value={width}
                        onChange={e => onChange(center, parseInt(e.target.value))}
                    />
                </div>
            </div>
        </div>
    );
}; 