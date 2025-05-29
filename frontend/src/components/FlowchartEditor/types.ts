import { Node, Edge } from 'reactflow';

// Export all types as named exports
export type EdgeStatus = 'open' | 'performed' | 'error' | 'pending' | 'running' | 'stopped' | 'success' | 'failed';
export type TestStatus = 'Not Tested' | 'Testing' | 'Passed' | 'Failed';

export interface SystemNodeData {
    label: string;
    type: string;
    onLabelChange?: (newLabel: string) => void;
    onDelete?: (nodeId: string) => void;
}

export interface TransactionEdgeData {
    transactionId: string;
    operation: string;
    path: string;
    status: EdgeStatus;
    testStatus: TestStatus;
    timestamp: string;
    requestBody?: any;
    onPlay: (ids: string | string[]) => void | Promise<void>;
    onStop: (id: string) => void;
    onEdit: (id: string) => void;
    onRemove: (id: string) => void;
}

export type SystemNode = Node<SystemNodeData>;
export type TransactionEdge = Edge<TransactionEdgeData>;

export interface EdgeStyleType {
    stroke: string;
    strokeWidth: number;
    markerEnd: string;
}

export interface SelectedElements {
    nodes: SystemNode[];
    edges: TransactionEdge[];
}

export interface TransactionDetails {
    id: string;
    request: {
        method: string;
        path: string;
        headers: Record<string, string>;
        body?: any;
    };
    response?: {
        status: number;
        headers: Record<string, string>;
        body: any;
    };
    loading: boolean;
    test?: {
        script: string;
        enabled: boolean;
        result?: string;
    };
    allResponses?: Array<{
        path: string;
        status: number;
        headers: Record<string, string>;
        body: any;
    }>;
}

export interface SavedTransactionNode {
    id: string;
    label: string;
    type: string;
    position: { x: number; y: number };
}

export interface SavedTransactionEdge {
    id: string;
    source: string;
    target: string;
    operation: string;
    path: string;
}

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
    nodes: SavedTransactionNode[];
    edges: SavedTransactionEdge[];
    allResponses?: Array<{
        path: string;
        status: number;
        headers: Record<string, string>;
        body: any;
    }>;
}

export interface FlowchartEditorProps {
    transactions: SavedTransaction[];
    onRunTransaction: (transactionId: string) => void;
    onSaveTransaction?: (transaction: SavedTransaction) => void;
}

export interface TransactionResponse {
    path: string;
    status: number;
    response: any;
} 