import React, { useEffect, useState } from 'react';

export const DicomDebug: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/dicom/list');
                const json = await response.json();
                setData(json);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch data');
            }
        };
        fetchData();
    }, []);

    if (error) return (
        <div>
            <h2>Error Loading DICOM Data</h2>
            <p style={{ color: 'red' }}>{error}</p>
        </div>
    );
    if (!data) return <div>Loading DICOM data...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h2>DICOM Database Contents</h2>
            <pre style={{ 
                background: '#f5f5f5', 
                padding: '15px', 
                borderRadius: '5px',
                overflow: 'auto' 
            }}>
                {JSON.stringify(data, null, 2)}
            </pre>
        </div>
    );
}; 