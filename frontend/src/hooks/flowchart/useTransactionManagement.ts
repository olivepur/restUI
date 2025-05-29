import { useState, useCallback } from 'react';
import type { 
    TransactionEdge, 
    SystemNode, 
    TransactionDetails, 
    SelectedElements,
    SavedTransaction
} from '../../components/FlowchartEditor/types';
import { Edge } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

interface UseTransactionManagementProps {
    edges: TransactionEdge[];
    setEdges: React.Dispatch<React.SetStateAction<TransactionEdge[]>>;
    nodes: SystemNode[];
    onSaveTransaction?: (transaction: SavedTransaction) => void;
    selectedElements: SelectedElements;
    currentTransaction: SavedTransaction | null;
}

export const useTransactionManagement = ({
    edges,
    setEdges,
    nodes,
    onSaveTransaction,
    selectedElements,
    currentTransaction
}: UseTransactionManagementProps) => {
    const [selectedEdge, setSelectedEdge] = useState<TransactionEdge | null>(null);
    const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handlePlayTransaction = useCallback((edgeId: string) => {
        const edge = edges.find(e => e.id === edgeId);
        if (edge?.data?.onPlay) {
            edge.data.onPlay([edgeId]);
        }
    }, [edges]);

    const handleStopTransaction = useCallback((edgeId: string) => {
        const edge = edges.find(e => e.id === edgeId);
        if (edge?.data?.onStop) {
            edge.data.onStop(edgeId);
        }
    }, [edges]);

    const handleEditTransaction = useCallback((edgeId: string) => {
        const edge = edges.find(e => e.id === edgeId);
        if (edge?.data?.onEdit) {
            edge.data.onEdit(edgeId);
        }
    }, [edges]);

    const handleRemoveTransaction = useCallback((edgeId: string) => {
        const edge = edges.find(e => e.id === edgeId);
        if (edge?.data?.onRemove) {
            edge.data.onRemove(edgeId);
        }
        setEdges(prev => prev.filter(e => e.id !== edgeId));
    }, [edges, setEdges]);

    const handleSaveTransaction = useCallback(async () => {
        if (!onSaveTransaction || !currentTransaction) {
            console.warn('Cannot save transaction:', { 
                hasOnSaveTransaction: !!onSaveTransaction, 
                hasCurrentTransaction: !!currentTransaction 
            });
            return;
        }

        console.log('Starting save transaction');
        setIsSaving(true);
        try {
            // Use the current transaction as the base
            const transaction: SavedTransaction = {
                ...currentTransaction,
                id: uuidv4(), // Generate new ID for saved version
                timestamp: new Date().toISOString(),
                selectedElements: {
                    nodeIds: selectedElements.nodes.map(n => n.id),
                    edgeIds: selectedElements.edges.map(e => e.id),
                    nodes: selectedElements.nodes,
                    edges: selectedElements.edges
                },
                nodes: nodes.map(node => ({
                    id: node.id,
                    label: node.data.label,
                    type: node.type || 'system',
                    position: node.position
                })),
                edges: edges.map(edge => ({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    operation: edge.data?.operation || 'GET',
                    path: edge.data?.path || ''
                }))
            };

            console.log('Saving transaction:', transaction);
            await onSaveTransaction(transaction);
            console.log('Transaction saved successfully');
        } catch (error) {
            console.error('Error saving transaction:', error);
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [edges, selectedElements, onSaveTransaction, currentTransaction, nodes]);

    return {
        selectedEdge,
        setSelectedEdge,
        transactionDetails,
        setTransactionDetails,
        isSaving,
        handlePlayTransaction,
        handleStopTransaction,
        handleEditTransaction,
        handleRemoveTransaction,
        handleSaveTransaction
    };
}; 