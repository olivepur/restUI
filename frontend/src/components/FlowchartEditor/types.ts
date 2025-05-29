import { Edge, Node } from 'reactflow';
import { Transaction } from '../../types/TestData';

export type EdgeStatus = 'running' | 'open' | 'pending' | 'stopped' | 'error' | 'performed';
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
    status?: EdgeStatus;
    testStatus?: string;
    onPlay: (ids: string | string[]) => void;
    onStop: () => void;
    onEdit: () => void;
    onRemove: () => void;
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
        body?: any;
    };
    loading: boolean;
    test?: {
        script: string;
        enabled: boolean;
    };
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
    test: {
        script: string;
        enabled: boolean;
        result?: string;
    };
    selectedElements?: {
        nodeIds: string[];
        edgeIds: string[];
        nodes: Node<SystemNodeData>[];
        edges: Edge<TransactionEdgeData>[];
    };
}

export interface FlowchartEditorProps {
    transactions: SavedTransaction[];
    onRunTransaction: (transactionId: string) => void;
    onSaveTransaction: (transaction: SavedTransaction) => void;
}

export interface TransactionResponse {
    path: string;
    status: number;
    response: any;
} 