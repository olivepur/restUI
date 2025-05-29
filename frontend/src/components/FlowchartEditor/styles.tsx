import React, { ReactElement } from 'react';
import { EdgeStyleType } from './types';

// Status color mapping with specific styles
export const statusColors = {
    running: {
        backgroundColor: '#2196f3' as const,    // Bright Blue
        color: '#ffffff' as const
    },
    open: {
        backgroundColor: '#757575' as const,    // Gray
        color: '#ffffff' as const
    },
    pending: {
        backgroundColor: '#ff9800' as const,    // Orange
        color: '#ffffff' as const
    },
    stopped: {
        backgroundColor: '#9e9e9e' as const,    // Light Gray
        color: '#ffffff' as const
    },
    error: {
        backgroundColor: '#d32f2f' as const,    // Red
        color: '#ffffff' as const
    },
    failed: {
        backgroundColor: '#d32f2f' as const,    // Red
        color: '#ffffff' as const
    },
    success: {
        backgroundColor: '#4caf50' as const,    // Green
        color: '#ffffff' as const
    },
    performed: {
        backgroundColor: '#4caf50' as const,    // Green
        color: '#ffffff' as const
    }
} as const;

export const testStatusColors = {
    'Not Tested': {
        backgroundColor: '#757575' as const,    // Gray
        color: '#ffffff' as const
    },
    'Testing': {
        backgroundColor: '#1976d2' as const,    // Blue
        color: '#ffffff' as const
    },
    'Passed': {
        backgroundColor: '#4caf50' as const,    // Green
        color: '#ffffff' as const
    },
    'Failed': {
        backgroundColor: '#d32f2f' as const,    // Red
        color: '#ffffff' as const
    }
} as const;

// Edge styles
export const edgeStyles: EdgeStyleType = {
    stroke: statusColors.open.backgroundColor,
    strokeWidth: 2,
    markerEnd: 'url(#arrow)'
};

export const selectedEdgeStyles: EdgeStyleType = {
    stroke: '#2196f3',
    strokeWidth: 2,
    markerEnd: 'url(#arrow-selected)'
};

export const runningEdgeStyles: EdgeStyleType = {
    stroke: '#2196f3', // Bright Blue
    strokeWidth: 2,
    markerEnd: 'url(#arrow-running)'
};

export const performedEdgeStyles: EdgeStyleType = {
    stroke: statusColors.performed.backgroundColor,
    strokeWidth: 2,
    markerEnd: 'url(#arrow-performed)'
};

export const failedEdgeStyles: EdgeStyleType = {
    stroke: statusColors.failed.backgroundColor,
    strokeWidth: 2,
    markerEnd: 'url(#arrow-failed)'
};

export const successEdgeStyles: EdgeStyleType = {
    stroke: statusColors.success.backgroundColor,
    strokeWidth: 2,
    markerEnd: 'url(#arrow-success)'
};

export const edgeLabelStyles = {
    fill: 'black',
    fontSize: '12px',
    fontFamily: 'monospace',
    pointerEvents: 'none' as const
};

// Node styles
export const selectedNodeStyles = {
    border: '2px solid #2196f3',
    backgroundColor: '#e3f2fd',
};

export const defaultNodeStyles = {
    border: '1px solid #000000',
    backgroundColor: 'white',
};

// Define SVG markers for different edge states
export const edgeMarkers: ReactElement = (
    <svg style={{ position: 'absolute', top: 0, left: 0 }}>
        <defs>
            <marker
                id="arrow"
                viewBox="0 0 10 10"
                markerWidth={5}
                markerHeight={5}
                orient="auto"
                refX={5}
                refY={5}
            >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={edgeStyles.stroke} />
            </marker>
            <marker
                id="arrow-selected"
                viewBox="0 0 10 10"
                markerWidth={5}
                markerHeight={5}
                orient="auto"
                refX={5}
                refY={5}
            >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={selectedEdgeStyles.stroke} />
            </marker>
            <marker
                id="arrow-running"
                viewBox="0 0 10 10"
                markerWidth={5}
                markerHeight={5}
                orient="auto"
                refX={5}
                refY={5}
            >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={runningEdgeStyles.stroke} />
            </marker>
            <marker
                id="arrow-performed"
                viewBox="0 0 10 10"
                markerWidth={5}
                markerHeight={5}
                orient="auto"
                refX={5}
                refY={5}
            >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={performedEdgeStyles.stroke} />
            </marker>
            <marker
                id="arrow-failed"
                viewBox="0 0 10 10"
                markerWidth={5}
                markerHeight={5}
                orient="auto"
                refX={5}
                refY={5}
            >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={failedEdgeStyles.stroke} />
            </marker>
            <marker
                id="arrow-success"
                viewBox="0 0 10 10"
                markerWidth={5}
                markerHeight={5}
                orient="auto"
                refX={5}
                refY={5}
            >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={successEdgeStyles.stroke} />
            </marker>
        </defs>
    </svg>
); 