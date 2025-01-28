import React, { useState } from 'react';

interface Point {
    x: number;
    y: number;
}

interface Measurement {
    type: 'distance' | 'angle' | 'area';
    points: Point[];
    value: number;
    unit: string;
}

interface Props {
    onMeasure: (measurement: Measurement) => void;
    pixelSpacing?: [number, number];
}

export const MeasurementTools: React.FC<Props> = ({ onMeasure, pixelSpacing }) => {
    const [activeTool, setActiveTool] = useState<'distance' | 'angle' | 'area' | null>(null);
    const [points, setPoints] = useState<Point[]>([]);

    const calculateMeasurement = () => {
        if (!points.length) return null;

        switch (activeTool) {
            case 'distance':
                if (points.length === 2) {
                    const dx = points[1].x - points[0].x;
                    const dy = points[1].y - points[0].y;
                    const pixels = Math.sqrt(dx * dx + dy * dy);
                    const mm = pixelSpacing ? pixels * pixelSpacing[0] : pixels;
                    return {
                        type: 'distance',
                        points,
                        value: mm,
                        unit: pixelSpacing ? 'mm' : 'pixels'
                    };
                }
                break;
            // Add angle and area calculations
        }
        return null;
    };

    return (
        <div className="measurement-tools">
            <button
                onClick={() => setActiveTool('distance')}
                className={activeTool === 'distance' ? 'active' : ''}
            >
                Distance
            </button>
            <button
                onClick={() => setActiveTool('angle')}
                className={activeTool === 'angle' ? 'active' : ''}
            >
                Angle
            </button>
            <button
                onClick={() => setActiveTool('area')}
                className={activeTool === 'area' ? 'active' : ''}
            >
                Area
            </button>
        </div>
    );
}; 