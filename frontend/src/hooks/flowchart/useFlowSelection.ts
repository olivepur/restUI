import { useCallback, useState } from 'react';
import { OnSelectionChangeParams } from 'reactflow';
import { SystemNode, TransactionEdge, SelectedElements } from '../../components/FlowchartEditor/types';

interface UseFlowSelectionProps {
    findConnectedEdges: (startNodeId: string) => TransactionEdge[];
}

export const useFlowSelection = ({ findConnectedEdges }: UseFlowSelectionProps) => {
    const [selectedElements, setSelectedElements] = useState<SelectedElements>({
        nodes: [],
        edges: []
    });

    const [selectedEdge, setSelectedEdge] = useState<TransactionEdge | null>(null);

    const handleNodeClick = useCallback((node: SystemNode, isCtrlPressed: boolean) => {
        setSelectedElements(prev => {
            const isSelected = prev.nodes.some(n => n.id === node.id);
            
            if (isCtrlPressed) {
                return {
                    nodes: isSelected 
                        ? prev.nodes.filter(n => n.id !== node.id)
                        : [...prev.nodes, node],
                    edges: prev.edges
                };
            } else {
                if (isSelected && prev.nodes.length === 1 && prev.edges.length === 0) {
                    return { nodes: [], edges: [] };
                }
                return {
                    nodes: [node],
                    edges: []
                };
            }
        });
        
        if (!isCtrlPressed) {
            setSelectedEdge(null);
        }
    }, []);

    const handleEdgeClick = useCallback((edge: TransactionEdge, isCtrlPressed: boolean) => {
        setSelectedElements(prev => {
            const isSelected = prev.edges.some(e => e.id === edge.id);
            
            if (isCtrlPressed) {
                return {
                    nodes: prev.nodes,
                    edges: isSelected 
                        ? prev.edges.filter(e => e.id !== edge.id)
                        : [...prev.edges, edge]
                };
            } else {
                if (isSelected && prev.edges.length === 1 && prev.nodes.length === 0) {
                    setSelectedEdge(null);
                    return { nodes: [], edges: [] };
                }
                return {
                    nodes: [],
                    edges: [edge]
                };
            }
        });
        
        if (!isCtrlPressed) {
            setSelectedEdge(isSelected => 
                isSelected?.id === edge.id ? null : edge
            );
        }
    }, []);

    const handleSelectionChange = useCallback((params: OnSelectionChangeParams) => {
        const isCtrlPressed = window.event && (
            (window.event as KeyboardEvent).ctrlKey || 
            (window.event as KeyboardEvent).metaKey
        );
        
        if (isCtrlPressed) {
            setSelectedElements(prev => {
                const newNodes = params.nodes as SystemNode[];
                const newEdges = params.edges as TransactionEdge[];
                
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
                edges: params.edges as TransactionEdge[]
            });
        }
    }, []);

    const getSelectedEdges = useCallback(() => {
        if (selectedElements.edges.length > 0) {
            return selectedElements.edges;
        }
        
        if (selectedElements.nodes.length > 0) {
            const startNodeId = selectedElements.nodes[0].id;
            return findConnectedEdges(startNodeId);
        }
        
        return [];
    }, [selectedElements, findConnectedEdges]);

    return {
        selectedElements,
        selectedEdge,
        handleNodeClick,
        handleEdgeClick,
        handleSelectionChange,
        getSelectedEdges
    };
}; 