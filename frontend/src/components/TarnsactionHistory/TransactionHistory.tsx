import React, { useMemo } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    IconButton,
    Chip,
    Tooltip,
    Stack,
    alpha
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import type { SavedTransaction, SystemNode, TransactionEdge } from '../FlowchartEditor/types';
import { Theme } from '@mui/material/styles';

// Define a color palette for transactions
const transactionColors = [
    '#2196f3', // Blue
    '#4caf50', // Green
    '#ff9800', // Orange
    '#e91e63', // Pink
    '#9c27b0', // Purple
    '#00bcd4', // Cyan
    '#3f51b5', // Indigo
    '#009688', // Teal
];

interface TransactionHistoryProps {
    transactions: SavedTransaction[];
    onViewTransaction?: (transaction: SavedTransaction) => void;
    onDeleteTransaction?: (transactionId: string) => void;
}

interface TransactionPathRow {
    id: string;
    source: string;
    target: string;
    method: string;
    path: string;
    status?: string;
    timestamp?: string;
    isFirstRow: boolean;
    isLastRow: boolean;
    transactionId: string;
}

// Add table styling constants
const tableStyles = {
    tableContainer: {
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #e0e0e0',
    },
    table: {
        minWidth: 650,
        '& .MuiTableCell-head': {
            backgroundColor: '#f5f5f5',
            fontWeight: 'bold',
            color: '#333',
            fontSize: '0.875rem',
            padding: '16px',
            borderBottom: '2px solid #e0e0e0',
        },
        '& .MuiTableCell-body': {
            padding: '16px',
            fontSize: '0.875rem',
        },
        '& .MuiTableRow-root:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
        },
        '& .MuiTableRow-root.transaction-row': {
            borderLeft: '3px solid transparent',
            transition: 'all 0.2s ease',
        },
        '& .MuiTableRow-root.transaction-row:hover': {
            borderLeft: (theme: Theme) => `3px solid ${theme.palette.primary.main}`,
        },
        '& .MuiTableRow-root.continuation-row': {
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            borderLeft: '3px dashed rgba(0, 0, 0, 0.1)',
        },
        '& .MuiTableRow-root.continuation-row:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.06)',
        },
    },
    idCell: {
        fontFamily: 'monospace',
        fontWeight: 500,
    },
    methodCell: {
        fontWeight: 500,
    },
    actionButtons: {
        '& .MuiIconButton-root': {
            transition: 'transform 0.2s ease',
            '&:hover': {
                transform: 'scale(1.1)',
            },
        },
    },
};

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ 
    transactions,
    onViewTransaction,
    onDeleteTransaction
}) => {
    console.log('TransactionHistory render:', {
        transactionCount: transactions.length,
        transactions
    });

    // Create a map of transaction IDs to colors
    const transactionColorMap = useMemo(() => {
        const map = new Map<string, string>();
        transactions.forEach((transaction, index) => {
            map.set(transaction.id, transactionColors[index % transactionColors.length]);
        });
        return map;
    }, [transactions]);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'success':
                return 'success';
            case 'failed':
                return 'error';
            case 'not run':
                return 'default';
            case 'running':
                return 'info';
            case 'not tested':
                return 'default';
            default:
                return 'default';
        }
    };

    const formatTimestamp = (timestamp: string) => {
        try {
            return format(new Date(timestamp), 'MMM dd, yyyy HH:mm:ss');
        } catch (error) {
            return timestamp;
        }
    };

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
    };

    const formatId = (id: string) => {
        return id.slice(0, 8).toUpperCase();
    };

    // Function to create rows for each path in the transaction
    const createTransactionRows = (transaction: SavedTransaction): TransactionPathRow[] => {
        if (!transaction.selectedElements || !transaction.selectedElements.edges) {
            // If no path data, return single row with basic info
            return [{
                id: `${transaction.id}-single`,
                source: transaction.sourceNode,
                target: transaction.targetNode,
                method: transaction.request.method,
                path: transaction.request.path,
                status: transaction.status,
                timestamp: transaction.timestamp,
                isFirstRow: true,
                isLastRow: true,
                transactionId: transaction.id
            }];
        }

        // Create a row for each edge in the path
        return transaction.selectedElements.edges.map((edge: TransactionEdge, index: number, edges: TransactionEdge[]) => {
            // Find source and target nodes to get their labels
            const sourceNode = transaction.selectedElements?.nodes.find((n: SystemNode) => n.id === edge.source);
            const targetNode = transaction.selectedElements?.nodes.find((n: SystemNode) => n.id === edge.target);

            return {
                id: `${transaction.id}-${edge.id}`,
                source: sourceNode?.data.label || edge.source,
                target: targetNode?.data.label || edge.target,
                method: edge.data?.operation || transaction.request.method,
                path: edge.data?.path || transaction.request.path,
                status: edge.data?.status || transaction.status,
                timestamp: edge.data?.timestamp || transaction.timestamp,
                isFirstRow: index === 0,
                isLastRow: index === edges.length - 1,
                transactionId: transaction.id
            };
        });
    };

    // Flatten all transactions into rows
    const allRows = transactions.flatMap(createTransactionRows);

    const handleDelete = (transactionId: string) => {
        if (onDeleteTransaction) {
            onDeleteTransaction(transactionId);
        }
    };

    return (
        <Box>
            {transactions.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                        No transactions found
            </Typography>
                </Paper>
            ) : (
            <TableContainer component={Paper} sx={tableStyles.tableContainer}>
                <Table sx={tableStyles.table}>
                    <TableHead>
                        <TableRow>
                                <TableCell>Transaction ID</TableCell>
                                <TableCell>From → To</TableCell>
                            <TableCell>Method</TableCell>
                            <TableCell>Path</TableCell>
                                <TableCell>Status</TableCell>
                            <TableCell>Timestamp</TableCell>
                                <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                            {transactions.flatMap((transaction) => {
                                // If there are edges in the transaction, show each edge
                                if (transaction.edges && transaction.edges.length > 0) {
                                    return transaction.edges.map((edge, index) => {
                                        const sourceNode = transaction.nodes?.find(n => n.id === edge.source);
                                        const targetNode = transaction.nodes?.find(n => n.id === edge.target);
                                        const isFirstRow = index === 0;

                            return (
                                <TableRow
                                                key={`${transaction.id}-${edge.id}`}
                                    sx={{
                                        '&:last-child td, &:last-child th': { border: 0 },
                                                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                                                    borderLeft: isFirstRow ? '3px solid #2196f3' : 'none',
                                                    bgcolor: isFirstRow ? 'rgba(33, 150, 243, 0.04)' : 'inherit'
                                                }}
                                            >
                                                <TableCell sx={tableStyles.idCell}>
                                                    {isFirstRow ? transaction.id.slice(0, 8) : ''}
                                                </TableCell>
                                                <TableCell>
                                                    {sourceNode?.label} → {targetNode?.label}
                                                </TableCell>
                                                <TableCell sx={tableStyles.methodCell}>
                                                    {edge.operation || transaction.request.method}
                                                </TableCell>
                                                <TableCell>{edge.path || transaction.request.path}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={transaction.status}
                                                        color={
                                                            transaction.status === 'success' ? 'success' :
                                                            transaction.status === 'failed' ? 'error' :
                                                            transaction.status === 'pending' ? 'warning' : 'default'
                                                        }
                                                        size="small"
                                                    />
                                                </TableCell>
                                    <TableCell>
                                                    {format(new Date(transaction.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {isFirstRow && (
                                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                            <Tooltip title="View Details">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => onViewTransaction?.(transaction)}
                                                                >
                                                                    <VisibilityIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                <Tooltip title="Copy ID">
                                                    <IconButton 
                                                        size="small"
                                                                    onClick={() => navigator.clipboard.writeText(transaction.id)}
                                                    >
                                                        <ContentCopyIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                            <Tooltip title="Delete">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => onDeleteTransaction?.(transaction.id)}
                                                                    color="error"
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                            </Stack>
                                        )}
                                    </TableCell>
                                            </TableRow>
                                        );
                                    });
                                } else {
                                    // If no edges, show a single row with transaction info
                                    return (
                                        <TableRow
                                            key={transaction.id}
                                            sx={{
                                                '&:last-child td, &:last-child th': { border: 0 },
                                                '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                                                borderLeft: '3px solid #2196f3',
                                                bgcolor: 'rgba(33, 150, 243, 0.04)'
                                            }}
                                        >
                                            <TableCell sx={tableStyles.idCell}>
                                                {transaction.id.slice(0, 8)}
                                    </TableCell>
                                            <TableCell>
                                                {transaction.sourceNode} → {transaction.targetNode}
                                            </TableCell>
                                            <TableCell sx={tableStyles.methodCell}>
                                                {transaction.request.method}
                                            </TableCell>
                                            <TableCell>{transaction.request.path}</TableCell>
                                    <TableCell>
                                        <Chip 
                                                    label={transaction.status}
                                                    color={
                                                        transaction.status === 'success' ? 'success' :
                                                        transaction.status === 'failed' ? 'error' :
                                                        transaction.status === 'pending' ? 'warning' : 'default'
                                                    }
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                                {format(new Date(transaction.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                                    </TableCell>
                                            <TableCell align="right">
                                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <Tooltip title="View Details">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => onViewTransaction?.(transaction)}
                                                    >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Copy ID">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => navigator.clipboard.writeText(transaction.id)}
                                                        >
                                                            <ContentCopyIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                    <Tooltip title="Delete">
                                                    <IconButton
                                                        size="small"
                                                            onClick={() => onDeleteTransaction?.(transaction.id)}
                                                            color="error"
                                                    >
                                                            <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                    </TableCell>
                                </TableRow>
                            );
                                }
                            })}
                    </TableBody>
                </Table>
            </TableContainer>
            )}
        </Box>
    );
}; 