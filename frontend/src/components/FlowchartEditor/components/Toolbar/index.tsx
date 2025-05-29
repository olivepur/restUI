import React, { useState } from 'react';
import { Stack, Typography, Button, Box, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HistoryIcon from '@mui/icons-material/History';
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
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [systemName, setSystemName] = useState('');

    const handleAddSystem = () => {
        if (systemName.trim()) {
            onAddSystem(systemName.trim());
            setSystemName('');
            setIsAddDialogOpen(false);
        }
    };

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 20,
                left: 20,
                zIndex: 1000,
                width: 'auto'
            }}
        >
            <Stack 
                direction="row" 
                spacing={2} 
                alignItems="center"
                sx={{
                    bgcolor: 'background.paper',
                    p: 2,
                    borderRadius: 2,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                }}
            >
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setIsAddDialogOpen(true)}
                >
                    Add System
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<HistoryIcon />}
                    onClick={onViewHistory}
                >
                    History
                </Button>
                {selectedTransactionPath && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {selectedTransactionPath}
                    </Typography>
                )}
            </Stack>

            <Dialog 
                open={isAddDialogOpen} 
                onClose={() => setIsAddDialogOpen(false)}
            >
                <DialogTitle>Add New System</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="System Name"
                        fullWidth
                        variant="outlined"
                        value={systemName}
                        onChange={(e) => setSystemName(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleAddSystem();
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddSystem} variant="contained">Add</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}; 