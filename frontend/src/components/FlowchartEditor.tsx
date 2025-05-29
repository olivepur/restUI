import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { statusColors } from './FlowchartEditor/styles';
import { testStatusColors } from './FlowchartEditor/styles';
import { StatusBadge } from './FlowchartEditor/components/StatusBadge';
import { CustomEdge } from './FlowchartEditor/components/CustomEdge';
import ReactFlow, {
    Controls,
    Background,
    MiniMap,
    addEdge,
    Connection,
    useNodesState,
    useEdgesState,
    Panel,
    Edge,
    Node,
    EdgeMouseHandler,
    NodeMouseHandler,
    Handle,
    Position,
    NodeTypes,
    OnNodesChange,
    NodeChange,
    NodeDragHandler,
    XYPosition,
    EdgeProps,
    BaseEdge,
    getSmoothStepPath,
    EdgeTypes,
    SelectionMode,
    OnSelectionChangeParams
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Typography,
    IconButton,
    Stack,
    Drawer,
    Paper,
    Divider,
    CircularProgress,
    Tooltip,
    Tabs,
    Tab,
    Badge,
    Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import { Transaction } from '../types/TestData';
import { SavedTransaction, SystemNode, TransactionEdge, TransactionEdgeData, SystemNodeData, EdgeStatus } from '../types/FlowTypes';
import { RequestFileSelector } from './RequestFileSelector';
import { useNavigate } from 'react-router-dom';
import HistoryIcon from '@mui/icons-material/History';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { useResizeObserver } from '../hooks/useResizeObserver';

interface FlowchartEditorProps {
    transactions: Transaction[];
    onRunTransaction: (transactionId: string) => void;
    onSaveTransaction?: (transaction: SavedTransaction) => void;
}

interface TransactionDetails {
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

interface SelectedElements {
    nodes: SystemNode[];
    edges: TransactionEdge[];
}

// Add interface for response type
interface TransactionResponse {
    path: string;
    status: number;
    response: any;
}

// Using SystemNodeData from FlowTypes


// Define edge style types
type EdgeStyleType = {
    stroke: string;
    strokeWidth: number;
    markerEnd: string;
};

// Update edge styles with proper typing
const edgeStyles: EdgeStyleType = {
    stroke: statusColors.open.backgroundColor,
    strokeWidth: 2,
    markerEnd: 'url(#arrow)'
};

const selectedEdgeStyles: EdgeStyleType = {
    stroke: '#2196f3',
    strokeWidth: 2,
    markerEnd: 'url(#arrow-selected)'
};

const selectedNodeStyles = {
    border: '2px solid #2196f3',
    backgroundColor: '#e3f2fd',
};

const defaultNodeStyles = {
    border: '1px solid #000000',
    backgroundColor: 'white',
};

const runningEdgeStyles = {
    stroke: '#4caf50',
    strokeWidth: 2,
    markerEnd: 'url(#arrow-running)'
};

const performedEdgeStyles = {
    stroke: '#8bc34a',  // Light green color for performed edges
    strokeWidth: 2,
    markerEnd: 'url(#arrow-performed)'
};

const edgeLabelStyles = {
    fill: 'black',
    fontSize: '12px',
    fontFamily: 'monospace',
    pointerEvents: 'none' as const
};

// Custom System Node Component
const SystemNodeComponent: React.FC<{ data: SystemNodeData; selected: boolean; id: string }> = ({ data, selected, id }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [labelValue, setLabelValue] = useState(data.label);
    const [isHovered, setIsHovered] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setIsEditing(false);
            if (data.onLabelChange) {
                data.onLabelChange(labelValue);
            }
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setLabelValue(data.label);
        }
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (data.onLabelChange) {
            data.onLabelChange(labelValue);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.onDelete) {
            data.onDelete(id);
        }
    };

    return (
        <div 
            style={{ 
                padding: '10px', 
                border: selected ? '2px solid #2196f3' : '1px solid #000000', 
                borderRadius: '5px',
                background: selected ? '#e3f2fd' : 'white',
                minWidth: '150px',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                position: 'relative'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isHovered && (
                <IconButton
                    size="small"
                    onClick={handleDelete}
                    sx={{
                        position: 'absolute',
                        top: -20,
                        right: -20,
                        backgroundColor: '#ff1744',
                        color: 'white',
                        '&:hover': {
                            backgroundColor: '#d50000'
                        },
                        width: 24,
                        height: 24,
                        '& .MuiSvgIcon-root': {
                            fontSize: 16
                        }
                    }}
                >
                    <DeleteIcon />
                </IconButton>
            )}
            <Handle
                type="target"
                position={Position.Left}
                style={{ borderRadius: 0 }}
                id="target"
            />
            {isEditing ? (
                <input
                    ref={inputRef}
                    value={labelValue}
                    onChange={(e) => setLabelValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    style={{
                        width: '90%',
                        border: 'none',
                        background: 'transparent',
                        textAlign: 'center',
                        color: selected ? '#2196f3' : '#000000',
                        fontSize: '1rem',
                        padding: '2px'
                    }}
                />
            ) : (
                <Typography 
                    variant="body1" 
                    sx={{ color: selected ? '#2196f3' : '#000000' }}
                    onDoubleClick={handleDoubleClick}
                >
                    {data.label}
                </Typography>
            )}
            <Handle
                type="source"
                position={Position.Right}
                style={{ borderRadius: 0 }}
                id="source"
            />
        </div>
    );
};

// Define node types outside the component
const nodeTypes: NodeTypes = {
    system: SystemNodeComponent
};

// Add helper function to convert headers
const convertHeaders = (headers: any): Record<string, string> => {
    const result: Record<string, string> = {};
    Object.entries(headers).forEach(([key, value]) => {
        if (value !== undefined) {
            result[key] = String(value);
        }
    });
    return result;
};

// Update type guard function at the top level
const isTransactionEdge = (edge: Edge | null): edge is Edge<TransactionEdgeData> & { data: TransactionEdgeData } => {
    return edge !== null && edge.data !== undefined && 'transactionId' in edge.data;
};



export const FlowchartEditor: React.FC<FlowchartEditorProps> = ({ transactions, onRunTransaction, onSaveTransaction }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<SystemNodeData>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<TransactionEdgeData>([]);
    const [isAddSystemOpen, setIsAddSystemOpen] = useState(false);
    const [newSystemName, setNewSystemName] = useState('');
    const [selectedEdge, setSelectedEdge] = useState<TransactionEdge | null>(null);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
    const [isSelectTransactionOpen, setIsSelectTransactionOpen] = useState(false);
    const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
    const [nodePositions, setNodePositions] = useState<Record<string, XYPosition>>({});
    const [runningEdges, setRunningEdges] = useState<Set<string>>(new Set());
    const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();

    // Add new state for multi-selection
    const [selectedElements, setSelectedElements] = useState<SelectedElements>({
        nodes: [],
        edges: []
    });

    // Add state for active tab
    const [activeTab, setActiveTab] = useState(0);

 

    // Define edge types with memoized component
    const edgeTypes: EdgeTypes = useMemo(() => ({
        default: CustomEdge,
        custom: CustomEdge
    }), []);

    // Update the node click handler to toggle selection
    const handleNodeClick: NodeMouseHandler = (event: React.MouseEvent, node: Node) => {
        event.preventDefault();
        const isCtrlPressed = event.ctrlKey || event.metaKey;
        
        setSelectedElements(prev => {
            const isSelected = prev.nodes.some(n => n.id === node.id);
            
            if (isCtrlPressed) {
                // Toggle node selection when Ctrl is pressed
                return {
                    nodes: isSelected 
                        ? prev.nodes.filter(n => n.id !== node.id)
                        : [...prev.nodes, node as SystemNode],
                    edges: prev.edges
                };
            } else {
                // If clicking an already selected node, deselect it
                if (isSelected && prev.nodes.length === 1 && prev.edges.length === 0) {
                    return { nodes: [], edges: [] };
                }
                // Otherwise, select only this node
                return {
                    nodes: [node as SystemNode],
                    edges: []
                };
            }
        });
        
        // Clear selected edge if we're not holding Ctrl
        if (!isCtrlPressed) {
            setSelectedEdge(null);
        }
    };

    // Update the edge click handler to toggle selection
    const handleEdgeClick: EdgeMouseHandler = (event: React.MouseEvent, edge: Edge) => {
        event.preventDefault();
        const isCtrlPressed = event.ctrlKey || event.metaKey;
        const transactionEdge = edge as Edge<TransactionEdgeData>;
        
        setSelectedElements(prev => {
            const isSelected = prev.edges.some(e => e.id === edge.id);
            
            if (isCtrlPressed) {
                // Toggle edge selection when Ctrl is pressed
                return {
                    nodes: prev.nodes,
                    edges: isSelected 
                        ? prev.edges.filter(e => e.id !== edge.id)
                        : [...prev.edges, transactionEdge]
                };
            } else {
                // If clicking an already selected edge, deselect it
                if (isSelected && prev.edges.length === 1 && prev.nodes.length === 0) {
                    setSelectedEdge(null);
                    return { nodes: [], edges: [] };
                }
                // Otherwise, select only this edge
                return {
                    nodes: [],
                    edges: [transactionEdge]
                };
            }
        });
        
        // Update selectedEdge only if we're not holding Ctrl
        if (!isCtrlPressed) {
            setSelectedEdge(isSelected => 
                isSelected?.id === transactionEdge.id ? null : transactionEdge
            );
        }
    };

    // Update the nodes with selection state
    const nodesWithSelection = useMemo(() => {
        return nodes.map(node => ({
            ...node,
            selected: selectedElements.nodes.some(n => n.id === node.id) || 
                     (selectedEdge && 
                      (node.id === (selectedEdge as Edge<TransactionEdgeData>).source || 
                       node.id === (selectedEdge as Edge<TransactionEdgeData>).target)) || 
                     false,
            style: {
                ...defaultNodeStyles,
                ...(selectedElements.nodes.some(n => n.id === node.id)
                    ? selectedNodeStyles
                    : {})
            }
        }));
    }, [nodes, selectedElements.nodes, selectedEdge]);

    // Update edges with selection state
    const edgesWithSelection = useMemo(() => {
        return edges.map(edge => {
            const status = edge.data?.status || 'open';
            const isSelected = selectedElements.edges.some(e => e.id === edge.id) || 
                              (edge.id === (selectedEdge as Edge<TransactionEdgeData>)?.id);
            
            let style: EdgeStyleType = {
                ...edgeStyles
            };

            // Apply status-specific styles
            if (isSelected) {
                style = {
                    ...style,
                    ...selectedEdgeStyles
                };
            } else if (runningEdges.has(edge.id)) {
                style = {
                    stroke: statusColors.running.backgroundColor,
                    strokeWidth: 2,
                    markerEnd: 'url(#arrow-running)'
                };
            } else {
                // Apply status-specific styles when not selected or running
                switch (status) {
                    case 'performed':
                        style = {
                            stroke: statusColors.performed.backgroundColor,
                            strokeWidth: 2,
                            markerEnd: 'url(#arrow-performed)'
                        };
                        break;
                    case 'error':
                        style = {
                            stroke: statusColors.error.backgroundColor,
                            strokeWidth: 2,
                            markerEnd: 'url(#arrow-error)'
                        };
                        break;
                    case 'pending':
                        style = {
                            stroke: statusColors.pending.backgroundColor,
                            strokeWidth: 2,
                            markerEnd: 'url(#arrow-pending)'
                        };
                        break;
                    case 'open':
                    default:
                        // Keep default edgeStyles
                        break;
                }
            }

            return {
                ...edge,
                selected: isSelected,
                style,
                animated: runningEdges.has(edge.id)
            };
        });
    }, [edges, selectedElements.edges, selectedEdge, runningEdges]);

    const handleAddSystem = () => {
        if (!newSystemName.trim()) return;

        const nodeId = `system-${Date.now()}`;
        const newNode = createNode(nodeId, newSystemName, { x: 100, y: 100 });

        setNodes((nds: SystemNode[]) => [...nds, newNode]);
        setNewSystemName('');
        setIsAddSystemOpen(false);
    };

    // Update the handlePlayTransaction function to save responses
    const handlePlayTransaction = async (edgeId: string | string[]) => {
        console.log('=== Starting Transaction(s) ===');
        
        // Convert input to array of edge IDs
        const edgeIds = Array.isArray(edgeId) ? edgeId : [edgeId];
        console.log(`Playing edges: ${edgeIds.join(', ')}`);
        
        // Add all edges to running set
        setRunningEdges(prev => new Set([...Array.from(prev), ...edgeIds]));

        // Keep track of all responses
        const responses: Array<{
            path: string;
            status: number;
            headers: Record<string, string>;
            body: any;
        }> = [];
        
        // Process each edge in sequence
        for (let i = 0; i < edgeIds.length; i++) {
            const id = edgeIds[i];
            console.log(`\n--- Processing Edge ${id} (${i + 1}/${edgeIds.length}) ---`);
            
            const edge = edges.find(e => e.id === id);
            if (edge?.data) {
                // Find the target node to get its label
                const targetNode = nodes.find(n => n.id === edge?.target);
                const targetLabel = targetNode?.data?.label || 'unknown';
                console.log(`Target node: ${targetLabel}`);

                // Set status to pending before making the request
                console.log('Setting status: pending');
                updateEdgeStatus(edge, 'pending');

                try {
                    console.log(`Making ${edge.data.operation} request to ${edge.data.path}`);
                    // Make the actual HTTP request
                    const response = await axios({
                        method: edge.data.operation.toLowerCase(),
                        url: `http://localhost:8080${edge.data.path.replace('{node-label-target}', targetLabel)}`,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer sample-token'
                        }
                    });

                    console.log(`Request successful - Status: ${response.status}`);
                    console.log('Setting status: running');
                    // Set status to running while request is active
                    updateEdgeStatus(edge, 'running');

                    // Add response to our collection
                    responses.push({
                        path: `/api/hello/${targetLabel}`,
                        status: response.status,
                        headers: convertHeaders(response.headers),
                        body: response.data
                    });

                    // Update transaction details with all responses so far
                    setTransactionDetails(prev => prev ? {
                        ...prev,
                        loading: i < edgeIds.length - 1,
                        response: {
                            status: response.status,
                            headers: convertHeaders(response.headers),
                            body: {
                                currentStep: {
                                    path: `/api/hello/${targetLabel}`,
                                    response: response.data
                                },
                                allResponses: responses.map(r => ({
                                    path: r.path,
                                    status: r.status,
                                    response: r.body
                                }))
                            }
                        }
                    } : null);

                    // Set status to performed after successful completion
                    if (i === edgeIds.length - 1) {
                        console.log('Final edge completed, setting status to performed after delay');
                        // Only set to performed after a short delay to show the running state
                        setTimeout(() => {
                            console.log('Setting status: performed');
                            updateEdgeStatus(edge, 'performed');
                        }, 500);
                    }

                } catch (err) {
                    console.error('Request failed:', err);
                    console.log('Setting status: error');
                    // Set status to error on failure
                    updateEdgeStatus(edge, 'error');

                    // Handle error as before...
                    const error = err as Error;
                    const errorResponse = {
                        status: axios.isAxiosError(err) ? err.response?.status || 500 : 500,
                        headers: axios.isAxiosError(err) ? convertHeaders(err.response?.headers || {}) : {},
                        body: {
                            error: error.message,
                            details: axios.isAxiosError(err) ? err.response?.data : 'An unexpected error occurred',
                            path: `/api/hello/${targetLabel}`
                        }
                    };

                    setTransactionDetails(prev => prev ? {
                        ...prev,
                        loading: false,
                        response: errorResponse
                    } : null);
                }

                // Remove edge from running set after completion
                console.log(`Removing edge ${id} from running set`);
                setRunningEdges(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(id);
                    return newSet;
                });

                // Add delay between sequential requests
                if (i < edgeIds.length - 1) {
                    console.log('Adding delay before next edge');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        console.log('=== Transaction(s) Complete ===');
    };

    const handleStopTransaction = (edgeId: string) => {
        console.log('STOP');
        setRunningEdges(prev => {
            const newSet = new Set(prev);
            newSet.delete(edgeId);
            return newSet;
        });
        setTransactionDetails(null);
    };

    const handleEditTransaction = (edgeId: string) => {
        console.log('EDIT');
        const edge = edges.find(e => e.id === edgeId) as Edge<TransactionEdgeData>;
        if (edge?.data) {
            setSelectedEdge(edge);
        }
    };

    const handleRemoveTransaction = (edgeId: string) => {
        console.log('DELETE');
        setEdges(edges => {
            const remainingEdges = edges.filter(e => e.id !== edgeId);
            // If we're removing the selected edge, select another one if available
            if (selectedEdge?.id === edgeId && remainingEdges.length > 0) {
                setSelectedEdge(remainingEdges[0]);
                return remainingEdges.map(e => ({
                    ...e,
                    selected: e.id === remainingEdges[0].id
                }));
            }
            return remainingEdges;
        });
    };

    const handleRequestChange = (requestData: { method: string; url: string }) => {
        if (selectedEdge?.data) {
            const urlParts = requestData.url.split('/');
            const lastUrlPart = urlParts[urlParts.length - 1];

            const updatedEdge: Edge<TransactionEdgeData> = {
                ...selectedEdge,
                label: `${requestData.method} ${lastUrlPart}`,
                style: edgeStyles,
                labelStyle: edgeLabelStyles,
                data: {
                    transactionId: selectedEdge.data.transactionId,
                    operation: requestData.method,
                    path: lastUrlPart,
                    onPlay: handlePlayTransaction,
                    onStop: handleStopTransaction,
                    onEdit: handleEditTransaction,
                    onRemove: handleRemoveTransaction
                }
            };

            // Update the target node name with the last URL part
            const targetNode = nodes.find(n => n.id === selectedEdge.target);
            if (targetNode) {
                const updatedNode: SystemNode = {
                    ...targetNode,
                    data: {
                        ...targetNode.data,
                        label: lastUrlPart
                    }
                };
                setNodes(nodes.map(n => n.id === targetNode.id ? updatedNode : n));
            }

            setEdges(edges.map(e => e.id === selectedEdge.id ? updatedEdge : e));
        }
    };

    const onConnect = useCallback(
        (params: Connection) => {
            console.log('Connection attempt:', params);
            if (transactions.length > 0) {
                setPendingConnection(params);
                setIsSelectTransactionOpen(true);
            } else {
                // Find the target node to get its label
                const targetNode = nodes.find(n => n.id === params.target);
                const targetLabel = targetNode?.data.label || 'default';

                const newEdge: Edge<TransactionEdgeData> = {
                    id: `edge-${Date.now()}`,
                    source: params.source || '',
                    target: params.target || '',
                    type: 'custom',
                    animated: true,
                    style: selectedEdgeStyles,
                    labelStyle: edgeLabelStyles,
                    sourceHandle: params.sourceHandle || 'source',
                    targetHandle: params.targetHandle || 'target',
                    data: {
                        transactionId: uuidv4(),
                        operation: 'GET',
                        path: `/api/hello/{node-label-target}`,  // Use placeholder that will be replaced at runtime
                        onPlay: handlePlayTransaction,
                        onStop: handleStopTransaction,
                        onEdit: handleEditTransaction,
                        onRemove: handleRemoveTransaction
                    },
                    label: `GET /api/hello/${targetLabel}`,
                    selected: true
                };
                setEdges((eds) => addEdge(newEdge, eds));
                setSelectedEdge(newEdge);
            }
        },
        [transactions, nodes]
    );

    const handleTransactionSelect = (transaction: Transaction) => {
        console.log('Transaction selected:', transaction);
        if (pendingConnection?.source && pendingConnection?.target) {
            console.log('Creating edge with connection:', pendingConnection);

            const newEdge: Edge<TransactionEdgeData> = {
                id: `edge-${Date.now()}`,
                source: pendingConnection.source,
                target: pendingConnection.target,
                type: 'custom',
                animated: true,
                style: selectedEdgeStyles,
                labelStyle: edgeLabelStyles,
                data: {
                    transactionId: transaction.id,
                    operation: transaction.operation,
                    path: transaction.requestPath,
                    onPlay: handlePlayTransaction,
                    onStop: handleStopTransaction,
                    onEdit: handleEditTransaction,
                    onRemove: handleRemoveTransaction
                },
                label: `${transaction.operation} ${transaction.requestPath}`,
                sourceHandle: pendingConnection.sourceHandle || 'source',
                targetHandle: pendingConnection.targetHandle || 'target',
                selected: true
            };
            console.log('New edge:', newEdge);
            setEdges((eds) => addEdge(newEdge, eds));
            setSelectedEdge(newEdge);
        }
        setIsSelectTransactionOpen(false);
        setPendingConnection(null);
    };

    const handleRunTransaction = () => {
        if (selectedEdge?.data) {
            onRunTransaction(selectedEdge.data.transactionId);
            setSelectedEdge(null);
        }
    };

    const onNodeDragStop: NodeDragHandler = (event, node) => {
        setNodePositions((prev) => ({
            ...prev,
            [node.id]: node.position
        }));
    };

    const handleNodesChange: OnNodesChange = (changes: NodeChange[]) => {
        onNodesChange(changes);
        
        // Update edges for moved nodes
        changes.forEach((change) => {
            if (change.type === 'position' && change.dragging === false) {
                const nodeId = change.id;
                const connectedEdges = edges.filter(
                    (edge) => edge.source === nodeId || edge.target === nodeId
                );

                if (connectedEdges.length > 0) {
                    setEdges((eds) => 
                        eds.map((edge) => {
                            if (edge.source === nodeId || edge.target === nodeId) {
                                return {
                                    ...edge,
                                    sourceHandle: edge.source === nodeId ? 'source' : edge.sourceHandle,
                                    targetHandle: edge.target === nodeId ? 'target' : edge.targetHandle
                                };
                            }
                            return edge;
                        })
                    );
                }
            }
        });
    };

    const handleSaveTransaction = () => {
        console.log('=== SAVE TRANSACTION START ===');
        
        // Check if we have any selected elements to save
        if (selectedElements.nodes.length > 0 || selectedElements.edges.length > 0) {
            setIsSaving(true);
            
            // Remove duplicate nodes and edges using Set
            const uniqueNodes = Array.from(
                new Map(selectedElements.nodes.map(node => [node.id, node])).values()
            );
            
            // Sort nodes by their position to ensure correct order
            const orderedNodes = [...uniqueNodes].sort((a, b) => {
                if (a.position.x === b.position.x) {
                    return a.position.y - b.position.y;
                }
                return a.position.x - b.position.x;
            });

            // Generate a single transaction ID for the entire transaction
            const transactionId = uuidv4();
            
            // Create edges between consecutive nodes with unique IDs
            const pathEdges = orderedNodes.slice(0, -1).map((node, index) => {
                const targetNode = orderedNodes[index + 1];
                const edgeId = `${transactionId}-edge-${index}`; // Simpler, deterministic edge IDs
                const timestamp = new Date().toISOString();

                // Find existing edge between these nodes to get its current status
                const existingEdge = edges.find(e => e.source === node.id && e.target === targetNode.id);
                const currentStatus = existingEdge?.data?.status || 'open';
                const currentTestStatus = existingEdge?.data?.testStatus || 'Not Tested';
                
                console.log(`Creating edge ${edgeId} with status: ${currentStatus}, test status: ${currentTestStatus}`);
                
                return {
                    id: edgeId,
                    source: node.id,
                    target: targetNode.id,
                    type: 'default',
                    animated: false,
                    sourceHandle: 'source',
                    targetHandle: 'target',
                    style: selectedEdgeStyles,
                    data: {
                        transactionId: edgeId,
                        operation: 'GET',
                        path: `/api/hello/${targetNode.data.label}`,
                        onPlay: handlePlayTransaction,
                        onStop: handleStopTransaction,
                        onEdit: handleEditTransaction,
                        onRemove: handleRemoveTransaction,
                        status: currentStatus,
                        testStatus: currentTestStatus,
                        timestamp: timestamp
                    },
                    label: `GET /api/hello/${targetNode.data.label}`,
                    selected: true,
                    markerEnd: 'url(#arrow-selected)'
                } as Edge<TransactionEdgeData>;
            });

            // Create the saved transaction with overall status based on edge statuses
            const determineOverallStatus = (edges: TransactionEdge[]) => {
                const statuses = edges.map(e => e.data?.status);
                if (statuses.every(s => s === 'performed')) return 'Completed';
                if (statuses.some(s => s === 'error')) return 'Failed';
                if (statuses.some(s => s === 'running')) return 'Running';
                if (statuses.some(s => s === 'pending')) return 'Pending';
                return 'Not Run';
            };

            const savedTransaction: SavedTransaction = {
                id: transactionId,
                transactionId: transactionId,
                sourceNode: orderedNodes[0]?.data.label || 'Unknown',
                targetNode: orderedNodes[orderedNodes.length - 1]?.data.label || 'Unknown',
                status: determineOverallStatus(pathEdges),
                timestamp: new Date().toISOString(),
                request: {
                    method: 'GET',
                    path: `/api/hello/${orderedNodes[orderedNodes.length - 1]?.data.label}`,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer sample-token'
                    }
                },
                test: {
                    script: `// Test script for transaction sequence\npm.test("Status code is 200", function () {\n    pm.response.to.have.status(200);\n});`,
                    enabled: true,
                    result: 'Not Tested'
                },
                selectedElements: {
                    nodeIds: orderedNodes.map(n => n.id),
                    edgeIds: pathEdges.map(e => e.id),
                    nodes: orderedNodes.map(node => {
                        const { onLabelChange, onDelete, ...nodeDataWithoutFunctions } = node.data;
                        return {
                            ...node,
                            data: nodeDataWithoutFunctions
                        };
                    }) as SystemNode[],
                    edges: pathEdges
                }
            };

            console.log('Complete Saved Transaction JSON:', JSON.stringify(savedTransaction, null, 2));

            // Only save through the callback, which should handle both state update and localStorage
            if (onSaveTransaction) {
                onSaveTransaction(savedTransaction);
            }
            
            // Clear selection after saving
            setSelectedElements({ nodes: [], edges: [] });
            setSelectedEdge(null);
            
            setTimeout(() => {
                setIsSaving(false);
            }, 500);
        } else {
            console.log('No elements selected to save');
        }

        console.log('=== SAVE TRANSACTION END ===');
    };

    const handleViewHistory = () => {
        navigate('/transactions-history');
    };

    const renderTransactionDetails = () => {
        if (!transactionDetails) return null;

        return (
            <Box sx={{ width: '100%', height: '100%', p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h6">Transaction Details</Typography>
                    <IconButton onClick={() => setTransactionDetails(null)}>
                        <CloseIcon />
                    </IconButton>
                </Stack>

                <Divider sx={{ mb: 3 }} />

                {transactionDetails.response?.body?.allResponses && (
                    <>
                        <Tabs
                            value={activeTab}
                            onChange={(_, newValue) => setActiveTab(newValue)}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                mb: 2,
                                borderBottom: 1,
                                borderColor: 'divider',
                                '& .MuiTab-root': {
                                    textTransform: 'none',
                                    minWidth: 120,
                                }
                            }}
                        >
                            {transactionDetails.response.body.allResponses.map((response: TransactionResponse, index: number) => {
                                // Find corresponding edge for this response
                                const edge = edges.find(e => e.data?.path.includes(response.path.split('/').pop() || ''));
                                const runStatus = edge?.data?.status || 'open';
                                const testStatus = edge?.data?.testStatus || 'Not Tested';

                                return (
                                    <Tab
                                        key={index}
                                        label={
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                                                <Typography variant="body2">
                                                    {`Step ${index + 1}: ${response.path.split('/').pop()}`}
                                                </Typography>
                                                <StatusBadge runStatus={runStatus} testStatus={testStatus} />
                                            </Box>
                                        }
                                    />
                                );
                            })}
                        </Tabs>

                        {transactionDetails.response.body.allResponses.map((response: TransactionResponse, index: number) => (
                            <Box
                                key={index}
                                role="tabpanel"
                                hidden={activeTab !== index}
                                sx={{ display: activeTab === index ? 'block' : 'none' }}
                            >
                                <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                        <Typography variant="subtitle1">
                                            Request
                                        </Typography>
                                        {/* Find edge for this response and show its status badges */}
                                        {(() => {
                                            const edge = edges.find(e => e.data?.path.includes(response.path.split('/').pop() || ''));
                                            return edge && (
                                                <StatusBadge 
                                                    runStatus={edge.data?.status} 
                                                    testStatus={edge.data?.testStatus || 'Not Tested'} 
                                                />
                                            );
                                        })()}
                                    </Stack>

                                    <Typography variant="body2" sx={{ mb: 2, fontFamily: 'monospace' }}>
                                        GET {response.path}
                                    </Typography>

                                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                        Response Status: {' '}
                                        <Box
                                            component="span"
                                            sx={{
                                                color: response.status === 200 ? 'success.main' : 'error.main',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {response.status}
                                        </Box>
                                    </Typography>

                                    <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                                        Response Body:
                                    </Typography>
                                    <Paper 
                                        elevation={0}
                                        sx={{ 
                                            p: 2,
                                            bgcolor: '#ffffff',
                                            fontFamily: 'monospace',
                                            overflowX: 'auto'
                                        }}
                                    >
                                        <pre style={{ margin: 0 }}>
                                            {JSON.stringify(response.response, null, 2)}
                                        </pre>
                                    </Paper>
                                </Paper>
                            </Box>
                        ))}
                    </>
                )}

                {transactionDetails.loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                )}
            </Box>
        );
    };

    // Update the selection change handler for drag selection
    const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
        console.log('Selection changed:', params);
        
        // Check if Ctrl/Cmd key is pressed using the event from the document
        const isCtrlPressed = window.event && (
            (window.event as KeyboardEvent).ctrlKey || 
            (window.event as KeyboardEvent).metaKey
        );
        
        if (isCtrlPressed) {
            setSelectedElements(prev => {
                const newNodes = params.nodes as SystemNode[];
                const newEdges = params.edges as Edge<TransactionEdgeData>[];
                
                // Merge selections using Set for deduplication
                const nodeIds = new Set([...prev.nodes.map(n => n.id), ...newNodes.map(n => n.id)]);
                const edgeIds = new Set([...prev.edges.map(e => e.id), ...newEdges.map(e => e.id)]);
                
                return {
                    nodes: [...prev.nodes, ...newNodes].filter(n => nodeIds.has(n.id)),
                    edges: [...prev.edges, ...newEdges].filter(e => edgeIds.has(e.id))
                };
            });
        } else {
            setSelectedElements({
                nodes: params.nodes as SystemNode[],
                edges: params.edges as Edge<TransactionEdgeData>[]
            });
        }
    }, []);

    // Add helper function to find connected edges
    const findConnectedEdges = useCallback((startNodeId: string): Edge<TransactionEdgeData>[] => {
        const result: Edge<TransactionEdgeData>[] = [];
        let currentNodeId = startNodeId;

        while (currentNodeId) {
            // Find the next edge that starts from current node
            const nextEdge = edges.find((e: Edge<TransactionEdgeData>) => e.source === currentNodeId);
            if (!nextEdge) break;

            result.push(nextEdge);
            currentNodeId = nextEdge.target;
        }

        return result;
    }, [edges]);

    const createNode = useCallback((id: string, label: string, position: { x: number, y: number }): SystemNode => ({
        id,
        type: 'system',
        position,
        data: {
            label,
            type: 'system',
            onLabelChange: (newLabel: string) => {
                setNodes((nds: SystemNode[]) =>
                    nds.map((node: SystemNode) =>
                        node.id === id
                            ? { ...node, data: { ...node.data, label: newLabel } }
                            : node
                    )
                );
            },
            onDelete: (nodeId: string) => {
                // Remove all connected edges first
                setEdges(eds => eds.filter(edge => 
                    edge.source !== nodeId && edge.target !== nodeId
                ));
                // Then remove the node
                setNodes(nds => nds.filter(node => node.id !== nodeId));
            }
        }
    }), [setNodes, setEdges]);

    // Initialize nodes and edges
    useEffect(() => {
        const initialNodes = [
            createNode('system-1', 'A', { x: 15, y: 135 }),
            createNode('system-2', 'B', { x: 255, y: 45 }),
            createNode('system-3', 'C', { x: 480, y: 135 })
        ];

        const initialEdges = [
            {
                id: 'edge-1',
                source: 'system-1',
                target: 'system-2',
                type: 'default',
                animated: true,
                style: selectedEdgeStyles,
                sourceHandle: 'source',
                targetHandle: 'target',
                data: {
                    transactionId: uuidv4(),
                    operation: 'GET',
                    path: '/api/hello/{node-label-target}',
                    onPlay: (ids: string | string[]) => console.log('Play', ids),
                    onStop: (id: string) => console.log('Stop', id),
                    onEdit: (id: string) => console.log('Edit', id),
                    onRemove: (id: string) => console.log('Remove', id),
                    status: 'open' as EdgeStatus,
                    testStatus: 'Not Tested',
                    timestamp: new Date().toISOString()
                },
                label: 'GET /api/hello/B',
                selected: true,
                markerEnd: 'url(#arrow-selected)'
            } as Edge<TransactionEdgeData>,
            {
                id: 'edge-2',
                source: 'system-2',
                target: 'system-3',
                type: 'default',
                animated: true,
                style: selectedEdgeStyles,
                sourceHandle: 'source',
                targetHandle: 'target',
                data: {
                    transactionId: uuidv4(),
                    operation: 'GET',
                    path: '/api/hello/{node-label-target}',
                    onPlay: (ids: string | string[]) => console.log('Play', ids),
                    onStop: (id: string) => console.log('Stop', id),
                    onEdit: (id: string) => console.log('Edit', id),
                    onRemove: (id: string) => console.log('Remove', id),
                    status: 'open' as EdgeStatus,
                    testStatus: 'Not Tested',
                    timestamp: new Date().toISOString()
                },
                label: 'GET /api/hello/C',
                selected: false,
                markerEnd: 'url(#arrow)'
            } as Edge<TransactionEdgeData>
        ];

        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [createNode]);

    // Add helper function to update edge status
    const updateEdgeStatus = (edge: Edge<TransactionEdgeData>, status: EdgeStatus) => {
        console.log(`Status change for edge ${edge.id}: ${edge.data?.status || 'none'} -> ${status}`);
        
        // Update edge in state
        setEdges(eds => 
            eds.map(e => {
                if (e.id === edge.id) {
                    return {
                        ...e,
                        data: {
                            ...e.data,
                            status,
                            timestamp: new Date().toISOString()
                        }
                    } as Edge<TransactionEdgeData>;
                }
                return e;
            })
        );

        // Update in localStorage
        const savedTransactions = JSON.parse(localStorage.getItem('savedTransactions') || '[]');
        const updatedTransactions = savedTransactions.map((t: SavedTransaction) => {
            if (t.selectedElements?.edges?.some(e => e.data?.transactionId === edge.data?.transactionId)) {
                console.log(`Updating status in saved transaction ${t.id}`);
                const updatedEdges = t.selectedElements.edges.map(e => {
                    if (e.data?.transactionId === edge.data?.transactionId) {
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
                });

                return {
                    ...t,
                    selectedElements: {
                        ...t.selectedElements,
                        edges: updatedEdges
                    }
                };
            }
            return t;
        });
        localStorage.setItem('savedTransactions', JSON.stringify(updatedTransactions));
    };

    // Add resize observer for the container with useCallback
    const handleResize = useCallback((entry: ResizeObserverEntry) => {
        // Only trigger resize if dimensions actually changed
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
            // Use RAF to batch resize events
            requestAnimationFrame(() => {
                window.dispatchEvent(new Event('resize'));
            });
        }
    }, []);

    const containerRef = useResizeObserver(handleResize, 250);

    return (
        <Box 
            ref={containerRef}
            sx={{ width: '100%', height: '80vh', position: 'relative' }}
        >
            <ReactFlow
                nodes={nodesWithSelection}
                edges={edgesWithSelection}
                onNodesChange={handleNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgeClick={handleEdgeClick}
                onNodeClick={handleNodeClick}
                onNodeDragStop={onNodeDragStop}
                onSelectionChange={onSelectionChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                selectionMode={SelectionMode.Partial}
                selectionOnDrag={true}
                selectNodesOnDrag={true}
                selectionKeyCode="Shift"
                multiSelectionKeyCode="Control"
                panOnDrag={true}
                panOnScroll={true}
                zoomOnScroll={true}
                defaultEdgeOptions={{
                    type: 'default',
                    style: edgeStyles
                }}
                fitView
                snapToGrid
                snapGrid={[15, 15]}
            >
                <svg>
                    <defs>
                        <marker
                            id="arrow"
                            viewBox="-10 -5 10 10"
                            refX="0"
                            refY="0"
                            markerWidth="10"
                            markerHeight="10"
                            orient="auto"
                        >
                            <path
                                d="M-10,-5 L0,0 L-10,5"
                                fill="none"
                                stroke={statusColors.open.backgroundColor}
                                strokeWidth="1.5"
                            />
                        </marker>
                        <marker
                            id="arrow-selected"
                            viewBox="-10 -5 10 10"
                            refX="0"
                            refY="0"
                            markerWidth="10"
                            markerHeight="10"
                            orient="auto"
                        >
                            <path
                                d="M-10,-5 L0,0 L-10,5"
                                fill="none"
                                stroke="#2196f3"
                                strokeWidth="1.5"
                            />
                        </marker>
                        <marker
                            id="arrow-running"
                            viewBox="-10 -5 10 10"
                            refX="0"
                            refY="0"
                            markerWidth="10"
                            markerHeight="10"
                            orient="auto"
                        >
                            <path
                                d="M-10,-5 L0,0 L-10,5"
                                fill="none"
                                stroke={statusColors.running.backgroundColor}
                                strokeWidth="1.5"
                            />
                        </marker>
                        <marker
                            id="arrow-performed"
                            viewBox="-10 -5 10 10"
                            refX="0"
                            refY="0"
                            markerWidth="10"
                            markerHeight="10"
                            orient="auto"
                        >
                            <path
                                d="M-10,-5 L0,0 L-10,5"
                                fill="none"
                                stroke={statusColors.performed.backgroundColor}
                                strokeWidth="1.5"
                            />
                        </marker>
                        <marker
                            id="arrow-error"
                            viewBox="-10 -5 10 10"
                            refX="0"
                            refY="0"
                            markerWidth="10"
                            markerHeight="10"
                            orient="auto"
                        >
                            <path
                                d="M-10,-5 L0,0 L-10,5"
                                fill="none"
                                stroke={statusColors.error.backgroundColor}
                                strokeWidth="1.5"
                            />
                        </marker>
                        <marker
                            id="arrow-pending"
                            viewBox="-10 -5 10 10"
                            refX="0"
                            refY="0"
                            markerWidth="10"
                            markerHeight="10"
                            orient="auto"
                        >
                            <path
                                d="M-10,-5 L0,0 L-10,5"
                                fill="none"
                                stroke={statusColors.pending.backgroundColor}
                                strokeWidth="1.5"
                            />
                        </marker>
                    </defs>
                </svg>
                <Background />
                <Controls />
                <MiniMap />

                <Panel position="top-right">
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setIsAddSystemOpen(true)}
                            >
                                Add System
                            </Button>
                            <Tooltip title="View Transaction History">
                                <Button
                                    variant="outlined"
                                    startIcon={<HistoryIcon />}
                                    onClick={handleViewHistory}
                                >
                                    History
                                </Button>
                            </Tooltip>
                        </Stack>
                        <IconButton
                            onClick={() => {
                                let edgesToPlay: Edge<TransactionEdgeData>[] = [];

                                if (selectedElements.edges.length > 0) {
                                    // If edges are selected, play those
                                    edgesToPlay = selectedElements.edges;
                                } else if (selectedElements.nodes.length > 0) {
                                    // If nodes are selected, find all connected edges starting from the first node
                                    const startNodeId = selectedElements.nodes[0].id;
                                    edgesToPlay = findConnectedEdges(startNodeId);
                                } else {
                                    // If nothing is selected, find all connected edges from the first node
                                    const firstNode = nodes[0];
                                    if (firstNode) {
                                        edgesToPlay = findConnectedEdges(firstNode.id);
                                    }
                                }

                                if (edgesToPlay.length > 0) {
                                    // Get all edge IDs and play them
                                    const edgeIds = edgesToPlay.map(edge => edge.id);
                                    handlePlayTransaction(edgeIds);

                                    // Update transaction details
                                    const firstEdge = edgesToPlay[0];
                                    if (firstEdge?.data) {
                                        setTransactionDetails({
                                            id: edgesToPlay.map(e => e.data?.transactionId).filter(Boolean).join(','),
                                            request: {
                                                method: firstEdge.data.operation,
                                                path: `Transaction paths: ${edgesToPlay.map(e => e.data?.path).filter(Boolean).join(' → ')}`,
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': 'Bearer sample-token'
                                                }
                                            },
                                            loading: true,
                                            test: {
                                                script: `// Test script for transaction sequence
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});`,
                                                enabled: true
                                            }
                                        });
                                    }
                                }
                            }}
                            sx={{ 
                                bgcolor: '#4caf50',
                                color: 'white',
                                '&:hover': {
                                    bgcolor: '#2e7d32'
                                }
                            }}
                        >
                            <PlayArrowIcon />
                        </IconButton>
                        <IconButton
                            onClick={() => setIsDetailsDialogOpen(true)}
                            sx={{ 
                                bgcolor: 'primary.main',
                                color: 'white',
                                '&:hover': {
                                    bgcolor: 'primary.dark'
                                }
                            }}
                        >
                            <EditIcon />
                        </IconButton>
                        <Tooltip title="Save Transaction">
                            <IconButton
                                onClick={handleSaveTransaction}
                                disabled={isSaving}
                                sx={{ 
                                    bgcolor: '#2196f3',
                                    color: 'white',
                                    '&:hover': {
                                        bgcolor: '#1976d2'
                                    },
                                    '&.Mui-disabled': {
                                        bgcolor: '#90caf9'
                                    }
                                }}
                            >
                                {isSaving ? (
                                    <CircularProgress 
                                        size={24} 
                                        sx={{ 
                                            color: 'white'
                                        }} 
                                    />
                                ) : (
                                    <SaveIcon />
                                )}
                            </IconButton>
                        </Tooltip>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {selectedElements.edges.map(edge => 
                                `${edge.data?.operation} ${edge.data?.path}`
                            ).join(' → ')}
                        </Typography>
                    </Stack>
                </Panel>
            </ReactFlow>

            {/* Add System Dialog */}
            <Dialog open={isAddSystemOpen} onClose={() => setIsAddSystemOpen(false)}>
                <DialogTitle>Add New System</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="System Name"
                        fullWidth
                        value={newSystemName}
                        onChange={(e) => setNewSystemName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsAddSystemOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddSystem} variant="contained">Add</Button>
                </DialogActions>
            </Dialog>

            {/* Select Transaction Dialog */}
            <Dialog 
                open={isSelectTransactionOpen} 
                onClose={() => {
                    setIsSelectTransactionOpen(false);
                    setPendingConnection(null);
                }}
            >
                <DialogTitle>Select Transaction</DialogTitle>
                <DialogContent>
                    <Box sx={{ minWidth: '300px' }}>
                        {transactions.map((transaction) => (
                            <Button
                                key={transaction.id}
                                onClick={() => handleTransactionSelect(transaction)}
                                fullWidth
                                sx={{ mb: 1, justifyContent: 'flex-start', textAlign: 'left' }}
                            >
                                {transaction.operation} {transaction.requestPath}
                            </Button>
                        ))}
                    </Box>
                </DialogContent>
            </Dialog>

            {/* Transaction Details Dialog */}
            <Dialog 
                open={isDetailsDialogOpen} 
                onClose={() => setIsDetailsDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #e0e0e0',
                    pb: 2
                }}>
                    <Typography variant="h6" component="span">Transaction Details</Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {selectedEdge?.data && (
                        <Box>
                            <RequestFileSelector onRequestChange={handleRequestChange} />
                            <Typography variant="subtitle1" sx={{ mt: 3, mb: 2, fontWeight: 'bold' }}>
                                Operation: {selectedEdge.data.operation}
                            </Typography>
                            <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                Path: {selectedEdge.data.path}
                            </Typography>
                            <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                Transaction ID: {selectedEdge.data.transactionId}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid #e0e0e0', pt: 2 }}>
                    <Button onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Transaction Details Drawer */}
            <Drawer
                anchor="right"
                open={!!transactionDetails}
                onClose={() => setTransactionDetails(null)}
                variant="persistent"
                sx={{
                    width: 400,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: 400,
                        boxSizing: 'border-box',
                    },
                }}
            >
                {renderTransactionDetails()}
            </Drawer>
        </Box>
    );
}; 