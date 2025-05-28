import React, { useState } from 'react';
import {
    Box,
    Button,
    Container,
    Paper,
    TextField,
    Typography,
    Alert,
    IconButton,
    Snackbar,
    List,
    ListItem,
    ListItemSecondaryAction,
    Collapse,
    Divider,
    Chip
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import { TestCase, Transaction, RestOperation, TransactionStatus, RequestFileContent } from '../types/TestData';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/testdata';

interface TestDataManagerProps {
    transactions: Transaction[];
    onTransactionsChange: (transactions: Transaction[]) => void;
}

export const TestDataManager: React.FC<TestDataManagerProps> = ({ transactions, onTransactionsChange }) => {
    const [error, setError] = useState<string>('');
    const [copySuccess, setCopySuccess] = useState<boolean>(false);
    const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);

    const extractRequestInfo = (content: string): { operation: RestOperation; path: string; name: string } | null => {
        try {
            const requestData = JSON.parse(content) as RequestFileContent;
            
            // Validate the method is a valid RestOperation
            if (!['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'].includes(requestData.method)) {
                throw new Error('Invalid HTTP method in request file');
            }

            // Extract path from URL
            let path = requestData.url;
            try {
                const url = new URL(requestData.url);
                path = url.pathname + url.search;
            } catch {
                // If URL parsing fails, assume the url is just a path
                path = requestData.url;
            }

            // Generate a name from the path
            const pathParts = path.split('/').filter(Boolean);
            const name = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'unnamed';

            return {
                operation: requestData.method as RestOperation,
                path: path,
                name: name
            };
        } catch (err) {
            console.error('Error parsing request file:', err);
            return null;
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setError('');
            const requestFile = event.target.files?.[0];
            if (!requestFile) return;

            if (!requestFile.type.includes('json')) {
                setError('Only JSON files are allowed');
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                const content = e.target?.result as string;
                try {
                    const formatted = JSON.stringify(JSON.parse(content), null, 4);
                    const requestInfo = extractRequestInfo(formatted);

                    if (!requestInfo) {
                        setError('Failed to extract operation and path from request file');
                        return;
                    }

                    const newTransaction: Transaction = {
                        id: Date.now().toString(),
                        name: requestInfo.name,
                        request: requestFile,
                        response: null,
                        requestContent: formatted,
                        responseContent: '',
                        testCase: null,
                        generatedScript: '',
                        requestPath: requestInfo.path,
                        operation: requestInfo.operation,
                        status: 'PENDING'
                    };

                    onTransactionsChange([...transactions, newTransaction]);
                } catch (err) {
                    setError('Invalid JSON format');
                }
            };
            reader.readAsText(requestFile);
        } catch (error: any) {
            console.error('Error handling file:', error);
            setError(error.message);
        }
    };

    const handleResponseUpload = async (transactionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setError('');
            const responseFile = event.target.files?.[0];
            if (!responseFile) return;

            if (!responseFile.type.includes('json')) {
                setError('Only JSON files are allowed');
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                const content = e.target?.result as string;
                try {
                    const formatted = JSON.stringify(JSON.parse(content), null, 4);
                    
                    const updatedTransactions = transactions.map(t => {
                        if (t.id === transactionId) {
                            const updatedTransaction = {
                                ...t,
                                response: responseFile,
                                responseContent: formatted
                            };

                            // If both files are present, process them
                            if (t.request) {
                                const formData = new FormData();
                                formData.append('request', t.request);
                                formData.append('response', responseFile);

                                axios.post(`${API_BASE_URL}/upload`, formData)
                                    .then(response => {
                                        const newTransactions = transactions.map(ct => 
                                            ct.id === transactionId 
                                                ? { ...ct, testCase: response.data }
                                                : ct
                                        );
                                        onTransactionsChange(newTransactions);
                                    })
                                    .catch(error => {
                                        console.error('Error uploading files:', error);
                                        setError(error.response?.data || 'Error uploading files');
                                    });
                            }

                            return updatedTransaction;
                        }
                        return t;
                    });

                    onTransactionsChange(updatedTransactions);
                } catch (err) {
                    setError('Invalid JSON format');
                }
            };
            reader.readAsText(responseFile);
        } catch (error: any) {
            console.error('Error handling file:', error);
            setError(error.message);
        }
    };

    const handleDeleteTransaction = (id: string) => {
        onTransactionsChange(transactions.filter(t => t.id !== id));
        if (expandedTransaction === id) {
            setExpandedTransaction(null);
        }
    };

    const generateTestScript = async (transactionId: string) => {
        const transaction = transactions.find(t => t.id === transactionId);
        if (!transaction?.testCase) return;

        try {
            setError('');
            const response = await axios.post(`${API_BASE_URL}/generate`, transaction.testCase);
            const updatedTransactions = transactions.map(t => 
                t.id === transactionId 
                    ? { ...t, generatedScript: response.data, status: 'GENERATED' as TransactionStatus }
                    : t
            );
            onTransactionsChange(updatedTransactions);
        } catch (error: any) {
            console.error('Error generating script:', error);
            setError(error.response?.data || 'Error generating script');
        }
    };

    const handleCopyScript = async (script: string) => {
        try {
            await navigator.clipboard.writeText(script);
            setCopySuccess(true);
        } catch (err) {
            console.error('Failed to copy text:', err);
            setError('Failed to copy to clipboard');
        }
    };

    const exportScript = async (transactionId: string) => {
        const transaction = transactions.find(t => t.id === transactionId);
        if (!transaction?.testCase) return;

        try {
            setError('');
            const response = await axios.post(`${API_BASE_URL}/export`, transaction.testCase);
            const blob = new Blob([response.data], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${transaction.name}-test-script.json`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Error exporting script:', error);
            setError(error.response?.data || 'Error exporting script');
        }
    };

    const getStatusColor = (status: TransactionStatus) => {
        return status === 'GENERATED' ? 'success' : 'warning';
    };

    const getOperationColor = (operation: RestOperation) => {
        switch (operation) {
            case 'GET':
                return '#2196f3';
            case 'POST':
                return '#4caf50';
            case 'PATCH':
                return '#ff9800';
            case 'PUT':
                return '#9c27b0';
            case 'DELETE':
                return '#f44336';
            case 'OPTIONS':
                return '#607d8b';
            default:
                return '#757575';
        }
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" component="h1">
                        Test Data Manager
                    </Typography>
                    <input
                        accept="application/json"
                        style={{ display: 'none' }}
                        id="request-file-upload"
                        type="file"
                        onChange={handleFileUpload}
                    />
                    <label htmlFor="request-file-upload">
                        <Button
                            variant="contained"
                            component="span"
                            startIcon={<AddIcon />}
                        >
                            Upload Request
                        </Button>
                    </label>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <List>
                    {transactions.map((transaction) => (
                        <Paper key={transaction.id} sx={{ mb: 2 }}>
                            <ListItem>
                                <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <Typography variant="h6" sx={{ mr: 2 }}>
                                            {transaction.name}
                                        </Typography>
                                        <Chip
                                            label={transaction.operation}
                                            size="small"
                                            sx={{
                                                mr: 1,
                                                backgroundColor: getOperationColor(transaction.operation),
                                                color: 'white'
                                            }}
                                        />
                                        <Chip
                                            label={transaction.status}
                                            color={getStatusColor(transaction.status)}
                                            size="small"
                                        />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Path: {transaction.requestPath}
                                    </Typography>
                                </Box>
                                <ListItemSecondaryAction>
                                    <IconButton
                                        edge="end"
                                        onClick={() => setExpandedTransaction(
                                            expandedTransaction === transaction.id ? null : transaction.id
                                        )}
                                        sx={{ mr: 1 }}
                                    >
                                        {expandedTransaction === transaction.id ? 
                                            <ExpandLessIcon /> : 
                                            <ExpandMoreIcon />
                                        }
                                    </IconButton>
                                    <IconButton
                                        edge="end"
                                        onClick={() => handleDeleteTransaction(transaction.id)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                            <Collapse in={expandedTransaction === transaction.id}>
                                <Box sx={{ p: 2 }}>
                                    <Typography variant="h6" gutterBottom>
                                        Request Content
                                    </Typography>
                                    <TextField
                                        multiline
                                        fullWidth
                                        rows={10}
                                        value={transaction.requestContent}
                                        variant="outlined"
                                        InputProps={{
                                            readOnly: true,
                                        }}
                                        sx={{
                                            mb: 2,
                                            fontFamily: 'monospace',
                                            '& .MuiInputBase-input': {
                                                fontFamily: 'monospace',
                                            },
                                        }}
                                    />

                                    <Typography variant="h6" gutterBottom>
                                        Response File
                                    </Typography>
                                    <Box sx={{ mb: 2 }}>
                                        <input
                                            accept="application/json"
                                            style={{ display: 'none' }}
                                            id={`response-file-${transaction.id}`}
                                            type="file"
                                            onChange={(e) => handleResponseUpload(transaction.id, e)}
                                        />
                                        <label htmlFor={`response-file-${transaction.id}`}>
                                            <Button
                                                variant="contained"
                                                component="span"
                                                color={transaction.response ? "success" : "primary"}
                                            >
                                                {transaction.response ? "Response File Selected" : "Upload Response File"}
                                            </Button>
                                        </label>
                                    </Box>
                                    {transaction.responseContent && (
                                        <TextField
                                            multiline
                                            fullWidth
                                            rows={10}
                                            value={transaction.responseContent}
                                            variant="outlined"
                                            InputProps={{
                                                readOnly: true,
                                            }}
                                            sx={{
                                                mb: 2,
                                                fontFamily: 'monospace',
                                                '& .MuiInputBase-input': {
                                                    fontFamily: 'monospace',
                                                },
                                            }}
                                        />
                                    )}

                                    <Divider sx={{ my: 2 }} />

                                    <Box sx={{ mb: 2 }}>
                                        <Button
                                            variant="contained"
                                            onClick={() => generateTestScript(transaction.id)}
                                            disabled={!transaction.testCase}
                                            sx={{ mr: 1 }}
                                        >
                                            Generate Test Script
                                        </Button>
                                        {transaction.generatedScript && (
                                            <Button
                                                variant="contained"
                                                onClick={() => exportScript(transaction.id)}
                                            >
                                                Export Script
                                            </Button>
                                        )}
                                    </Box>

                                    {transaction.generatedScript && (
                                        <Box sx={{ position: 'relative' }}>
                                            <TextField
                                                multiline
                                                fullWidth
                                                rows={10}
                                                value={transaction.generatedScript}
                                                variant="outlined"
                                                InputProps={{
                                                    readOnly: true,
                                                }}
                                                sx={{
                                                    fontFamily: 'monospace',
                                                    '& .MuiInputBase-input': {
                                                        fontFamily: 'monospace',
                                                    },
                                                }}
                                            />
                                            <IconButton
                                                onClick={() => handleCopyScript(transaction.generatedScript)}
                                                sx={{
                                                    position: 'absolute',
                                                    right: 8,
                                                    top: 8,
                                                    bgcolor: 'background.paper',
                                                    '&:hover': {
                                                        bgcolor: 'action.hover',
                                                    },
                                                }}
                                            >
                                                <ContentCopyIcon />
                                            </IconButton>
                                        </Box>
                                    )}
                                </Box>
                            </Collapse>
                        </Paper>
                    ))}
                </List>
            </Box>

            <Snackbar
                open={copySuccess}
                autoHideDuration={2000}
                onClose={() => setCopySuccess(false)}
                message="Script copied to clipboard!"
            />
        </Container>
    );
}; 