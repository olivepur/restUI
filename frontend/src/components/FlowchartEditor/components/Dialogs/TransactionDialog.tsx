import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Stack,
    Typography,
    Box,
    Paper,
    IconButton,
    Tooltip
} from '@mui/material';
import { TransactionEdgeData } from '../../types';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css';

interface TransactionDialogProps {
    open: boolean;
    onClose: () => void;
    edgeData?: TransactionEdgeData;
    onRequestChange: (data: { method: string; url: string; body?: any }) => void;
    onRunTransaction?: () => void;
    onSaveTransaction?: () => void;
    onDeleteTransaction?: () => void;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

export const TransactionDialog: React.FC<TransactionDialogProps> = ({
    open,
    onClose,
    edgeData,
    onRequestChange,
    onRunTransaction,
    onSaveTransaction,
    onDeleteTransaction
}) => {
    const [method, setMethod] = useState(edgeData?.operation || 'GET');
    const [url, setUrl] = useState(edgeData?.path || '');
    const [requestBody, setRequestBody] = useState('');
    const [isValidJson, setIsValidJson] = useState(true);

    useEffect(() => {
        if (edgeData) {
            setMethod(edgeData.operation || 'GET');
            setUrl(edgeData.path || '');
            if (edgeData.requestBody) {
                try {
                    setRequestBody(JSON.stringify(edgeData.requestBody, null, 2));
                } catch (e) {
                    setRequestBody('');
                }
            }
        }
    }, [edgeData]);

    const handleSave = () => {
        let parsedBody;
        if (requestBody && method !== 'GET') {
            try {
                parsedBody = JSON.parse(requestBody);
                setIsValidJson(true);
            } catch (e) {
                setIsValidJson(false);
                return;
            }
        }

        onRequestChange({
            method,
            url,
            body: parsedBody
        });
        
        // Close the dialog after saving
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Edit Transaction</Typography>
                    <Stack direction="row" spacing={1}>
                        {onRunTransaction && (
                            <Tooltip title="Run Transaction">
                                <IconButton 
                                    onClick={onRunTransaction}
                                    color="primary"
                                >
                                    <PlayArrowIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                        {onSaveTransaction && (
                            <Tooltip title="Save Transaction">
                                <IconButton 
                                    onClick={onSaveTransaction}
                                    color="primary"
                                >
                                    <SaveIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                        {onDeleteTransaction && (
                            <Tooltip title="Delete Transaction">
                                <IconButton 
                                    onClick={onDeleteTransaction}
                                    color="error"
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Stack>
            </DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 2 }}>
                    <Stack direction="row" spacing={2}>
                        <FormControl sx={{ minWidth: 120 }}>
                            <InputLabel>Method</InputLabel>
                            <Select
                                value={method}
                                label="Method"
                                onChange={(e) => setMethod(e.target.value)}
                            >
                                {HTTP_METHODS.map(method => (
                                    <MenuItem key={method} value={method}>{method}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            label="URL"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="/api/endpoint"
                        />
                    </Stack>

                    {method !== 'GET' && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Request Body (JSON)
                            </Typography>
                            <Paper 
                                variant="outlined" 
                                sx={{ 
                                    bgcolor: 'background.default',
                                    border: theme => `1px solid ${!isValidJson ? theme.palette.error.main : theme.palette.divider}`
                                }}
                            >
                                <Editor
                                    value={requestBody}
                                    onValueChange={code => setRequestBody(code)}
                                    highlight={code => highlight(code, languages.json, 'json')}
                                    padding={15}
                                    style={{
                                        fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                                        fontSize: 12,
                                        backgroundColor: 'transparent',
                                        minHeight: 100
                                    }}
                                    placeholder="Enter JSON request body"
                                />
                            </Paper>
                            {!isValidJson && (
                                <Typography color="error" variant="caption">
                                    Invalid JSON format
                                </Typography>
                            )}
                        </Box>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained">
                    Save Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
};
