import React from 'react';
import {
    Box,
    Stack,
    Typography,
    IconButton,
    Divider,
    Paper,
    CircularProgress,
    Tabs,
    Tab
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { StatusBadge } from '../StatusBadge';
import { TransactionDetails, TransactionResponse, TransactionEdge, TestStatus } from '../../types';

interface TransactionDetailsPanelProps {
    transactionDetails: TransactionDetails | null;
    onClose: () => void;
    edges: TransactionEdge[];
}

export const TransactionDetailsPanel: React.FC<TransactionDetailsPanelProps> = ({
    transactionDetails,
    onClose,
    edges
}) => {
    const [activeTab, setActiveTab] = React.useState(0);

    if (!transactionDetails) {
        return null;
    }

    const defaultTestStatus: TestStatus = 'Not Tested';

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '400px',
                height: '100%',
                backgroundColor: 'background.paper',
                boxShadow: 3,
                p: 3,
                overflowY: 'auto'
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Transaction Details</Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </Stack>

            <Divider sx={{ mb: 3 }} />

            {transactionDetails.response?.body?.allResponses && (
                <>
                    <Tabs
                        value={activeTab}
                        onChange={(_, newValue) => setActiveTab(newValue)}
                        sx={{
                            mb: 2,
                            borderBottom: 1,
                            borderColor: 'divider'
                        }}
                    >
                        {transactionDetails.response.body.allResponses.map((response: TransactionResponse, index: number) => {
                            const edge = edges.find(e => e.data?.path.includes(response.path.split('/').pop() || ''));
                            const runStatus = edge?.data?.status || 'open';
                            const testStatus = edge?.data?.testStatus as TestStatus || defaultTestStatus;

                            return (
                                <Tab
                                    key={index}
                                    label={
                                        <Box>
                                            <Typography variant="body2" sx={{ mb: 1 }}>
                                                {`Step ${index + 1}: ${response.path.split('/').pop()}`}
                                            </Typography>
                                            <StatusBadge runStatus={runStatus} testStatus={testStatus} />
                                        </Box>
                                    }
                                />
                            );
                        })}
                    </Tabs>

                    {transactionDetails.response.body.allResponses.map((response: TransactionResponse, index: number) => (
                        <Box
                            key={index}
                            role="tabpanel"
                            hidden={activeTab !== index}
                            sx={{ mt: 2 }}
                        >
                            {activeTab === index && (
                                <Paper sx={{ p: 2 }}>
                                    <Typography variant="subtitle2">Response:</Typography>
                                    <pre style={{ margin: '8px 0', overflow: 'auto' }}>
                                        {JSON.stringify(response.response, null, 2)}
                                    </pre>
                                </Paper>
                            )}
                        </Box>
                    ))}
                </>
            )}

            {transactionDetails.loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <CircularProgress />
                </Box>
            )}
        </Box>
    );
}; 