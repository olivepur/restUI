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
    Tabs,
    Tab
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

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
    maxHeight: '200px',
}));

export const ApiDrawer: React.FC<ApiDrawerProps> = ({ open, onClose, apiLogs }) => {
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
                width: 400,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: 400,
                    boxSizing: 'border-box',
                },
            }}
        >
            <DrawerHeader>
                <Typography variant="h6" component="div">
                    API Logs
                </Typography>
                <IconButton onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DrawerHeader>
            <List>
                {apiLogs.map((log, index) => (
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
                                        {log.test && (
                                            <>
                                                <Typography variant="subtitle2" sx={{ mt: 1 }}>Test:</Typography>
                                                <Box sx={{ mb: 1 }}>
                                                    <Typography variant="body2">Script:</Typography>
                                                    <CodeBlock>
                                                        <pre style={{ margin: 0 }}>
                                                            {log.test.script}
                                                        </pre>
                                                    </CodeBlock>
                                                </Box>
                                                {log.test.result && (
                                                    <Box>
                                                        <Typography variant="body2">Result:</Typography>
                                                        <CodeBlock>
                                                            <pre style={{ margin: 0 }}>
                                                                {log.test.result}
                                                            </pre>
                                                        </CodeBlock>
                                                    </Box>
                                                )}
                                            </>
                                        )}
                                    </Box>
                                }
                            />
                        </ListItem>
                        <Divider />
                    </React.Fragment>
                ))}
            </List>
        </Drawer>
    );
}; 