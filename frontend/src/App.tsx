import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FlowchartEditor } from './components/FlowchartEditor';
import { TransactionsHistoryPage } from './pages/TransactionsHistoryPage';
import { ScenarioDesignerPage } from './pages/ScenarioDesignerPage';
import { NavigationBar } from './components/common/NavigationBar';
import { ApiDrawer } from './components/common/ApiDrawer';
import type { SavedTransaction } from './components/FlowchartEditor/types';
import { Snackbar, Alert, Box, IconButton } from '@mui/material';
import ListIcon from '@mui/icons-material/List';

interface ApiLog {
    timestamp: string;
    method: string;
    url: string;
    request: any;
    response: any;
    test: any;
}

const App: React.FC = () => {
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error' | 'info' | 'warning'
    });
    const [apiDrawerOpen, setApiDrawerOpen] = useState(false);
    const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    };

    const logApiCall = (method: string, url: string, request: any, response: any) => {
        const newLog: ApiLog = {
            timestamp: new Date().toISOString(),
            method,
            url,
            request,
            response,
            test: response.test
        };
        setApiLogs(prev => [newLog, ...prev]);
        // Automatically show the drawer when a new API call is logged
        setApiDrawerOpen(true);
    };

    const handleSaveTransaction = async (transaction: SavedTransaction) => {
        try {
            console.log('Saving transaction:', transaction);
            const savedTransactions = JSON.parse(localStorage.getItem('savedTransactions') || '[]');
            savedTransactions.push(transaction);
            localStorage.setItem('savedTransactions', JSON.stringify(savedTransactions));
            
            // Dispatch a custom event for same-window updates
            window.dispatchEvent(new CustomEvent('localStorageUpdated', {
                detail: { key: 'savedTransactions' }
            }));
            
            showNotification('Transaction saved successfully');
        } catch (error) {
            console.error('Error saving transaction:', error);
            showNotification('Failed to save transaction', 'error');
        }
    };

    return (
        <Router>
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <NavigationBar>
                    <IconButton
                        color="inherit"
                        onClick={() => setApiDrawerOpen(!apiDrawerOpen)}
                        sx={{ ml: 2 }}
                    >
                        <ListIcon />
                    </IconButton>
                </NavigationBar>
                <Box sx={{ flexGrow: 1, display: 'flex' }}>
                    <Box sx={{ flexGrow: 1 }}>
                        <Routes>
                            <Route 
                                path="/" 
                                element={
                                    <FlowchartEditor 
                                        transactions={[]}
                                        onRunTransaction={() => {}}
                                        onSaveTransaction={handleSaveTransaction}
                                        onApiCall={logApiCall}
                                    />
                                } 
                            />
                            <Route 
                                path="/transactions-history" 
                                element={<TransactionsHistoryPage />} 
                            />
                            <Route 
                                path="/scenario-designer" 
                                element={<ScenarioDesignerPage onApiCall={logApiCall} />} 
                            />
                        </Routes>
                    </Box>
                    <ApiDrawer
                        open={apiDrawerOpen}
                        onClose={() => setApiDrawerOpen(false)}
                        apiLogs={apiLogs}
                    />
                </Box>
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={handleCloseSnackbar}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </Router>
    );
};

export default App;
