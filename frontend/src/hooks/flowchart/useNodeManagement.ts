import { useCallback } from 'react';
import { SystemNode } from '../../components/FlowchartEditor/types';

interface UseNodeManagementProps {
    nodes: SystemNode[];
    setNodes: React.Dispatch<React.SetStateAction<SystemNode[]>>;
    setEdges: React.Dispatch<React.SetStateAction<any[]>>;
}

export const useNodeManagement = ({ nodes, setNodes, setEdges }: UseNodeManagementProps) => {
    const createNode = useCallback((id: string, label: string, position: { x: number, y: number }): SystemNode => ({
        id,
        type: 'system',
        position,
        data: {
            label,
            type: 'system',
            onLabelChange: (newLabel: string) => {
                setNodes(nds =>
                    nds.map(node =>
                        node.id === id
                            ? { ...node, data: { ...node.data, label: newLabel } }
                            : node
                    )
                );
            },
            onDelete: (nodeId: string) => {
                setEdges(eds => eds.filter(edge => 
                    edge.source !== nodeId && edge.target !== nodeId
                ));
                setNodes(nds => nds.filter(node => node.id !== nodeId));
            }
        }
    }), [setNodes, setEdges]);

    const handleNodeLabelChange = useCallback((nodeId: string, newLabel: string) => {
        setNodes(nds =>
            nds.map(node =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, label: newLabel } }
                    : node
            )
        );
    }, [setNodes]);

    const handleNodeDelete = useCallback((nodeId: string) => {
        setEdges(eds => eds.filter(edge => 
            edge.source !== nodeId && edge.target !== nodeId
        ));
        setNodes(nds => nds.filter(node => node.id !== nodeId));
    }, [setNodes, setEdges]);

    const addNode = useCallback((name: string) => {
        const nodeId = `system-${Date.now()}`;
        const newNode = createNode(nodeId, name, { x: 100, y: 100 });
        setNodes(nds => [...nds, newNode]);
    }, [createNode, setNodes]);

    return {
        createNode,
        handleNodeLabelChange,
        handleNodeDelete,
        addNode
    };
}; 