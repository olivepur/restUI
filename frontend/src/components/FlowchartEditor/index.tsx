import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    useReactFlow,
    ReactFlowProvider,
    MarkerType,
    Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box } from '@mui/material';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { SystemNode } from './components/SystemNode';
import { CustomEdge } from './components/CustomEdge';
import { EdgeControls } from './components/EdgeControls';
import { StatusBadge } from './components/StatusBadge';
import { TransactionDialog } from './components/TransactionDialog';
import { TransactionResultDrawer } from './components/TransactionResultDrawer';
import {
    SystemNodeData,
    TransactionEdgeData,
    FlowchartEditorProps,
    TransactionDetails,
    SavedTransaction,
    SystemNode as SystemNodeType
} from './types';
import {
    edgeStyles,
    selectedEdgeStyles,
    runningEdgeStyles,
    performedEdgeStyles
} from './styles';
import { EditorToolbar } from './components/EditorToolbar';

// Define SVG markers for different edge states
const edgeMarkers = (
    <svg style={{ position: 'absolute', top: 0, left: 0 }}>
        <defs>
            <marker
                id="arrow"
                viewBox="0 0 10 10"
                markerWidth="5"
                markerHeight="5"
                orient="auto"
                refX="5"
                refY="5"
            >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={edgeStyles.stroke} />
            </marker>
            <marker
                id="arrow-selected"
                viewBox="0 0 10 10"
                markerWidth="5"
                markerHeight="5"
                orient="auto"
                refX="5"
                refY="5"
            >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={selectedEdgeStyles.stroke} />
            </marker>
            <marker
                id="arrow-running"
                viewBox="0 0 10 10"
                markerWidth="5"
                markerHeight="5"
                orient="auto"
                refX="5"
                refY="5"
            >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={runningEdgeStyles.stroke} />
            </marker>
            <marker
                id="arrow-performed"
                viewBox="0 0 10 10"
                markerWidth="5"
                markerHeight="5"
                orient="auto"
                refX="5"
                refY="5"
            >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={performedEdgeStyles.stroke} />
            </marker>
        </defs>
    </svg>
);

const nodeTypes = {
    system: SystemNode
};

const edgeTypes = {
    custom: CustomEdge
};

