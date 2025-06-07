import { useCallback, useState } from 'react';
import { Edge, Connection } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { TransactionEdge, TransactionEdgeData, EdgeStatus, TestStatus } from '../../components/FlowchartEditor/types';

interface UseEdgeManagementProps {
    edges: TransactionEdge[];
    setEdges: React.Dispatch<React.SetStateAction<TransactionEdge[]>>;
}

export const useEdgeManagement = ({ edges, setEdges }: UseEdgeManagementProps) => {
    const [runningEdges, setRunningEdges] = useState<Set<string>>(new Set());

    const handleEdgeAdd = useCallback((params: Connection) => {
        const transactionId = uuidv4();
        const newEdge: TransactionEdge = {
            id: `edge-${uuidv4()}`,
            source: params.source || '',
            target: params.target || '',
            type: 'default',
            animated: false,
            sourceHandle: params.sourceHandle || 'source',
            targetHandle: params.targetHandle || 'target',
            data: {
                transactionId,
                operation: 'GET',
                path: '/api/example',
                status: 'open' as EdgeStatus,
                testStatus: 'Not Tested' as TestStatus,
                timestamp: new Date().toISOString(),
                onPlay: (ids: string | string[]) => console.log('Play', ids),
                onStop: () => console.log('Stop', transactionId),
                onEdit: () => console.log('Edit', transactionId),
                onRemove: () => console.log('Remove', transactionId)
            },
            label: 'GET /api/example'
        };

        setEdges(prev => [...prev, newEdge]);
    }, [setEdges]);

    const updateEdgeStatus = useCallback((edgeId: string, status: EdgeStatus) => {
        setEdges(prev => 
            prev.map(edge => 
                edge.id === edgeId 
                    ? { ...edge, data: { ...edge.data, status } } as TransactionEdge
                    : edge
            )
        );
    }, [setEdges]);

    const removeEdge = useCallback((edgeId: string) => {
        setEdges(prev => prev.filter(edge => edge.id !== edgeId));
    }, [setEdges]);

    const updateEdgeLabel = useCallback((edgeId: string, label: string) => {
        setEdges(prev => 
            prev.map(edge => 
                edge.id === edgeId 
                    ? { ...edge, label } as TransactionEdge
                    : edge
            )
        );
    }, [setEdges]);

    const setEdgeRunning = useCallback((edgeId: string, isRunning: boolean) => {
        setRunningEdges(prev => {
            const newSet = new Set(prev);
            if (isRunning) {
                newSet.add(edgeId);
            } else {
                newSet.delete(edgeId);
            }
            return newSet;
        });
    }, []);

    const findConnectedEdges = useCallback((startNodeId: string): TransactionEdge[] => {
        const visited = new Set<string>();
        const result: TransactionEdge[] = [];

        const findPaths = (nodeId: string) => {
            // Find all outgoing edges from this node
            const outgoingEdges = edges.filter(e => e.source === nodeId);
            for (const edge of outgoingEdges) {
                if (!visited.has(edge.id)) {
                    visited.add(edge.id);
                    result.push(edge);
                    findPaths(edge.target);
                }
            }
        };

        // Start the search from the initial node
        findPaths(startNodeId);
        return result;
    }, [edges]);

    return {
        runningEdges,
        setRunningEdges,
        handleEdgeAdd,
        updateEdgeStatus,
        removeEdge,
        updateEdgeLabel,
        setEdgeRunning,
        findConnectedEdges
    };
}; 