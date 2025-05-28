import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Stack,
    Paper,
    IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { TransactionHistory } from '../components/TransactionHistory';
import { SavedTransaction } from '../types/FlowTypes';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export const TransactionsHistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const [selectedTransaction, setSelectedTransaction] = useState<SavedTransaction | null>(null);
    
    // This would typically come from your global state management (Redux/Context)
    const [transactions, setTransactions] = useState<SavedTransaction[]>(() => {
        const saved = localStorage.getItem('savedTransactions');
        return saved ? JSON.parse(saved) : [];
    });

    const handleViewTransaction = (transaction: SavedTransaction) => {
        setSelectedTransaction(transaction);
    };

    const handleCloseDetails = () => {
        setSelectedTransaction(null);
    };

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
    };

    const handleDeleteTransaction = (transactionId: string) => {
        // Filter out the deleted transaction
        const updatedTransactions = transactions.filter(t => t.id !== transactionId);
        
        // Update state
        setTransactions(updatedTransactions);
        
        // Update localStorage
        localStorage.setItem('savedTransactions', JSON.stringify(updatedTransactions));
        
        // Show notification (if you have a notification system)
        // showNotification('Transaction deleted successfully');
    };

    return (
        <Box sx={{ height: '100vh', bgcolor: 'background.default' }}>
            {/* Header */}
            <Box sx={{ 
                p: 2, 
                borderBottom: 1, 
                borderColor: 'divider',
                bgcolor: 'background.paper'
            }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate('/')}
                    >
                        Back to Flow Editor
                    </Button>
                    <Typography variant="h5">
                        Transactions History
                    </Typography>
                </Stack>
            </Box>

            {/* Main Content */}
            <Box sx={{ p: 3 }}>
                <TransactionHistory
                    transactions={transactions}
                    onViewTransaction={handleViewTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                />
            </Box>

            {/* Transaction Details Dialog */}
            <Dialog
                open={!!selectedTransaction}
                onClose={handleCloseDetails}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Transaction Details
                </DialogTitle>
                <DialogContent>
                    {selectedTransaction && (
                        <Box sx={{ mt: 2 }}>
                            {/* Transaction Info */}
                            <Paper sx={{ p: 2, mb: 2 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            From {selectedTransaction.sourceNode} to {selectedTransaction.targetNode}
                                        </Typography>
                                        <Typography variant="h6">
                                            {selectedTransaction.request.method} {selectedTransaction.request.path}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                fontFamily: 'monospace',
                                                bgcolor: 'action.hover',
                                                p: 1,
                                                borderRadius: 1
                                            }}
                                        >
                                            ID: {selectedTransaction.id}
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleCopyId(selectedTransaction.id)}
                                        >
                                            <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </Stack>
                            </Paper>

                            {/* Request Details */}
                            <Typography variant="h6" sx={{ mb: 1 }}>Request</Typography>
                            <Paper sx={{ p: 2, mb: 2 }}>
                                <Typography variant="subtitle2">Headers:</Typography>
                                <pre style={{ margin: '8px 0' }}>
                                    {JSON.stringify(selectedTransaction.request.headers, null, 2)}
                                </pre>
                                {selectedTransaction.request.body && (
                                    <>
                                        <Typography variant="subtitle2">Body:</Typography>
                                        <pre style={{ margin: '8px 0' }}>
                                            {JSON.stringify(selectedTransaction.request.body, null, 2)}
                                        </pre>
                                    </>
                                )}
                            </Paper>

                            {/* Response Details */}
                            {selectedTransaction.response && (
                                <>
                                    <Typography variant="h6" sx={{ mb: 1 }}>Response</Typography>
                                    <Paper sx={{ p: 2, mb: 2 }}>
                                        <Typography variant="subtitle2">
                                            Status: {selectedTransaction.response.status}
                                        </Typography>
                                        <Typography variant="subtitle2">Headers:</Typography>
                                        <pre style={{ margin: '8px 0' }}>
                                            {JSON.stringify(selectedTransaction.response.headers, null, 2)}
                                        </pre>
                                        {selectedTransaction.response.body && (
                                            <>
                                                <Typography variant="subtitle2">Body:</Typography>
                                                <pre style={{ margin: '8px 0' }}>
                                                    {JSON.stringify(selectedTransaction.response.body, null, 2)}
                                                </pre>
                                            </>
                                        )}
                                    </Paper>
                                </>
                            )}

                            {/* Test Details */}
                            {selectedTransaction.test && (
                                <>
                                    <Typography variant="h6" sx={{ mb: 1 }}>Test</Typography>
                                    <Paper sx={{ p: 2 }}>
                                        <Typography variant="subtitle2">Script:</Typography>
                                        <pre style={{ margin: '8px 0' }}>
                                            {selectedTransaction.test.script}
                                        </pre>
                                        {selectedTransaction.test.result && (
                                            <>
                                                <Typography variant="subtitle2">Result:</Typography>
                                                <pre style={{ margin: '8px 0' }}>
                                                    {selectedTransaction.test.result}
                                                </pre>
                                            </>
                                        )}
                                    </Paper>
                                </>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDetails}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}; 