import React, { useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { TestDataManager } from '../components/TestDataManager';
import { FlowchartEditor } from '../components/FlowchartEditor';
import { Transaction } from '../types/TestData';
import { SavedTransaction } from '../components/FlowchartEditor/types';
import { v4 as uuidv4 } from 'uuid';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`test-data-tabpanel-${index}`}
            aria-labelledby={`test-data-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const convertToSavedTransaction = (transaction: Transaction): SavedTransaction => {
    return {
        id: transaction.id,
        transactionId: transaction.id,
        sourceNode: 'System A',
        targetNode: 'System B',
        status: transaction.status === 'PENDING' ? 'Not Run' : 'Completed',
        timestamp: new Date().toISOString(),
        request: {
            method: transaction.operation,
            path: transaction.requestPath,
            headers: {
                'Content-Type': 'application/json'
            }
        },
        test: {
            script: transaction.generatedScript || '',
            enabled: true,
            result: 'Not Tested'
        },
        nodes: [
            {
                id: `node-${uuidv4()}`,
                label: 'System A',
                type: 'system',
                position: { x: 100, y: 100 }
            },
            {
                id: `node-${uuidv4()}`,
                label: 'System B',
                type: 'system',
                position: { x: 300, y: 100 }
            }
        ],
        edges: [
            {
                id: `edge-${uuidv4()}`,
                source: 'System A',
                target: 'System B',
                operation: transaction.operation,
                path: transaction.requestPath
            }
        ]
    };
};

export const TestDataPage: React.FC = () => {
    const [currentTab, setCurrentTab] = useState(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    const handleRunTransaction = async (transactionId: string) => {
        const transaction = transactions.find(t => t.id === transactionId);
        if (!transaction) return;

        // Here you would implement the actual transaction execution
        console.log(`Running transaction: ${transactionId}`);
        // You could call your API endpoint here
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={currentTab} onChange={handleTabChange}>
                    <Tab label="Test Data Manager" />
                    <Tab label="System Flow" />
                </Tabs>
            </Box>
            
            <TabPanel value={currentTab} index={0}>
                <TestDataManager 
                    onTransactionsChange={setTransactions}
                    transactions={transactions}
                />
            </TabPanel>
            
            <TabPanel value={currentTab} index={1}>
                <FlowchartEditor
                    transactions={transactions.map(convertToSavedTransaction)}
                    onRunTransaction={handleRunTransaction}
                />
            </TabPanel>
        </Box>
    );
}; 