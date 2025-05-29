import React from 'react';
import { EdgeProps, getSmoothStepPath } from 'reactflow';
import { TransactionEdgeData } from '../types';
import { edgeLabelStyles, edgeStyles, successEdgeStyles, failedEdgeStyles, runningEdgeStyles } from '../styles';

export const CustomEdge: React.FC<EdgeProps<TransactionEdgeData>> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    label,
    data
}) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    // Determine edge style based on status
    const getEdgeStyle = () => {
        if (!data) return { ...edgeStyles };
        
        switch (data.status?.toLowerCase()) {
            case 'success':
                return { ...successEdgeStyles };
            case 'failed':
            case 'error':
                return { ...failedEdgeStyles };
            case 'running':
                return { ...runningEdgeStyles };
            default:
                return { ...edgeStyles };
        }
    };

    const currentStyle = getEdgeStyle();

    return (
        <>
            <path
                id={id}
                style={{
                    ...currentStyle,
                    ...style,
                    fill: 'none'
                }}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={currentStyle.markerEnd || markerEnd}
            />
            {label && (
                <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    style={edgeLabelStyles}
                >
                    {label}
                </text>
            )}
        </>
    );
}; 