const FlowchartEditorContent: React.FC<FlowchartEditorProps> = ({
    transactions,
    onRunTransaction,
    onSaveTransaction
}) => {
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetails | null>(null);
    const [runningTransaction, setRunningTransaction] = useState<SavedTransaction | null>(null);
    const { project, getNodes } = useReactFlow();

    const [nodes, setNodes, onNodesChange] = useNodesState<SystemNodeData>([
        {
            id: '1',
            type: 'system',
            position: { x: 250, y: 100 },
            data: { 
                label: 'System 1',
                type: 'API'
            }
        },
        {
            id: '2',
            type: 'system',
            position: { x: 250, y: 300 },
            data: { 
                label: 'System 2',
                type: 'Database'
            }
        }
    ]);

    // Add resize observer for the container with improved handling
    const handleResize = useCallback((entry: ResizeObserverEntry) => {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
            const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
            if (reactFlowBounds) {
                const { width, height } = reactFlowBounds;
                project({
                    x: width / 2,
                    y: height / 2
                });
            }
        }
    }, [project]);

    const containerRef = useResizeObserver(handleResize, 250);

    const handleNodeLabelChange = useCallback((nodeId: string, newLabel: string) => {
        setNodes((nds: Node<SystemNodeData>[]) =>
            nds.map((node) =>
                node.id === nodeId ? { 
                    ...node, 
                    data: { 
                        ...node.data, 
                        label: newLabel
                    } 
                } : node
            )
        );
    }, []);

    const handleNodeDelete = useCallback((nodeId: string) => {
        setNodes((nds: Node<SystemNodeData>[]) => nds.filter((node) => node.id !== nodeId));
        setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    }, [setEdges]);

    // Update initial nodes with handlers
    useEffect(() => {
        setNodes((nds: Node<SystemNodeData>[]) =>
            nds.map((node) => ({
                ...node,
                data: {
                    ...node.data,
                    onLabelChange: (newLabel: string) => handleNodeLabelChange(node.id, newLabel),
                    onDelete: (nodeId: string) => handleNodeDelete(nodeId)
                }
            }))
        );
    }, [handleNodeLabelChange, handleNodeDelete]);

    const handleEdgePlay = useCallback((edgeId: string) => {
        const edge = edges.find((e) => e.id === edgeId);
        if (edge?.data?.transactionId) {
            // Update edge status to running
            setEdges((eds) =>
                eds.map((e) =>
                    e.id === edgeId ? { ...e, data: { ...e.data, status: 'running' } } : e
                )
            );

            // Find the saved transaction
            const savedTransaction = transactions.find(t => t.id === edge.data.transactionId);
            if (savedTransaction) {
                const transaction: SavedTransaction = {
                    id: savedTransaction.id,
                    transactionId: edge.data.transactionId,
                    sourceNode: edge.source,
                    targetNode: edge.target,
                    status: 'running',
                    timestamp: new Date().toISOString(),
                    request: savedTransaction.request,
                    test: {
                        script: savedTransaction.test?.script || '',
                        enabled: savedTransaction.test?.enabled || false,
                        result: undefined
                    }
                };
                setRunningTransaction(transaction);
            }

            // Run the transaction
            onRunTransaction(edge.data.transactionId);
        }
    }, [edges, transactions, onRunTransaction]);

    const handleEdgeStop = useCallback((edgeId: string) => {
        setEdges((eds) =>
            eds.map((edge) =>
                edge.id === edgeId ? { ...edge, data: { ...edge.data, status: 'stopped' } } : edge
            )
        );
        setRunningTransaction(null);
    }, [setEdges]);

    const handleEdgeEdit = useCallback((edge: Edge<TransactionEdgeData>) => {
        setSelectedTransaction({
            id: edge.id,
            request: {
                method: edge.data?.operation || 'GET',
                path: edge.data?.path || '/',
                headers: {},
                body: undefined
            },
            loading: false,
            test: {
                script: '',
                enabled: false
            }
        });
    }, []);

    const handleEdgeDelete = useCallback((edgeId: string) => {
        setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
    }, [setEdges]);

    const onConnect = useCallback((params: Connection) => {
        const edgeId = `${params.source}-${params.target}`;
        setEdges((eds) => addEdge({
            ...params,
            id: edgeId,
            type: 'custom',
            data: {
                transactionId: '',
                operation: 'GET',
                path: '/',
                status: 'open',
                testStatus: 'Not Tested',
                onPlay: () => handleEdgePlay(edgeId),
                onStop: () => handleEdgeStop(edgeId),
                onEdit: () => handleEdgeEdit({
                    id: edgeId,
                    source: params.source || '',
                    target: params.target || '',
                    type: 'custom',
                    data: {
                        transactionId: '',
                        operation: 'GET',
                        path: '/',
                        status: 'open',
                        testStatus: 'Not Tested',
                        onPlay: () => {},
                        onStop: () => {},
                        onEdit: () => {},
                        onRemove: () => {}
                    }
                }),
                onRemove: () => handleEdgeDelete(edgeId)
            },
            style: edgeStyles,
            markerEnd: edgeStyles.markerEnd
        }, eds));
    }, [setEdges, handleEdgePlay, handleEdgeStop, handleEdgeEdit, handleEdgeDelete]);

    const handleTransactionSave = useCallback((transaction: TransactionDetails) => {
        if (onSaveTransaction) {
            const edge = edges.find((e) => e.id === transaction.id);
            if (edge) {
                const savedTransaction: SavedTransaction = {
                    id: transaction.id,
                    transactionId: edge.data?.transactionId || '',
                    sourceNode: edge.source,
                    targetNode: edge.target,
                    status: edge.data?.status || 'open',
                    timestamp: new Date().toISOString(),
                    request: transaction.request,
                    test: {
                        script: transaction.test?.script || '',
                        enabled: transaction.test?.enabled || false,
                        result: ''
                    },
                    selectedElements: {
                        nodeIds: [],
                        edgeIds: [edge.id],
                        nodes: [],
                        edges: [edge]
                    }
                };
                onSaveTransaction(savedTransaction);
            }
        }
        setSelectedTransaction(null);
    }, [edges, onSaveTransaction]);

    const getEdgeStyle = useCallback((status?: string) => {
        switch (status) {
            case 'running':
                return runningEdgeStyles;
            case 'performed':
                return performedEdgeStyles;
            default:
                return edgeStyles;
        }
    }, []);

    const handleAddSystem = useCallback(() => {
        const nodes = getNodes();
        const newNodeId = `system-${nodes.length + 1}`;
        const newNode: Node<SystemNodeData> = {
            id: newNodeId,
            type: 'system',
            position: {
                x: Math.random() * 500,
                y: Math.random() * 500
            },
            data: {
                label: `System ${nodes.length + 1}`,
                type: 'API',
                onLabelChange: (newLabel: string) => handleNodeLabelChange(newNodeId, newLabel),
                onDelete: () => handleNodeDelete(newNodeId)
            }
        };
        setNodes((nds) => [...nds, newNode]);
    }, [getNodes, handleNodeLabelChange, handleNodeDelete]);

    return (
        <Box ref={containerRef} sx={{ width: '100%', height: '80vh', position: 'relative' }}>
            {edgeMarkers}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={{
                    type: 'custom'
                }}
                fitView
            >
                <Background />
                <Controls />
                <MiniMap />
            </ReactFlow>

            <EditorToolbar onAddSystem={handleAddSystem} />

            {selectedTransaction && (
                <TransactionDialog
                    open={true}
                    onClose={() => setSelectedTransaction(null)}
                    transaction={selectedTransaction}
                    onSave={handleTransactionSave}
                />
            )}

            <TransactionResultDrawer
                open={!!runningTransaction}
                onClose={() => {
                    if (runningTransaction) {
                        handleEdgeStop(runningTransaction.id);
                    }
                }}
                transaction={runningTransaction}
            />
        </Box>
    );
};

export const FlowchartEditor: React.FC<FlowchartEditorProps> = (props) => {
    return (
        <ReactFlowProvider>
            <FlowchartEditorContent {...props} />
        </ReactFlowProvider>
    );
}; 