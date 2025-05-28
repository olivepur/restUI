import { Node, Edge } from 'reactflow';

export interface SystemNodeData {
    label: string;
    type: string;
    onLabelChange?: (newLabel: string) => void;
    onDelete?: (nodeId: string) => void;
}

export type SystemNode = Node<SystemNodeData>;

export type EdgeStatus = 'running' | 'open' | 'pending' | 'stopped' | 'error' | 'performed';

export interface TransactionEdgeData {
    transactionId: string;
    operation: string;
    path: string;
    onPlay: (ids: string | string[]) => void;
    onStop: (id: string) => void;
    onEdit: (id: string) => void;
    onRemove: (id: string) => void;
    status?: EdgeStatus;
    testStatus?: 'Not Tested' | 'Testing' | 'Passed' | 'Failed';
    timestamp?: string;
}

export type TransactionEdge = Edge<TransactionEdgeData>;

export interface SavedTransaction {
    id: string;
    transactionId: string;
    sourceNode: string;
    targetNode: string;
    status: string;
    timestamp: string;
    request: {
        method: string;
        path: string;
        headers: Record<string, string>;
        body?: any;
    };
    response?: {
        status: number;
        headers: Record<string, string>;
        body?: any;
    };
    test?: {
        script: string;
        enabled: boolean;
        result?: string;
    };
    selectedElements?: {
        nodeIds: string[];
        edgeIds: string[];
        nodes: SystemNode[];
        edges: TransactionEdge[];
    };
}

export interface FlowState {
    nodes: SystemNode[];
    edges: TransactionEdge[];
}

export interface SystemData {
    id: string;
    name: string;
    type: 'system';
} 