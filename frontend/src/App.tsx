import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FlowchartEditor } from './components/FlowchartEditor';
import { TransactionsHistoryPage } from './pages/TransactionsHistoryPage';
import { SavedTransaction } from './types/FlowTypes';
import { Snackbar, Alert } from '@mui/material';

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

    // This would typically be managed by Redux or Context
    const handleSaveTransaction = (transaction: SavedTransaction) => {
        try {
            const savedTransactions = JSON.parse(localStorage.getItem('savedTransactions') || '[]');
            savedTransactions.push(transaction);
            localStorage.setItem('savedTransactions', JSON.stringify(savedTransactions));
            showNotification('Transaction saved successfully');
        } catch (error) {
            console.error('Error saving transaction:', error);
            showNotification('Failed to save transaction', 'error');
        }
    };

    return (
        <Router>
            <Routes>
                <Route 
                    path="/" 
                    element={
                        <FlowchartEditor 
                            transactions={[]} // Add your transactions here
                            onRunTransaction={(id) => console.log('Running transaction:', id)}
                            onSaveTransaction={handleSaveTransaction}
                        />
                    } 
                />
                <Route 
                    path="/transactions-history" 
                    element={<TransactionsHistoryPage />} 
                />
            </Routes>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert 
                    onClose={handleCloseSnackbar} 
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Router>
    );
};

export default App;
