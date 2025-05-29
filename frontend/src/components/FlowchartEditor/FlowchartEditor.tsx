import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState, Connection, useReactFlow, ReactFlowProvider, SelectionMode, Node, Edge, NodeDragHandler, XYPosition } from 'reactflow';
import 'reactflow/dist/style.css';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { useNodeManagement } from '../../hooks/flowchart/useNodeManagement';
import { useEdgeManagement } from '../../hooks/flowchart/useEdgeManagement';
import { useTransactionManagement } from '../../hooks/flowchart/useTransactionManagement';
import { useSelectionManagement } from '../../hooks/flowchart/useSelectionManagement';
import { useTransactionRunner } from '../../hooks/flowchart/useTransactionRunner';
import { SystemNode as SystemNodeComponent } from './components/SystemNode';
import { CustomEdge } from './components/CustomEdge';
import { TransactionDialog } from './components/Dialogs/TransactionDialog';
import { TransactionResultDrawer } from './components/TransactionResultDrawer';
import { SelectionPanel } from './components/SelectionPanel';
import { Toolbar } from './components/Toolbar/index';
import { FlowchartEditorProps, TransactionEdge, SystemNodeData, TransactionEdgeData, SystemNode, SelectedElements, SavedTransaction } from './types';
import { edgeStyles, edgeMarkers } from './styles';
import { v4 as uuidv4 } from 'uuid';

interface NodePositions {
    [nodeId: string]: XYPosition;
}

const nodeTypes = {
    system: SystemNodeComponent
};

const edgeTypes = {
    custom: CustomEdge
};

const createNode = (id: string, label: string, position: XYPosition, onLabelChange?: (newLabel: string) => void, onDelete?: (nodeId: string) => void): Node<SystemNodeData> => ({
    id,
    type: 'system',
    position,
    data: {
        label,
        type: 'system',
        onLabelChange,
        onDelete
    }
});

