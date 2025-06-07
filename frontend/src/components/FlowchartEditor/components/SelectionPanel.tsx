import React from 'react';
import { Box, Stack, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import { SystemNode, TransactionEdge } from '../types';

interface SelectionPanelProps {
    selectedElements: {
        nodes: SystemNode[];
        edges: TransactionEdge[];
    };
    onPlayTransaction: (edges: string[]) => void;
    onSaveTransaction: () => void;
    isSaving: boolean;
    findConnectedEdges: (startNodeId: string) => TransactionEdge[];
    nodes: SystemNode[];
}

export const SelectionPanel: React.FC<SelectionPanelProps> = ({
    selectedElements,
    onPlayTransaction,
    onSaveTransaction,
    isSaving,
    findConnectedEdges,
    nodes
}) => {
    const handlePlayTransaction = async () => {
        console.log('Selected elements:', selectedElements);
        let edgesToPlay: string[] = [];
        
        if (selectedElements.edges.length > 0) {
            // If edges are selected, play all of them in order
            edgesToPlay = selectedElements.edges
                .sort((a, b) => {
                    const aIndex = nodes.findIndex(n => n.id === a.source);
                    const bIndex = nodes.findIndex(n => n.id === b.source);
                    return aIndex - bIndex;
                })
                .map(edge => edge.id);
        } else if (selectedElements.nodes.length > 0) {
            // If nodes are selected, find all connected edges starting from these nodes
            const connectedEdges = selectedElements.nodes.flatMap(node => 
                findConnectedEdges(node.id)
            );
            edgesToPlay = connectedEdges
                .sort((a, b) => {
                    const aIndex = nodes.findIndex(n => n.id === a.source);
                    const bIndex = nodes.findIndex(n => n.id === b.source);
                    return aIndex - bIndex;
                })
                .map(edge => edge.id);
        } else if (nodes.length > 0) {
            // If nothing is selected, find all connected edges from the first node
            const connectedEdges = findConnectedEdges(nodes[0].id);
            edgesToPlay = connectedEdges
                .sort((a, b) => {
                    const aIndex = nodes.findIndex(n => n.id === a.source);
                    const bIndex = nodes.findIndex(n => n.id === b.source);
                    return aIndex - bIndex;
                })
                .map(edge => edge.id);
        }
        
        console.log('Playing transactions for edges:', edgesToPlay);
        if (edgesToPlay.length > 0) {
            await onPlayTransaction(edgesToPlay);
        }
    };

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 20,
                right: 20,
                zIndex: 4,
                bgcolor: 'background.paper',
                borderRadius: 1,
                boxShadow: 3,
                p: 2
            }}
        >
            <Stack direction="row" spacing={2} alignItems="center">
                <Tooltip title="Run Transaction">
                    <IconButton
                        onClick={handlePlayTransaction}
                        sx={{
                            bgcolor: '#4caf50',
                            color: 'white',
                            '&:hover': {
                                bgcolor: '#388e3c'
                            }
                        }}
                    >
                        <PlayArrowIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Save Transaction">
                    <IconButton
                        onClick={async () => {
                            console.log('Save button clicked');
                            await onSaveTransaction();
                        }}
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
                            <CircularProgress size={24} sx={{ color: 'white' }} />
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
        </Box>
    );
}; 