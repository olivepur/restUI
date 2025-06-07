import React from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface AddSystemButtonProps {
    onAddSystem: (name: string) => void;
}

export const AddSystemButton: React.FC<AddSystemButtonProps> = ({ onAddSystem }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [systemName, setSystemName] = React.useState('');

    const handleAdd = () => {
        if (systemName.trim()) {
            onAddSystem(systemName);
            setSystemName('');
            setIsOpen(false);
        }
    };

    return (
        <>
            <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setIsOpen(true)}
            >
                Add System
            </Button>

            <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
                <DialogTitle>Add New System</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="System Name"
                        fullWidth
                        value={systemName}
                        onChange={(e) => setSystemName(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleAdd();
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdd} variant="contained">Add</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
