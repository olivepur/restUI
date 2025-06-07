import React, { useState } from 'react';
import { Stack, Typography, Button, Box, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HistoryIcon from '@mui/icons-material/History';
import ApiIcon from '@mui/icons-material/Api';
import { AddSystemButton } from './AddSystemButton';
import AddIcon from '@mui/icons-material/Add';

interface ToolbarProps {
    onAddSystem: (name: string) => void;
    selectedTransactionPath: string;
    onViewHistory: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    onAddSystem,
    selectedTransactionPath,
    onViewHistory
}) => {
    const navigate = useNavigate();
    const [isAddSystemDialogOpen, setIsAddSystemDialogOpen] = useState(false);
    const [newSystemName, setNewSystemName] = useState('');

    const handleAddSystem = () => {
        if (newSystemName.trim()) {
            onAddSystem(newSystemName.trim());
            setNewSystemName('');
            setIsAddSystemDialogOpen(false);
        }
    };

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
            <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setIsAddSystemDialogOpen(true)}
            >
                Add System
            </Button>
            <Button
                variant="outlined"
                color="primary"
                startIcon={<HistoryIcon />}
                onClick={onViewHistory}
            >
                History
            </Button>
            <Button
                variant="outlined"
                color="primary"
                startIcon={<ApiIcon />}
                onClick={() => navigate('/scenario-designer')}
            >
                Scenario Designer
            </Button>

            <Dialog open={isAddSystemDialogOpen} onClose={() => setIsAddSystemDialogOpen(false)}>
                <DialogTitle>Add New System</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="System Name"
                        fullWidth
                        value={newSystemName}
                        onChange={(e) => setNewSystemName(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleAddSystem();
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsAddSystemDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddSystem} variant="contained" color="primary">
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}; 