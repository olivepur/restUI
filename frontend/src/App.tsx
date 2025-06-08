import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { FlowchartEditor } from './components/FlowchartEditor';
import { TransactionsHistoryPage } from './pages/TransactionsHistoryPage';
import { ScenarioDesignerPage } from './pages/ScenarioDesignerPage';
import { ApiDrawer } from './components/common/ApiDrawer';
import type { SavedTransaction } from './components/FlowchartEditor/types';
import { 
    Snackbar, 
    Alert, 
    Box, 
    IconButton, 
    AppBar, 
    Toolbar, 
    Typography,
    Button
} from '@mui/material';
import ListIcon from '@mui/icons-material/List';
import { SettingsPage } from './pages/SettingsPage';
import { Settings as SettingsIcon } from '@mui/icons-material';

interface ApiLog {
    timestamp: string;
    method: string;
    url: string;
    request: any;
    response: any;
}

interface TestLog {
    type: 'test-log';
    scenarioId: string;
    scenarioRunId: string;
    content: string;
    status: 'running' | 'completed' | 'failed';
    color: string;
    timestamp: string;
    details?: {
        suggestion?: string;
        expected?: any;
        actual?: any;
        error?: string;
    };
}

const App: React.FC = () => {
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error' | 'info' | 'warning'
    });
    const [apiDrawerOpen, setApiDrawerOpen] = useState(false);
    const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
    const [testLogs, setTestLogs] = useState<TestLog[]>([]);
    const [selectedTab, setSelectedTab] = useState(0);

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
        // Handle test logs
        if (method === 'TEST_LOG') {
            const testLog: TestLog = {
                type: 'test-log',
                scenarioId: request.scenarioId || 'default',
                scenarioRunId: request.scenarioRunId || 'default',
                timestamp: new Date().toISOString(),
                content: request.content,
                status: request.status,
                color: request.color,
                details: request.details
            };
            setTestLogs(prev => [testLog, ...prev]);
            setApiDrawerOpen(true);
            setSelectedTab(1); // Switch to test results tab
            return;
        }

        // Handle regular API logs
        const newLog: ApiLog = {
            timestamp: new Date().toISOString(),
            method,
            url,
            request,
            response
        };
        setApiLogs(prev => [newLog, ...prev]);
        // Only show drawer for non-GENERATE methods
        if (method !== 'GENERATE') {
            setApiDrawerOpen(true);
            setSelectedTab(0); // Switch to API calls tab
        }
    };

    const handleClearApiLogs = () => {
        setApiLogs([]);
        setTestLogs([]);
        showNotification('All logs cleared', 'info');
    };

    const handleTabChange = (newTab: number) => {
        setSelectedTab(newTab);
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
                <AppBar position="static">
                    <Toolbar>
                        <Typography 
                            variant="h6" 
                            component={Link} 
                            to="/" 
                            sx={{ 
                                color: 'white', 
                                textDecoration: 'none',
                                mr: 4
                            }}
                        >
                            RestUI
                        </Typography>
                        <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
                            <Button
                                component={Link}
                                to="/"
                                color="inherit"
                                sx={{ textTransform: 'none' }}
                            >
                                Flow Chart
                            </Button>
                            <Button
                                component={Link}
                                to="/scenario-designer"
                                color="inherit"
                                sx={{ textTransform: 'none' }}
                            >
                                Scenarios
                            </Button>
                            <Button
                                component={Link}
                                to="/transactions-history"
                                color="inherit"
                                sx={{ textTransform: 'none' }}
                            >
                                History
                            </Button>
                            <Button
                                component={Link}
                                to="/settings"
                                color="inherit"
                                sx={{ textTransform: 'none' }}
                            >
                                Settings
                            </Button>
                        </Box>
                        <IconButton
                            color="inherit"
                            onClick={() => setApiDrawerOpen(!apiDrawerOpen)}
                            sx={{ ml: 2 }}
                        >
                            <ListIcon />
                        </IconButton>
                    </Toolbar>
                </AppBar>
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
                            <Route 
                                path="/settings" 
                                element={<SettingsPage />} 
                            />
                        </Routes>
                    </Box>
                    <ApiDrawer
                        open={apiDrawerOpen}
                        onClose={() => setApiDrawerOpen(false)}
                        onClearAll={handleClearApiLogs}
                        apiLogs={apiLogs}
                        testLogs={testLogs}
                        selectedTab={selectedTab}
                        onTabChange={handleTabChange}
                    />
                </Box>
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={handleCloseSnackbar}
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
