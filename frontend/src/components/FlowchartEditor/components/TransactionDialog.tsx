import React, { useState, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Switch,
    FormControlLabel
} from '@mui/material';
import { TransactionDetails } from '../types';

interface TransactionDialogProps {
    open: boolean;
    onClose: () => void;
    transaction: TransactionDetails;
    onSave: (transaction: TransactionDetails) => void;
}

export const TransactionDialog: React.FC<TransactionDialogProps> = ({
    open,
    onClose,
    transaction,
    onSave
}) => {
    const [editedTransaction, setEditedTransaction] = useState<TransactionDetails>(transaction);

    const handleSave = useCallback(() => {
        onSave(editedTransaction);
        onClose();
    }, [editedTransaction, onSave, onClose]);

    const handleChange = useCallback((field: string, value: any) => {
        setEditedTransaction(prev => ({
            ...prev,
            request: {
                ...prev.request,
                [field]: value
            }
        }));
    }, []);

    const handleTestChange = useCallback((field: string, value: any) => {
        setEditedTransaction(prev => ({
            ...prev,
            test: {
                ...prev.test,
                [field]: value,
                script: prev.test?.script || '',
                enabled: prev.test?.enabled || false
            }
        }));
    }, []);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Request Details</Typography>
                    <TextField
                        fullWidth
                        label="Method"
                        value={editedTransaction.request.method}
                        onChange={(e) => handleChange('method', e.target.value)}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Path"
                        value={editedTransaction.request.path}
                        onChange={(e) => handleChange('path', e.target.value)}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Headers"
                        value={JSON.stringify(editedTransaction.request.headers, null, 2)}
                        onChange={(e) => {
                            try {
                                const headers = JSON.parse(e.target.value);
                                handleChange('headers', headers);
                            } catch (error) {
                                // Invalid JSON, ignore
                            }
                        }}
                        multiline
                        rows={4}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Body"
                        value={JSON.stringify(editedTransaction.request.body, null, 2)}
                        onChange={(e) => {
                            try {
                                const body = JSON.parse(e.target.value);
                                handleChange('body', body);
                            } catch (error) {
                                // Invalid JSON, ignore
                            }
                        }}
                        multiline
                        rows={4}
                        margin="normal"
                    />
                </Box>

                <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>Test Configuration</Typography>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={editedTransaction.test?.enabled ?? false}
                                onChange={(e) => handleTestChange('enabled', e.target.checked)}
                            />
                        }
                        label="Enable Test"
                    />
                    {editedTransaction.test?.enabled && (
                        <TextField
                            fullWidth
                            label="Test Script"
                            value={editedTransaction.test?.script ?? ''}
                            onChange={(e) => handleTestChange('script', e.target.value)}
                            multiline
                            rows={6}
                            margin="normal"
                        />
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" color="primary">
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}; 