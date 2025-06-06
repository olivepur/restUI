import React from 'react';
import { AppBar, Toolbar, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

interface NavigationBarProps {
    children?: React.ReactNode;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({ children }) => {
    return (
        <AppBar position="static">
            <Toolbar>
                <Typography variant="h6" component={Link} to="/" sx={{ color: 'white', textDecoration: 'none', flexGrow: 1 }}>
                    RestUI
                </Typography>
                {children}
            </Toolbar>
        </AppBar>
    );
}; 