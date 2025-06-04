import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FlowchartEditor } from './components/FlowchartEditor';
import { TransactionsHistoryPage } from './pages/TransactionsHistoryPage';
import { ScenarioDesignerPage } from './pages/ScenarioDesignerPage';
import { NavigationBar } from './components/common/NavigationBar';
import type { SavedTransaction } from './components/FlowchartEditor/types';
import { Snackbar, Alert, Box } from '@mui/material';

const App: React.FC = () => {
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error' | 'info' | 'warning'
    });

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
                <NavigationBar />
                <Box sx={{ flexGrow: 1 }}>
                    <Routes>
                        <Route 
                            path="/" 
                            element={
                                <FlowchartEditor 
                                    transactions={[]}
                                    onRunTransaction={() => {}}
                                    onSaveTransaction={handleSaveTransaction}
                                />
                            } 
                        />
                        <Route 
                            path="/transactions-history" 
                            element={<TransactionsHistoryPage />} 
                        />
                        <Route 
                            path="/scenario-designer" 
                            element={<ScenarioDesignerPage />} 
                        />
                    </Routes>
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
