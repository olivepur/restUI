import React from 'react';
import {
    Drawer,
    Box,
    Typography,
    Paper,
    IconButton,
    Divider,
    Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { SavedTransaction } from '../types';

interface TransactionResultDrawerProps {
    open: boolean;
    onClose: () => void;
    transaction: SavedTransaction | null;
}

export const TransactionResultDrawer: React.FC<TransactionResultDrawerProps> = ({
    open,
    onClose,
    transaction
}) => {
    if (!transaction) return null;

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'success':
                return 'success';
            case 'failed':
                return 'error';
            case 'running':
                return 'info';
            default:
                return 'default';
        }
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: { width: '40%', minWidth: 400, maxWidth: 600 }
            }}
        >
            <Box sx={{ p: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6">Transaction Result</Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* Transaction Info */}
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        From {transaction.sourceNode} to {transaction.targetNode}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                        <Typography variant="h6">
                            {transaction.request.method} {transaction.request.path}
                        </Typography>
                        <Chip
                            label={transaction.status}
                            color={getStatusColor(transaction.status)}
                            size="small"
                        />
                    </Box>
                </Paper>

                {/* Request Details */}
                <Typography variant="h6" sx={{ mb: 1 }}>Request</Typography>
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="subtitle2">Headers:</Typography>
                    <pre style={{ margin: '8px 0', overflow: 'auto' }}>
                        {JSON.stringify(transaction.request.headers, null, 2)}
                    </pre>
                    {transaction.request.body && (
                        <>
                            <Typography variant="subtitle2">Body:</Typography>
                            <pre style={{ margin: '8px 0', overflow: 'auto' }}>
                                {JSON.stringify(transaction.request.body, null, 2)}
                            </pre>
                        </>
                    )}
                </Paper>

                {/* Response Details */}
                {transaction.response && (
                    <>
                        <Typography variant="h6" sx={{ mb: 1 }}>Response</Typography>
                        <Paper sx={{ p: 2, mb: 3 }}>
                            <Typography variant="subtitle2">
                                Status: {transaction.response.status}
                            </Typography>
                            <Typography variant="subtitle2">Headers:</Typography>
                            <pre style={{ margin: '8px 0', overflow: 'auto' }}>
                                {JSON.stringify(transaction.response.headers, null, 2)}
                            </pre>
                            {transaction.response.body && (
                                <>
                                    <Typography variant="subtitle2">Body:</Typography>
                                    <pre style={{ margin: '8px 0', overflow: 'auto' }}>
                                        {JSON.stringify(transaction.response.body, null, 2)}
                                    </pre>
                                </>
                            )}
                        </Paper>
                    </>
                )}

                {/* Test Details */}
                {transaction.test && (
                    <>
                        <Typography variant="h6" sx={{ mb: 1 }}>Test</Typography>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2">Script:</Typography>
                            <pre style={{ margin: '8px 0', overflow: 'auto' }}>
                                {transaction.test.script}
                            </pre>
                            {transaction.test.result && (
                                <>
                                    <Typography variant="subtitle2">Result:</Typography>
                                    <pre style={{ margin: '8px 0', overflow: 'auto' }}>
                                        {transaction.test.result}
                                    </pre>
                                </>
                            )}
                        </Paper>
                    </>
                )}
            </Box>
        </Drawer>
    );
}; 