const FlowchartEditorContent: React.FC<FlowchartEditorProps> = ({
    onSaveTransaction
}) => {
    const [nodePositions, setNodePositions] = useState<NodePositions>({});
    const [edges, setEdges, onEdgesChange] = useEdgesState<TransactionEdgeData>([]);
    const [nodes, setNodes, onNodesChange] = useNodesState<SystemNodeData>([]);
    const [selectedElements, setSelectedElements] = useState<SelectedElements>({
        nodes: [],
        edges: []
    });
    const [isTransactionDrawerOpen, setIsTransactionDrawerOpen] = useState(false);
    const [currentTransaction, setCurrentTransaction] = useState<SavedTransaction | null>(null);
    const { screenToFlowPosition } = useReactFlow();
    const navigate = useNavigate();

    // Memoize the edges data to only include relevant information
    const memoizedEdges = useMemo(() => 
        edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            data: edge.data ? {
                transactionId: edge.data.transactionId,
                operation: edge.data.operation,
                path: edge.data.path,
                status: edge.data.status,
                testStatus: edge.data.testStatus,
                timestamp: edge.data.timestamp
            } : null
        })),
        [edges.map(e => 
            `${e.id}:${e.source}:${e.target}:${e.data?.operation}:${e.data?.path}:${e.data?.status}`
        ).join(',')]
    );

    // Memoize the nodes data to only include relevant information
    const memoizedNodes = useMemo(() => 
        nodes.map(node => ({
            id: node.id,
            label: node.data.label,
            type: node.data.type,
            position: node.position
        })),
        [nodes.map(n => `${n.id}:${n.data.label}:${n.data.type}`).join(',')]
    );

    const updateEdgeStatus = useCallback((edgeId: string, status: string) => {
        setEdges(eds => eds.map(e => {
            if (e.id === edgeId && e.data) {
                const edgeColor = status === 'success' ? '#4caf50' : // Green for success
                                status === 'failed' ? '#d32f2f' :    // Red for failed
                                status === 'running' ? '#2196f3' :   // Blue for running
                                '#757575';                          // Gray for other states
                return {
                    ...e,
                    data: {
                        ...e.data,
                        status,
                        transactionId: e.data.transactionId || uuidv4(),
                        operation: e.data.operation || 'GET',
                        path: e.data.path || ''
                    },
                    style: {
                        ...e.style,
                        stroke: edgeColor
                    }
                } as Edge<TransactionEdgeData>;
            }
            return e;
        }));
    }, [setEdges]);

    const setEdgeRunning = useCallback((edgeId: string, isRunning: boolean) => {
        setEdges(eds => eds.map(e => {
            if (e.id === edgeId) {
                return {
                    ...e,
                    animated: isRunning
                } as Edge<TransactionEdgeData>;
            }
            return e;
        }));
    }, [setEdges]);

    const { runTransaction, transactionDetails, stopTransaction } = useTransactionRunner({
        edges: memoizedEdges as TransactionEdge[],
        updateEdgeStatus,
        setEdgeRunning
    });

    // Update transaction when details change
    useEffect(() => {
        if (transactionDetails) {
            const relevantEdge = edges.find(e => e.data?.transactionId === transactionDetails.id);
            
            const transaction: SavedTransaction = {
                id: uuidv4(),
                transactionId: transactionDetails.id,
                sourceNode: '',
                targetNode: '',
                status: relevantEdge?.data?.status || 'pending',
                timestamp: new Date().toISOString(),
                request: transactionDetails.request,
                response: transactionDetails.response,
                nodes: memoizedNodes.map(n => ({
                    id: n.id,
                    label: n.label,
                    type: n.type,
                    position: n.position
                })),
                edges: memoizedEdges.map(e => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    operation: e.data?.operation || 'GET',
                    path: e.data?.path || ''
                }))
            };

            if (relevantEdge) {
                const sourceNode = nodes.find(n => n.id === relevantEdge.source);
                const targetNode = nodes.find(n => n.id === relevantEdge.target);
                if (sourceNode && targetNode) {
                    transaction.sourceNode = sourceNode.data.label;
                    transaction.targetNode = targetNode.data.label;
                }
            }

            setCurrentTransaction(transaction);
            setIsTransactionDrawerOpen(true);
        }
    }, [transactionDetails, memoizedNodes, memoizedEdges]);

    const handlePlayTransaction = useCallback(async (edgeIds: string[]) => {
        try {
            const selectedEdges = edges.filter(e => edgeIds.includes(e.id));
            console.log('Selected edges:', selectedEdges.map(e => `${e.source}->${e.target}`));
            
            // Find all distinct paths starting from source nodes
            const findFullPath = (startEdge: Edge<TransactionEdgeData>): Edge<TransactionEdgeData>[] => {
                const path: Edge<TransactionEdgeData>[] = [startEdge];
                let currentTarget = startEdge.target;
                
                // Keep adding edges until we can't find a next edge
                while (true) {
                    const nextEdge = selectedEdges.find(e => e.source === currentTarget);
                    if (!nextEdge) break;
                    path.push(nextEdge);
                    currentTarget = nextEdge.target;
                }
                
                return path;
            };

            // Find all source edges (edges whose source nodes have no incoming selected edges)
            const sourceEdges = selectedEdges.filter(edge => 
                !selectedEdges.some(e => e.target === edge.source)
            );
            
            console.log('Source edges found:', sourceEdges.map(e => `${e.source}->${e.target}`));

            // Process each complete path
            for (const sourceEdge of sourceEdges) {
                const pathEdges = findFullPath(sourceEdge);
                
                const sourceNode = nodes.find(n => n.id === pathEdges[0].source);
                const targetNode = nodes.find(n => n.id === pathEdges[pathEdges.length - 1].target);

                const pathTransaction: SavedTransaction = {
                    id: uuidv4(),
                    transactionId: uuidv4(),
                    sourceNode: sourceNode?.data.label || '',
                    targetNode: targetNode?.data.label || '',
                    request: {
                        method: pathEdges[0]?.data?.operation || 'GET',
                        path: pathEdges[0]?.data?.path || '',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer sample-token'
                        }
                    },
                    status: 'running',
                    timestamp: new Date().toISOString(),
                    nodes: nodes.map(n => ({
                        id: n.id,
                        label: n.data.label,
                        type: n.type || 'system',
                        position: n.position
                    })),
                    edges: pathEdges.map(e => ({
                        id: e.id,
                        source: e.source,
                        target: e.target,
                        operation: e.data?.operation || 'GET',
                        path: e.data?.path || ''
                    })),
                    selectedElements: {
                        nodeIds: selectedElements.nodes.map(n => n.id),
                        edgeIds: pathEdges.map(e => e.id),
                        nodes: selectedElements.nodes,
                        edges: pathEdges
                    }
                };

                console.log('Running transaction for path:', {
                    path: pathEdges.map(e => `${e.source}->${e.target}`).join(' -> '),
                    edgeIds: pathEdges.map(e => e.id)
                });
                
                setCurrentTransaction(pathTransaction);
                setIsTransactionDrawerOpen(true);
                await runTransaction(pathEdges.map(e => e.id));
            }
        } catch (error) {
            console.error('Error running transaction:', error);
            setIsTransactionDrawerOpen(false);
        }
    }, [runTransaction, selectedElements, nodes, edges]);

    // Initialize nodes and edges
    useEffect(() => {
        const initialNodes: Node<SystemNodeData>[] = [
            createNode('node-a', 'Anton', { x: 265, y: 276 }, 
                (newLabel: string) => {
                    setNodes((nds) => nds.map(n => n.id === 'node-a' ? { ...n, data: { ...n.data, label: newLabel } } : n));
                },
                (nodeId: string) => {
                    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
                    setNodes(nds => nds.filter(n => n.id !== nodeId));
                }
            ),
            createNode('node-b', 'Beate', { x: 340, y: 430 },
                (newLabel: string) => {
                    setNodes((nds) => nds.map(n => n.id === 'node-b' ? { ...n, data: { ...n.data, label: newLabel } } : n));
                },
                (nodeId: string) => {
                    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
                    setNodes(nds => nds.filter(n => n.id !== nodeId));
                }
            ),
            createNode('node-c', 'Cesar', { x: 343, y: 568 },
                (newLabel: string) => {
                    setNodes((nds) => nds.map(n => n.id === 'node-c' ? { ...n, data: { ...n.data, label: newLabel } } : n));
                },
                (nodeId: string) => {
                    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
                    setNodes(nds => nds.filter(n => n.id !== nodeId));
                }
            ),
            createNode('node-e', 'Emil', { x: 161, y: 436 },
                (newLabel: string) => {
                    setNodes((nds) => nds.map(n => n.id === 'node-ce' ? { ...n, data: { ...n.data, label: newLabel } } : n));
                },
                (nodeId: string) => {
                    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
                    setNodes(nds => nds.filter(n => n.id !== nodeId));
                }
            )
        ];

        const initialEdges: Edge<TransactionEdgeData>[] = [
            {
                id: `edge-${uuidv4()}`,
                source: 'node-a',
                target: 'node-b',
                type: 'default',
                animated: false,
                data: {
                    transactionId: uuidv4(),
                    operation: 'GET',
                    path: '/api/hello/Beate',
                    status: 'open',
                    testStatus: 'Not Tested',
                    timestamp: new Date().toISOString(),
                    onPlay: () => {},
                    onStop: () => {},
                    onEdit: () => {},
                    onRemove: () => {}
                },
                style: edgeStyles,
                label: 'GET /api/hello/Beate'
            },
            {
                id: `edge-${uuidv4()}`,
                source: 'node-b',
                target: 'node-c',
                type: 'default',
                animated: false,
                data: {
                    transactionId: uuidv4(),
                    operation: 'GET',
                    path: '/api/hello/Cesar',
                    status: 'open',
                    testStatus: 'Not Tested',
                    timestamp: new Date().toISOString(),
                    onPlay: () => {},
                    onStop: () => {},
                    onEdit: () => {},
                    onRemove: () => {}
                },
                style: edgeStyles,
                label: 'GET /api/hello/Cesar'
            },
            
            {
                id: `edge-${uuidv4()}`,
                source: 'node-a',
                target: 'node-e',
                type: 'default',
                animated: false,
                data: {
                    transactionId: uuidv4(),
                    operation: 'GET',
                    path: '/api/hello/Emil',
                    status: 'open',
                    testStatus: 'Not Tested',
                    timestamp: new Date().toISOString(),
                    onPlay: () => {},
                    onStop: () => {},
                    onEdit: () => {},
                    onRemove: () => {}
                },
                style: edgeStyles,
                label: 'GET /api/hello/Emil'
            }
        ];

        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [setNodes, setEdges]);

    const {
        selectedEdge,
        setSelectedEdge,
        isSaving,
        handleSaveTransaction
    } = useTransactionManagement({
        edges: edges as unknown as TransactionEdge[],
        setEdges: setEdges as unknown as React.Dispatch<React.SetStateAction<TransactionEdge[]>>,
        nodes: nodes as unknown as SystemNode[],
        onSaveTransaction,
        selectedElements,
        currentTransaction
    });

    const {
        handleNodeClick,
        handleEdgeClick,
        handleSelectionChange
    } = useSelectionManagement({
        setSelectedEdge
    });

    const {
        handleEdgeAdd,
        findConnectedEdges
    } = useEdgeManagement({
        edges: edges as unknown as TransactionEdge[],
        setEdges: setEdges as unknown as React.Dispatch<React.SetStateAction<TransactionEdge[]>>
    });

    const {
        addNode
    } = useNodeManagement({
        nodes: nodes as unknown as SystemNode[],
        setNodes: setNodes as unknown as React.Dispatch<React.SetStateAction<SystemNode[]>>,
        setEdges: setEdges as unknown as React.Dispatch<React.SetStateAction<TransactionEdge[]>>
    });

    const handleResize = useCallback((entry: ResizeObserverEntry) => {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
            const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
            if (reactFlowBounds) {
                screenToFlowPosition({
                    x: width / 2,
                    y: height / 2
                });
            }
        }
    }, [screenToFlowPosition]);

    const containerRef = useResizeObserver<HTMLDivElement>(handleResize);

    const onConnect = useCallback((params: Connection) => {
        handleEdgeAdd(params);
    }, [handleEdgeAdd]);

    const onNodeDragStop = useCallback<NodeDragHandler>((event, node) => {
        setNodePositions((prevPositions: NodePositions) => ({
            ...prevPositions,
            [node.id]: node.position
        }));
    }, []);

    // Update the onSaveTransaction handler
    const handleSaveClick = async () => {
       

        // Create a new transaction if none exists and we have selected elements
        if (!currentTransaction && (selectedElements.edges.length > 0 || selectedElements.nodes.length > 0)) {
            const newTransaction: SavedTransaction = {
                id: uuidv4(),
                transactionId: uuidv4(),
                sourceNode: selectedElements.nodes[0]?.data.label || '',
                targetNode: selectedElements.nodes[selectedElements.nodes.length - 1]?.data.label || '',
                request: {
                    method: selectedElements.edges[0]?.data?.operation || 'GET',
                    path: selectedElements.edges[0]?.data?.path || '',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                },
                response: undefined,
                status: 'pending',
                timestamp: new Date().toISOString(),
                nodes: nodes.map(n => ({
                    id: n.id,
                    label: n.data.label,
                    type: n.type || 'system',
                    position: n.position
                })),
                edges: edges.map(e => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    operation: e.data?.operation || 'GET',
                    path: e.data?.path || ''
                })),
                selectedElements: {
                    nodeIds: selectedElements.nodes.map(n => n.id),
                    edgeIds: selectedElements.edges.map(e => e.id),
                    nodes: selectedElements.nodes,
                    edges: selectedElements.edges
                }
            };

            setCurrentTransaction(newTransaction);
        }
        
        if (currentTransaction || selectedElements.edges.length > 0 || selectedElements.nodes.length > 0) {
            // Log the current state of localStorage before saving
            await handleSaveTransaction();
            // Log the updated state of localStorage after saving
            // Close the drawer after saving
            setIsTransactionDrawerOpen(false);
            setCurrentTransaction(null);
        } else {
            console.warn('No transaction to save - please select nodes or edges first');
        }
    };

    const handleViewHistory = () => {
        navigate('/transactions-history');
    };

    return (
        <Box 
            ref={containerRef}
            sx={{ width: '100%', height: '80vh', position: 'relative' }}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgeClick={handleEdgeClick}
                onNodeClick={handleNodeClick}
                onSelectionChange={handleSelectionChange}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                selectionMode={SelectionMode.Partial}
                selectionOnDrag={true}
                selectNodesOnDrag={true}
                selectionKeyCode="Shift"
                multiSelectionKeyCode="Control"
                defaultEdgeOptions={{
                    type: 'default',
                    style: edgeStyles
                }}
                fitView
            >
                {edgeMarkers}
                <Background />
                <Controls />
                <MiniMap />
            </ReactFlow>

            <Toolbar 
                onAddSystem={(name: string) => addNode(name)}
                selectedTransactionPath=""
                onViewHistory={handleViewHistory}
            />

            <SelectionPanel
                selectedElements={selectedElements}
                onPlayTransaction={async () => {
                    let edgesToPlay: string[] = [];
               
                    
                    if (selectedElements.edges.length > 0) {
                        edgesToPlay = selectedElements.edges.map(edge => edge.id);
                        console.log('Playing selected edges:', edgesToPlay);
                    } else if (selectedElements.nodes.length > 0) {
                        const connectedEdges = selectedElements.nodes.flatMap(node => 
                            findConnectedEdges(node.id)
                        );
                        edgesToPlay = connectedEdges.map(edge => edge.id);
                        console.log('Playing edges connected to selected nodes:', edgesToPlay);
                    } else if (nodes.length > 0) {
                        const connectedEdges = findConnectedEdges(nodes[0].id);
                        edgesToPlay = connectedEdges.map(edge => edge.id);
                        console.log('Playing edges connected to first node:', edgesToPlay);
                    }
                    
                    if (edgesToPlay.length > 0) {
                        console.log('Final edges to play:', edgesToPlay);
                        await handlePlayTransaction(edgesToPlay);
                    } else {
                        console.log('No edges to play');
                    }
                }}
                onSaveTransaction={handleSaveClick}
                isSaving={isSaving}
                findConnectedEdges={findConnectedEdges}
                nodes={nodes as unknown as SystemNode[]}
            />

            {selectedEdge && (
                <TransactionDialog
                    open={true}
                    onClose={() => setSelectedEdge(null)}
                    edgeData={selectedEdge.data}
                    onRequestChange={(data: { method: string; url: string; body?: any }) => {
                        if (!selectedEdge.data) return;
                        
                        const updatedEdge: Edge<TransactionEdgeData> = {
                            ...selectedEdge,
                            data: {
                                ...selectedEdge.data,
                                operation: data.method,
                                path: data.url,
                                requestBody: data.body,
                                // Preserve required fields
                                transactionId: selectedEdge.data.transactionId,
                                status: selectedEdge.data.status,
                                testStatus: selectedEdge.data.testStatus,
                                onPlay: selectedEdge.data.onPlay,
                                onStop: selectedEdge.data.onStop,
                                onEdit: selectedEdge.data.onEdit,
                                onRemove: selectedEdge.data.onRemove
                            },
                            // Update the edge label to reflect the new method and path
                            label: `${data.method} ${data.url}`
                        };
                        setEdges(edges => edges.map(edge => 
                            edge.id === selectedEdge.id ? updatedEdge : edge
                        ));
                        setSelectedEdge(null);
                    }}
                />
            )}

            <TransactionResultDrawer
                open={isTransactionDrawerOpen}
                onClose={() => {
                    console.log('Closing transaction drawer');
                    setIsTransactionDrawerOpen(false);
                }}
                transaction={currentTransaction}
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

export type { FlowchartEditorProps, SavedTransaction } from './types'; 