import { useState, useCallback } from 'react';
import { Node, Edge, OnSelectionChangeParams } from 'reactflow';
import { SystemNode, TransactionEdge, TransactionEdgeData, SelectedElements } from '../../components/FlowchartEditor/types';

interface UseSelectionManagementProps {
    setSelectedEdge: (edge: TransactionEdge | null) => void;
}

export const useSelectionManagement = ({ setSelectedEdge }: UseSelectionManagementProps) => {
    const [selectedElements, setSelectedElements] = useState<SelectedElements>({
        nodes: [],
        edges: []
    });

    const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        event.preventDefault();
        const isCtrlPressed = event.ctrlKey || event.metaKey;
        
        // Log the node position when selected
        console.log('Selected node position:', {
            id: node.id,
            label: node.data.label,
            position: node.position,
            x: node.position.x,
            y: node.position.y
        });
        
        setSelectedElements(prev => {
            const isSelected = prev.nodes.some(n => n.id === node.id);
            
            if (isCtrlPressed) {
                return {
                    nodes: isSelected 
                        ? prev.nodes.filter(n => n.id !== node.id)
                        : [...prev.nodes, node as SystemNode],
                    edges: prev.edges
                };
            } else {
                if (isSelected && prev.nodes.length === 1 && prev.edges.length === 0) {
                    return { nodes: [], edges: [] };
                }
                return {
                    nodes: [node as SystemNode],
                    edges: []
                };
            }
        });
        
        if (!isCtrlPressed) {
            setSelectedEdge(null);
        }
    }, [setSelectedEdge]);

    const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
        event.preventDefault();
        const isCtrlPressed = event.ctrlKey || event.metaKey;
        const transactionEdge = edge as TransactionEdge;
        
        setSelectedElements(prev => {
            const isSelected = prev.edges.some(e => e.id === edge.id);
            
            if (isCtrlPressed) {
                return {
                    nodes: prev.nodes,
                    edges: isSelected 
                        ? prev.edges.filter(e => e.id !== edge.id)
                        : [...prev.edges, transactionEdge]
                };
            } else {
                if (isSelected && prev.edges.length === 1 && prev.nodes.length === 0) {
                    setSelectedEdge(null);
                    return { nodes: [], edges: [] };
                }
                return {
                    nodes: [],
                    edges: [transactionEdge]
                };
            }
        });
        
        if (!isCtrlPressed) {
            setSelectedEdge(transactionEdge);
        }
    }, [setSelectedEdge]);

    const handleSelectionChange = useCallback((params: OnSelectionChangeParams) => {
        const isCtrlPressed = window.event && (
            (window.event as KeyboardEvent).ctrlKey || 
            (window.event as KeyboardEvent).metaKey
        );
        
        if (isCtrlPressed) {
            setSelectedElements(prev => {
                const nodeIds = new Set([...prev.nodes.map(n => n.id), ...params.nodes.map(n => n.id)]);
                const edgeIds = new Set([...prev.edges.map(e => e.id), ...params.edges.map(e => e.id)]);
                
                return {
                    nodes: [...prev.nodes, ...params.nodes].filter(n => nodeIds.has(n.id)) as SystemNode[],
                    edges: [...prev.edges, ...params.edges].filter(e => edgeIds.has(e.id)) as TransactionEdge[]
                };
            });
        } else {
            setSelectedElements({
                nodes: params.nodes as SystemNode[],
                edges: params.edges as TransactionEdge[]
            });
        }
    }, []);

    return {
        selectedElements,
        setSelectedElements,
        handleNodeClick,
        handleEdgeClick,
        handleSelectionChange
    };
}; 