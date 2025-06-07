import React from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';

interface EditorToolbarProps {
    onAddSystem: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
    onAddSystem
}) => {
    const navigate = useNavigate();

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 20,
                right: 20,
                zIndex: 4,
                display: 'flex',
                gap: 1,
                backgroundColor: 'white',
                padding: 1,
                borderRadius: 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
        >
            <Tooltip title="Add System">
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={onAddSystem}
                >
                    Add System
                </Button>
            </Tooltip>
            <Tooltip title="View History">
                <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<HistoryIcon />}
                    onClick={() => navigate('/history')}
                >
                    History
                </Button>
            </Tooltip>
        </Box>
    );
}; 