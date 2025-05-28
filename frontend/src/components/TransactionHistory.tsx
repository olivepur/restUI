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
import { SavedTransaction } from '../types/FlowTypes';
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
        return transaction.selectedElements.edges.map((edge, index, edges) => {
            // Find source and target nodes to get their labels
            const sourceNode = transaction.selectedElements?.nodes.find(n => n.id === edge.source);
            const targetNode = transaction.selectedElements?.nodes.find(n => n.id === edge.target);

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
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 500, color: '#1a1a1a' }}>
                Transaction History
            </Typography>
            <TableContainer component={Paper} sx={tableStyles.tableContainer}>
                <Table sx={tableStyles.table}>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Source</TableCell>
                            <TableCell>Target</TableCell>
                            <TableCell>Method</TableCell>
                            <TableCell>Path</TableCell>
                            <TableCell>Run Status</TableCell>
                            <TableCell>Test Status</TableCell>
                            <TableCell>Timestamp</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {allRows.map((row) => {
                            const transaction = transactions.find(t => t.id === row.transactionId)!;
                            const transactionColor = transactionColorMap.get(row.transactionId);
                            return (
                                <TableRow
                                    key={row.id}
                                    className={row.isFirstRow ? 'transaction-row' : 'continuation-row'}
                                    sx={{
                                        '&:last-child td, &:last-child th': { border: 0 },
                                        bgcolor: alpha(transactionColor || '#2196f3', row.isFirstRow ? 0.04 : 0.02),
                                    }}
                                >
                                    <TableCell>
                                        {row.isFirstRow && (
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Typography variant="body2" sx={tableStyles.idCell}>
                                                    {formatId(row.transactionId)}
                                                </Typography>
                                                <Tooltip title="Copy ID">
                                                    <IconButton 
                                                        size="small"
                                                        onClick={() => handleCopyId(row.transactionId)}
                                                        sx={{
                                                            '&:hover': {
                                                                backgroundColor: alpha(transactionColor || '#2196f3', 0.1),
                                                            }
                                                        }}
                                                    >
                                                        <ContentCopyIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        )}
                                    </TableCell>
                                    <TableCell>{row.source}</TableCell>
                                    <TableCell>{row.target}</TableCell>
                                    <TableCell sx={tableStyles.methodCell}>{row.method}</TableCell>
                                    <TableCell>{row.path}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={row.status || 'Not Run'}
                                            color={getStatusColor(row.status || 'Not Run')}
                                            size="small"
                                            sx={{
                                                fontWeight: 500,
                                                '& .MuiChip-label': {
                                                    px: 2,
                                                }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={transaction.test?.result || 'Not Tested'}
                                            color={getStatusColor(transaction.test?.result || 'Not Tested')}
                                            size="small"
                                            sx={{
                                                fontWeight: 500,
                                                '& .MuiChip-label': {
                                                    px: 2,
                                                }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {row.timestamp && formatTimestamp(row.timestamp)}
                                    </TableCell>
                                    <TableCell>
                                        {row.isFirstRow && (
                                            <Stack 
                                                direction="row" 
                                                spacing={1}
                                                sx={tableStyles.actionButtons}
                                            >
                                                <Tooltip title="View Details">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => onViewTransaction?.(transaction)}
                                                        sx={{
                                                            color: 'primary.main',
                                                            '&:hover': {
                                                                backgroundColor: alpha(transactionColor || '#2196f3', 0.1),
                                                            }
                                                        }}
                                                    >
                                                        <VisibilityIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete Transaction">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDelete(row.transactionId)}
                                                        sx={{
                                                            color: 'error.main',
                                                            '&:hover': {
                                                                backgroundColor: 'error.light',
                                                            }
                                                        }}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {transactions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No transactions recorded yet
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}; 