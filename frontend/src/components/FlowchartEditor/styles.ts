import { EdgeStyleType } from './types';

// Status color mapping with specific styles
export const statusColors = {
    running: {
        backgroundColor: '#1976d2' as const,    // Blue
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

export const runningEdgeStyles = {
    stroke: '#4caf50',
    strokeWidth: 2,
    markerEnd: 'url(#arrow-running)'
};

export const performedEdgeStyles = {
    stroke: '#8bc34a',  // Light green color for performed edges
    strokeWidth: 2,
    markerEnd: 'url(#arrow-performed)'
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