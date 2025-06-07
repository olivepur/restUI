import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { EdgeStatus } from '../types';

interface EdgeControlsProps {
    status: EdgeStatus;
    onPlay: () => void;
    onStop: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export const EdgeControls: React.FC<EdgeControlsProps> = ({
    status,
    onPlay,
    onStop,
    onEdit,
    onDelete
}) => {
    const isRunning = status === 'running';

    return (
        <Box
            sx={{
                display: 'flex',
                gap: 0.5,
                backgroundColor: 'white',
                borderRadius: 1,
                padding: 0.5,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                '& .MuiIconButton-root': {
                    padding: '4px',
                    backgroundColor: 'white'
                }
            }}
        >
            <Tooltip title={isRunning ? 'Stop' : 'Run'}>
                <IconButton
                    size="small"
                    onClick={isRunning ? onStop : onPlay}
                    color={isRunning ? 'error' : 'primary'}
                >
                    {isRunning ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
                <IconButton
                    size="small"
                    onClick={onEdit}
                    color="primary"
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
                <IconButton
                    size="small"
                    onClick={onDelete}
                    color="error"
                >
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </Box>
    );
}; 