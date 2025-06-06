import React, { useState, useRef } from 'react';
import {
    Box,
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Stack,
    IconButton
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

interface ScenarioDesignerPageProps {
    onApiCall?: (method: string, url: string, request: any, response: any) => void;
}

interface Interaction {
    method: string;
    path: string;
    headers: Record<string, string>;
    body: string;
}

export const ScenarioDesignerPage: React.FC<ScenarioDesignerPageProps> = ({ onApiCall }) => {
    const [interaction, setInteraction] = useState<Interaction>({
        method: 'GET',
        path: '',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer '
        },
        body: ''
    });
    const [hasTestedRequest, setHasTestedRequest] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleHeaderChange = (oldKey: string, newKey: string, value: string) => {
        setInteraction(prev => {
            const newHeaders = { ...prev.headers };
            if (oldKey !== newKey) {
                delete newHeaders[oldKey];
            }
            newHeaders[newKey] = value;
            return { ...prev, headers: newHeaders };
        });
    };

    const handleAddHeader = () => {
        setInteraction(prev => ({
            ...prev,
            headers: { ...prev.headers, '': '' }
        }));
    };

    const handleRemoveHeader = (key: string) => {
        setInteraction(prev => {
            const newHeaders = { ...prev.headers };
            delete newHeaders[key];
            return { ...prev, headers: newHeaders };
        });
    };

    const handleGenerateScenarios = () => {
        if (!hasTestedRequest) {
            if (onApiCall) {
                onApiCall(
                    interaction.method,
                    interaction.path,
                    {
                        method: interaction.method,
                        headers: interaction.headers,
                        body: interaction.method !== 'GET' ? interaction.body : undefined
                    },
                    {
                        status: 400,
                        headers: {},
                        body: { error: 'Please test the request before generating scenarios' }
                    }
                );
            }
            return;
        }
        // Add your scenario generation logic here
    };

    const runTest = async () => {
        try {
            const originalUrl = interaction.path.trim();
            const requestUrl = originalUrl.startsWith('http') 
                ? `http://localhost:8080/api/proxy${originalUrl.replace('https://api.int.group-vehicle-file.com', '')}`
                : `http://localhost:8080${interaction.path.startsWith('/') ? interaction.path : `/${interaction.path}`}`;

            console.log('Making request to:', requestUrl);
            console.log('Method:', interaction.method);

            // Prepare headers with defaults
            const requestHeaders: Record<string, string> = {
                'Accept': 'application/json',
                ...interaction.headers
            };

            // Remove content-type for GET requests
            if (interaction.method === 'GET' && 'Content-Type' in requestHeaders) {
                delete requestHeaders['Content-Type'];
            }

            console.log('Headers:', requestHeaders);
            console.log('Body:', interaction.method !== 'GET' ? interaction.body : 'No body for GET request');

            const request = {
                method: interaction.method,
                headers: requestHeaders,
                body: interaction.method !== 'GET' ? interaction.body : undefined
            };

            const response = await fetch(requestUrl, request);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}\nResponse: ${errorText}`);
            }

            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    data = { text };
                }
            }

            // Log the API call
            if (onApiCall) {
                onApiCall(
                    interaction.method,
                    requestUrl,
                    request,
                    {
                        status: response.status,
                        headers: Object.fromEntries(response.headers.entries()),
                        body: data
                    }
                );
            }

            setHasTestedRequest(true);
        } catch (error) {
            console.error('Error details:', error);
            let errorMessage = 'Failed to execute test';
            
            if (error instanceof Error) {
                errorMessage = `Error: ${error.message}`;
            }
            
            const errorResponse = {
                error: errorMessage,
                details: 'Check the browser console (F12) for more details',
                possibleSolutions: [
                    'Check if your Bearer token is valid',
                    'Verify the URL is correct and accessible',
                    'Check the browser console for detailed error messages'
                ]
            };

            // Log the failed API call
            if (onApiCall) {
                onApiCall(
                    interaction.method,
                    interaction.path,
                    {
                        method: interaction.method,
                        headers: interaction.headers,
                        body: interaction.method !== 'GET' ? interaction.body : undefined
                    },
                    {
                        status: 500,
                        headers: {},
                        body: errorResponse
                    }
                );
            }
            
            setHasTestedRequest(false);
        }
    };

    return (
        <Container maxWidth="lg">
            <Box ref={containerRef} sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Scenario Designer
                </Typography>

                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Request Details
                    </Typography>

                    <Stack spacing={3}>
                        <FormControl>
                            <InputLabel>Method</InputLabel>
                            <Select
                                value={interaction.method}
                                onChange={(e) => setInteraction(prev => ({ ...prev, method: e.target.value }))}
                                label="Method"
                            >
                                {HTTP_METHODS.map(method => (
                                    <MenuItem key={method} value={method}>{method}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Path"
                            value={interaction.path}
                            onChange={(e) => setInteraction(prev => ({ ...prev, path: e.target.value }))}
                            fullWidth
                        />

                        <Box>
                            <Typography variant="subtitle1" gutterBottom>
                                Headers
                            </Typography>
                            {Object.entries(interaction.headers).map(([key, value], index) => (
                                <Stack key={index} direction="row" spacing={2} sx={{ mb: 2 }}>
                                    <TextField
                                        label="Key"
                                        value={key}
                                        onChange={(e) => handleHeaderChange(key, e.target.value, value)}
                                        sx={{ flex: 1 }}
                                    />
                                    <TextField
                                        label="Value"
                                        value={value}
                                        onChange={(e) => handleHeaderChange(key, key, e.target.value)}
                                        sx={{ flex: 2 }}
                                    />
                                    <IconButton onClick={() => handleRemoveHeader(key)} color="error">
                                        <DeleteIcon />
                                    </IconButton>
                                </Stack>
                            ))}
                            <Button
                                startIcon={<AddIcon />}
                                onClick={handleAddHeader}
                                variant="outlined"
                                size="small"
                            >
                                Add Header
                            </Button>
                        </Box>

                        {interaction.method !== 'GET' && (
                            <TextField
                                label="Request Body"
                                value={interaction.body}
                                onChange={(e) => setInteraction(prev => ({ ...prev, body: e.target.value }))}
                                multiline
                                rows={4}
                                fullWidth
                            />
                        )}
                    </Stack>
                </Paper>

                <Paper sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6">
                            Test Controls
                        </Typography>
                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="contained"
                                onClick={runTest}
                                startIcon={<PlayArrowIcon />}
                                color="primary"
                            >
                                Run Test
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleGenerateScenarios}
                                startIcon={<AddIcon />}
                                disabled={!hasTestedRequest}
                                color="secondary"
                            >
                                Generate Scenarios
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>
            </Box>
        </Container>
    );
}; 