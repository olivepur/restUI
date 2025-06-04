import React from 'react';
import { AppBar, Toolbar, Button, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import ApiIcon from '@mui/icons-material/Api';
import HistoryIcon from '@mui/icons-material/History';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

export const NavigationBar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <AppBar position="static" color="default" elevation={1}>
            <Toolbar>
                <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
                    <Button
                        color={isActive('/') ? 'primary' : 'inherit'}
                        startIcon={<AccountTreeIcon />}
                        onClick={() => navigate('/')}
                        variant={isActive('/') ? 'contained' : 'text'}
                    >
                        Flowchart
                    </Button>
                    <Button
                        color={isActive('/scenario-designer') ? 'primary' : 'inherit'}
                        startIcon={<ApiIcon />}
                        onClick={() => navigate('/scenario-designer')}
                        variant={isActive('/scenario-designer') ? 'contained' : 'text'}
                    >
                        Scenario Designer
                    </Button>
                    <Button
                        color={isActive('/transactions-history') ? 'primary' : 'inherit'}
                        startIcon={<HistoryIcon />}
                        onClick={() => navigate('/transactions-history')}
                        variant={isActive('/transactions-history') ? 'contained' : 'text'}
                    >
                        History
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
}; 