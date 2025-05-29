import { useCallback } from 'react';
import { Edge, Connection, addEdge } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { TransactionEdge, TransactionEdgeData, EdgeStatus, TestStatus } from '../../components/FlowchartEditor/types';

interface UseEdgeOperationsProps {
    edges: TransactionEdge[];
    setEdges: React.Dispatch<React.SetStateAction<TransactionEdge[]>>;
    runningEdges: Set<string>;
    setRunningEdges: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const useEdgeOperations = ({
    edges,
    setEdges,
    runningEdges,
    setRunningEdges
}: UseEdgeOperationsProps) => {
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
                path: '/api/hello/{node-label-target}',
                status: 'open' as EdgeStatus,
                testStatus: 'Not Tested' as TestStatus,
                timestamp: new Date().toISOString(),
                onPlay: () => console.log('Play', transactionId),
                onStop: () => console.log('Stop', transactionId),
                onEdit: () => console.log('Edit', transactionId),
                onRemove: () => console.log('Remove', transactionId)
            },
            label: 'GET /api/hello/{node-label-target}'
        };

        setEdges(prev => [...prev, newEdge]);
    }, [setEdges]);

    const updateEdgeStatus = useCallback((edgeId: string, status: EdgeStatus) => {
        setEdges((eds) =>
            eds.map((e) => {
                if (e.id === edgeId && e.data) {
                    return {
                        ...e,
                        data: {
                            ...e.data,
                            status,
                            timestamp: new Date().toISOString()
                        }
                    };
                }
                return e;
            })
        );
    }, [setEdges]);

    const removeEdge = useCallback((edgeId: string) => {
        setEdges((eds) => eds.filter((e) => e.id !== edgeId));
        setRunningEdges((prev) => {
            const next = new Set(prev);
            next.delete(edgeId);
            return next;
        });
    }, [setEdges, setRunningEdges]);

    const updateEdgeLabel = useCallback((edgeId: string, label: string) => {
        setEdges((eds) =>
            eds.map((e) => {
                if (e.id === edgeId) {
                    return {
                        ...e,
                        label
                    };
                }
                return e;
            })
        );
    }, [setEdges]);

    const setEdgeRunning = useCallback((edgeId: string, isRunning: boolean) => {
        setRunningEdges((prev) => {
            const next = new Set(prev);
            if (isRunning) {
                next.add(edgeId);
            } else {
                next.delete(edgeId);
            }
            return next;
        });
    }, [setRunningEdges]);

    return {
        handleEdgeAdd,
        updateEdgeStatus,
        removeEdge,
        updateEdgeLabel,
        setEdgeRunning
    };
}; 