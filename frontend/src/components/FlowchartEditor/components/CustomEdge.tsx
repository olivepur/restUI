import React from 'react';
import { EdgeProps, getSmoothStepPath } from 'reactflow';
import { TransactionEdgeData } from '../types';
import { edgeLabelStyles } from '../styles';

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
    label
}) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    return (
        <>
            <path
                id={id}
                style={{
                    ...style,
                    strokeWidth: 2,
                    fill: 'none'
                }}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={style.markerEnd || markerEnd}
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
