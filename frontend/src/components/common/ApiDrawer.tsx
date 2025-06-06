import React from 'react';
import {
    Drawer,
    Typography,
    Box,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Divider,
    Paper,
    styled,
    Chip,
    Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

interface ApiLog {
    timestamp: string;
    method: string;
    url: string;
    request: any;
    response: any;
    test?: {
        script: string;
        enabled: boolean;
        result?: string;
    };
}

interface ApiDrawerProps {
    open: boolean;
    onClose: () => void;
    onClearAll: () => void;
    apiLogs: ApiLog[];
}

const DrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    justifyContent: 'space-between',
    borderBottom: `1px solid ${theme.palette.divider}`,
}));

const CodeBlock = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(2),
    margin: theme.spacing(1),
    backgroundColor: theme.palette.grey[100],
    fontFamily: 'monospace',
    overflow: 'auto',
    maxHeight: '400px',
}));

export const ApiDrawer: React.FC<ApiDrawerProps> = ({ open, onClose, onClearAll, apiLogs }) => {
    const getStatusColor = (status: number) => {
        if (status >= 200 && status < 300) return 'success';
        if (status >= 400) return 'error';
        if (status >= 300) return 'warning';
        return 'default';
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            variant="persistent"
            sx={{
                width: 600,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: 600,
                    boxSizing: 'border-box',
                },
            }}
        >
            <DrawerHeader>
                <Typography variant="h6" component="div">
                    API Logs
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {apiLogs.length > 0 && (
                        <Tooltip title="Clear all logs">
                            <IconButton onClick={onClearAll} color="error" size="small">
                                <DeleteSweepIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DrawerHeader>
            <List>
                {apiLogs.length === 0 ? (
                    <ListItem>
                        <ListItemText
                            primary={
                                <Typography color="textSecondary" align="center">
                                    No API logs yet
                                </Typography>
                            }
                        />
                    </ListItem>
                ) : (
                    apiLogs.map((log, index) => (
                        <React.Fragment key={index}>
                            <ListItem>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography color="primary" fontWeight="bold">
                                                {log.method} {log.url}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {log.timestamp}
                                            </Typography>
                                        </Box>
                                    }
                                    secondary={
                                        <Box>
                                            {log.method !== 'GENERATE' && (
                                                <>
                                                    <Typography variant="subtitle2" sx={{ mt: 1 }}>Request:</Typography>
                                                    <CodeBlock>
                                                        <pre style={{ margin: 0 }}>
                                                            {JSON.stringify(log.request, null, 2)}
                                                        </pre>
                                                    </CodeBlock>
                                                    <Typography variant="subtitle2" sx={{ mt: 1 }}>Response:</Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                        <Typography variant="body2">Status:</Typography>
                                                        <Chip
                                                            label={log.response.status}
                                                            color={getStatusColor(log.response.status)}
                                                            size="small"
                                                        />
                                                    </Box>
                                                    <CodeBlock>
                                                        <pre style={{ margin: 0 }}>
                                                            {JSON.stringify(log.response, null, 2)}
                                                        </pre>
                                                    </CodeBlock>
                                                </>
                                            )}
                                        </Box>
                                    }
                                />
                            </ListItem>
                            <Divider />
                        </React.Fragment>
                    ))
                )}
            </List>
        </Drawer>
    );
}; 