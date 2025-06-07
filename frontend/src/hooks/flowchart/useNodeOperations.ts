import { useCallback } from 'react';
import { SystemNode, SystemNodeData } from '../../components/FlowchartEditor/types';
import { XYPosition } from 'reactflow';

interface UseNodeOperationsProps {
    nodes: SystemNode[];
    setNodes: React.Dispatch<React.SetStateAction<SystemNode[]>>;
    setEdges: React.Dispatch<React.SetStateAction<any[]>>;
}

export const useNodeOperations = ({
    nodes,
    setNodes,
    setEdges
}: UseNodeOperationsProps) => {
    const createNode = useCallback((label: string, position: XYPosition): SystemNode => {
        const nodeId = `system-${Date.now()}`;
        return {
            id: nodeId,
            type: 'system',
            position,
            data: {
                label,
                type: 'system',
                onLabelChange: (newLabel: string) => {
                    setNodes((nds) =>
                        nds.map((node) =>
                            node.id === nodeId
                                ? { ...node, data: { ...node.data, label: newLabel } }
                                : node
                        )
                    );
                },
                onDelete: (nodeId: string) => {
                    setEdges((eds) => eds.filter(edge => 
                        edge.source !== nodeId && edge.target !== nodeId
                    ));
                    setNodes((nds) => nds.filter(node => node.id !== nodeId));
                }
            }
        };
    }, [setNodes, setEdges]);

    const addNode = useCallback((label: string) => {
        const position = { x: 100, y: 100 };
        const newNode = createNode(label, position);
        setNodes((nds) => [...nds, newNode]);
        return newNode;
    }, [createNode, setNodes]);

    const updateNodeLabel = useCallback((nodeId: string, newLabel: string) => {
        setNodes((nds) =>
            nds.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, label: newLabel } }
                    : node
            )
        );
    }, [setNodes]);

    const removeNode = useCallback((nodeId: string) => {
        setEdges((eds) => eds.filter(edge => 
            edge.source !== nodeId && edge.target !== nodeId
        ));
        setNodes((nds) => nds.filter(node => node.id !== nodeId));
    }, [setNodes, setEdges]);

    return {
        createNode,
        addNode,
        updateNodeLabel,
        removeNode
    };
}; 