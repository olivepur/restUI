import React, { useEffect, useState, useMemo } from 'react';
import {
    Drawer,
    Box,
    Typography,
    Paper,
    IconButton,
    Divider,
    Chip,
    Tabs,
    Tab
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { SavedTransaction } from '../types';

interface TransactionResultDrawerProps {
    open: boolean;
    onClose: () => void;
    transaction: SavedTransaction | null;
}

// Helper function to extract relevant transaction data
const extractTransactionData = (transaction: SavedTransaction | null) => {
    if (!transaction) return null;
    
    return {
        id: transaction.id,
        transactionId: transaction.transactionId,
        sourceNode: transaction.sourceNode,
        targetNode: transaction.targetNode,
        status: transaction.status,
        timestamp: transaction.timestamp,
        request: transaction.request,
        response: transaction.response,
        test: transaction.test,
        edges: transaction.edges?.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            operation: edge.operation,
            path: edge.path
        })) || [],
        nodes: transaction.nodes?.map(node => ({
            id: node.id,
            label: node.label,
            type: node.type
        })) || []
    };
};

export const TransactionResultDrawer: React.FC<TransactionResultDrawerProps> = ({
    open,
    onClose,
    transaction
}) => {
    const [activeTab, setActiveTab] = useState(0);

    // Memoize the transaction data to only include relevant information
    const memoizedTransaction = useMemo(() => 
        extractTransactionData(transaction),
        [transaction?.id, transaction?.status, transaction?.request, transaction?.response, 
         transaction?.edges?.map(e => `${e.id}:${e.operation}:${e.path}`).join(','),
         transaction?.nodes?.map(n => `${n.id}:${n.label}`).join(',')]
    );

    // Reset activeTab when transaction changes
    useEffect(() => {
        setActiveTab(0);
    }, [memoizedTransaction?.id]);

    // Debug logs
    useEffect(() => {
        console.log('TransactionResultDrawer props:', { 
            open, 
            hasTransaction: !!transaction,
            transaction 
        });
    }, [open, transaction]);

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
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

    if (!memoizedTransaction) {
        return (
            <Drawer
                anchor="right"
                open={open}
                onClose={onClose}
                PaperProps={{
                    sx: { width: '40%', minWidth: 400, maxWidth: 600 }
                }}
            >
                <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                    <Typography variant="body1" color="text.secondary">
                        Loading transaction details...
                    </Typography>
                </Box>
            </Drawer>
        );
    }

    // Get all edges from the transaction
    const edges = memoizedTransaction.edges || [];

    // Ensure activeTab is within bounds
    const validActiveTab = Math.min(activeTab, edges.length - 1);
    if (validActiveTab !== activeTab) {
        setActiveTab(validActiveTab);
    }

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
                        Transaction Sequence
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                        <Chip
                            label={memoizedTransaction.status}
                            color={getStatusColor(memoizedTransaction.status)}
                            size="small"
                        />
                    </Box>
                </Paper>

                {edges.length > 0 && (
                    <>
                        <Tabs
                            value={validActiveTab}
                            onChange={(_, newValue) => setActiveTab(newValue)}
                            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                        >
                            {edges.map((edge, index) => {
                                const sourceNode = memoizedTransaction.nodes.find(n => n.id === edge.source);
                                const targetNode = memoizedTransaction.nodes.find(n => n.id === edge.target);
                                return (
                                    <Tab
                                        key={edge.id}
                                        label={`${sourceNode?.label || edge.source} → ${targetNode?.label || edge.target}`}
                                    />
                                );
                            })}
                        </Tabs>

                        {edges.map((edge, index) => {
                            const sourceNode = memoizedTransaction.nodes.find(n => n.id === edge.source);
                            const targetNode = memoizedTransaction.nodes.find(n => n.id === edge.target);
                            
                            return (
                                <Box
                                    key={edge.id}
                                    role="tabpanel"
                                    hidden={validActiveTab !== index}
                                    sx={{ mt: 2 }}
                                >
                                    {validActiveTab === index && (
                                        <>
                                            {/* Request Details */}
                                            <Typography variant="h6" sx={{ mb: 1 }}>Request</Typography>
                                            <Paper sx={{ p: 2, mb: 3 }}>
                                                <Typography variant="subtitle2">Method:</Typography>
                                                <Typography variant="body1" sx={{ mb: 2 }}>
                                                    {edge.operation || 'GET'}
                                                </Typography>
                                                
                                                <Typography variant="subtitle2">Path:</Typography>
                                                <Typography variant="body1" sx={{ mb: 2 }}>
                                                    {edge.path || ''}
                                                </Typography>
                                                
                                                <Typography variant="subtitle2">Headers:</Typography>
                                                <pre style={{ margin: '8px 0', overflow: 'auto', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                                    {JSON.stringify(memoizedTransaction.request.headers, null, 2)}
                                                </pre>
                                                
                                                {memoizedTransaction.request.body && (
                                                    <>
                                                        <Typography variant="subtitle2">Body:</Typography>
                                                        <pre style={{ margin: '8px 0', overflow: 'auto', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                                            {JSON.stringify(memoizedTransaction.request.body, null, 2)}
                                                        </pre>
                                                    </>
                                                )}
                                            </Paper>

                                            {/* Response Details */}
                                            <Typography variant="h6" sx={{ mb: 1 }}>Response</Typography>
                                            <Paper sx={{ p: 2 }}>
                                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                                    Status: {memoizedTransaction.response?.status || 'Pending'}
                                                </Typography>
                                                {memoizedTransaction.response?.headers && (
                                                    <>
                                                        <Typography variant="subtitle2">Headers:</Typography>
                                                        <pre style={{ margin: '8px 0', overflow: 'auto', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                                            {JSON.stringify(memoizedTransaction.response.headers, null, 2)}
                                                        </pre>
                                                    </>
                                                )}
                                                {memoizedTransaction.response?.body && (
                                                    <>
                                                        <Typography variant="subtitle2">Body:</Typography>
                                                        <pre style={{ margin: '8px 0', overflow: 'auto', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                                            {JSON.stringify(memoizedTransaction.response.body, null, 2)}
                                                        </pre>
                                                    </>
                                                )}
                                            </Paper>
                                        </>
                                    )}
                                </Box>
                            );
                        })}
                    </>
                )}

                {memoizedTransaction.test && (
                    <>
                        <Typography variant="h6" sx={{ mb: 1 }}>Test</Typography>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2">Script:</Typography>
                            <pre style={{ margin: '8px 0', overflow: 'auto', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                {memoizedTransaction.test.script}
                            </pre>
                            {memoizedTransaction.test.result && (
                                <>
                                    <Typography variant="subtitle2">Result:</Typography>
                                    <pre style={{ margin: '8px 0', overflow: 'auto', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                        {memoizedTransaction.test.result}
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