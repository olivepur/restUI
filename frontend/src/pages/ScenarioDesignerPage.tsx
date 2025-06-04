import React, { useState, useEffect } from 'react';
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
    Divider,
    IconButton,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

interface SystemInteraction {
    requirementId: string;
    featureName: string;
    id: string;
    sourceSystem: string;
    targetSystem: string;
    method: string;
    path: string;
    body: string;
    headers: Record<string, string>;
    response: string;
    scenarios: string[];
}

const STORAGE_KEY = 'scenarioDesignerHeaders';

export const ScenarioDesignerPage: React.FC = () => {
    // Load saved headers from localStorage on component mount
    const loadSavedHeaders = (): Record<string, string> => {
        const savedHeaders = localStorage.getItem(STORAGE_KEY);
        let headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer '
        };

        if (savedHeaders) {
            try {
                const parsed = JSON.parse(savedHeaders);
                headers = {
                    ...headers,
                    ...parsed,
                    // Ensure Authorization header exists and starts with Bearer
                    'Authorization': parsed['Authorization']?.startsWith('Bearer ') 
                        ? parsed['Authorization'] 
                        : `Bearer ${parsed['Authorization'] || ''}`
                };
            } catch (e) {
                console.error('Error parsing saved headers:', e);
            }
        }
        return headers;
    };

    const [interaction, setInteraction] = useState<SystemInteraction>({
        requirementId: '',
        featureName: '',
        id: '',
        sourceSystem: '',
        targetSystem: '',
        method: 'GET',
        path: '',
        body: '',
        headers: loadSavedHeaders(),
        response: '',
        scenarios: []
    });

    // Save headers to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(interaction.headers));
    }, [interaction.headers]);

    const [isValidJson, setIsValidJson] = useState(true);
    const [testResponse, setTestResponse] = useState('');
    const [hasTestedRequest, setHasTestedRequest] = useState(false);

    const handleHeaderChange = (key: string, value: string) => {
        let finalValue = value;
        if (key === 'Authorization' && !value.startsWith('Bearer ')) {
            finalValue = value.startsWith('Bearer') ? `Bearer ${value.slice(6)}` : `Bearer ${value}`;
        }
        
        setInteraction(prev => ({
            ...prev,
            headers: {
                ...prev.headers,
                [key]: finalValue
            }
        }));
    };

    const handleRemoveHeader = (keyToRemove: string) => {
        // Prevent removing Authorization header
        if (keyToRemove === 'Authorization') {
            return;
        }

        setInteraction(prev => {
            const newHeaders = { ...prev.headers };
            delete newHeaders[keyToRemove];
            return {
                ...prev,
                headers: newHeaders
            };
        });
    };

    const handleAddHeader = () => {
        handleHeaderChange('New-Header', '');
    };

    const generateScenarios = () => {
        try {
            const responseObj = JSON.parse(interaction.response);
            const scenarios = [
                // Happy Path
                `Scenario: Successful ${interaction.method} request from ${interaction.sourceSystem} to ${interaction.targetSystem}
  Given the ${interaction.sourceSystem} system is ready
  When a ${interaction.method} request is made to "${interaction.path}"
  Then the response status should be 200
  And the response should match the expected format`,

                // Error Path - Not Found
                `Scenario: Not Found ${interaction.method} request from ${interaction.sourceSystem} to ${interaction.targetSystem}
  Given the ${interaction.sourceSystem} system is ready
  When a ${interaction.method} request is made to an invalid path
  Then the response status should be 404
  And the response should contain an error message`,

                // Error Path - Unauthorized
                `Scenario: Unauthorized ${interaction.method} request from ${interaction.sourceSystem} to ${interaction.targetSystem}
  Given the ${interaction.sourceSystem} system is ready
  When a ${interaction.method} request is made without proper authentication
  Then the response status should be 401
  And the response should indicate unauthorized access`,

                // Validation Path
                `Scenario: Invalid request data from ${interaction.sourceSystem} to ${interaction.targetSystem}
  Given the ${interaction.sourceSystem} system is ready
  When a ${interaction.method} request is made with invalid data
  Then the response status should be 400
  And the response should contain validation errors`
            ];

            setInteraction(prev => ({
                ...prev,
                scenarios
            }));
        } catch (error) {
            console.error('Error generating scenarios:', error);
        }
    };

    const runTest = async () => {
        try {
            const originalUrl = interaction.path.trim();
            const url = originalUrl.startsWith('http') 
                ? `http://localhost:8080/api/proxy${originalUrl.replace('https://api.int.group-vehicle-file.com', '')}`
                : `http://localhost:8080${interaction.path.startsWith('/') ? interaction.path : `/${interaction.path}`}`;

            console.log('Making request to:', url);
            console.log('Method:', interaction.method);

            // Prepare headers with defaults
            const headers: Record<string, string> = {
                'Accept': 'application/json',
                ...interaction.headers
            };

            // Remove content-type for GET requests
            if (interaction.method === 'GET' && 'Content-Type' in headers) {
                delete headers['Content-Type'];
            }

            console.log('Headers:', headers);
            console.log('Body:', interaction.method !== 'GET' ? interaction.body : 'No body for GET request');

            const response = await fetch(url, {
                method: interaction.method,
                headers: headers,
                body: interaction.method !== 'GET' ? interaction.body : undefined
            });

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

            console.log('Response:', data);
            setTestResponse(JSON.stringify(data, null, 2));
            setHasTestedRequest(true);
        } catch (error) {
            console.error('Error details:', error);
            let errorMessage = 'Failed to execute test';
            
            if (error instanceof Error) {
                errorMessage = `Error: ${error.message}`;
            }
            
            setTestResponse(JSON.stringify({ 
                error: errorMessage,
                details: 'Check the browser console (F12) for more details',
                possibleSolutions: [
                    'Check if your Bearer token is valid',
                    'Verify the URL is correct and accessible',
                    'Check the browser console for detailed error messages'
                ]
            }, null, 2));
            setHasTestedRequest(false);
        }
    };

    const handleGenerateScenarios = () => {
        if (!hasTestedRequest) {
            setTestResponse(JSON.stringify({ error: 'Please test the request before generating scenarios' }, null, 2));
            return;
        }
        generateScenarios();
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Scenario Designer
                </Typography>

                <Paper sx={{ p: 3, mb: 3 }}>
                    <Stack spacing={3}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <TextField
                                fullWidth
                                label="Requirement ID"
                                value={interaction.requirementId}
                                onChange={(e) => setInteraction(prev => ({ ...prev, requirementId: e.target.value }))}
                            />
                            <TextField
                                fullWidth
                                label="Feature Name"
                                value={interaction.featureName}
                                onChange={(e) => setInteraction(prev => ({ ...prev, featureName: e.target.value }))}
                            />
                        </Stack>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <TextField
                                fullWidth
                                label="ID"
                                value={interaction.id}
                                onChange={(e) => setInteraction(prev => ({ ...prev, id: e.target.value }))}
                            />
                            <TextField
                                fullWidth
                                label="Source System"
                                value={interaction.sourceSystem}
                                onChange={(e) => setInteraction(prev => ({ ...prev, sourceSystem: e.target.value }))}
                            />
                            <TextField
                                fullWidth
                                label="Target System"
                                value={interaction.targetSystem}
                                onChange={(e) => setInteraction(prev => ({ ...prev, targetSystem: e.target.value }))}
                            />
                        </Stack>
                    </Stack>
                </Paper>

                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Request Details
                    </Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <FormControl sx={{ minWidth: { xs: '100%', md: '200px' } }}>
                            <InputLabel>Method</InputLabel>
                            <Select
                                value={interaction.method}
                                label="Method"
                                onChange={(e) => setInteraction(prev => ({ ...prev, method: e.target.value }))}
                            >
                                {HTTP_METHODS.map(method => (
                                    <MenuItem key={method} value={method}>{method}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            label="Path"
                            value={interaction.path}
                            onChange={(e) => setInteraction(prev => ({ ...prev, path: e.target.value }))}
                            placeholder="Enter full URL (https://...) or relative path (/api/...)"
                            helperText="For external APIs, use the complete URL including https://"
                            sx={{ mb: 2 }}
                        />
                    </Stack>

                    <Box sx={{ mt: 3 }}>
                        <Accordion defaultExpanded>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography>Headers</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack spacing={2}>
                                    {/* Authorization header first */}
                                    <Stack 
                                        direction="row" 
                                        spacing={2} 
                                        alignItems="center"
                                    >
                                        <TextField
                                            fullWidth
                                            label="Header Name"
                                            value="Authorization"
                                            disabled
                                        />
                                        <TextField
                                            fullWidth
                                            label="Value"
                                            value={interaction.headers['Authorization']}
                                            onChange={(e) => handleHeaderChange('Authorization', e.target.value)}
                                            placeholder="Bearer your-token-here"
                                        />
                                    </Stack>
                                    
                                    {/* Other headers */}
                                    {Object.entries(interaction.headers)
                                        .filter(([key]) => key !== 'Authorization')
                                        .map(([key, value]) => (
                                        <Stack 
                                            key={key} 
                                            direction="row" 
                                            spacing={2} 
                                            alignItems="center"
                                        >
                                            <TextField
                                                fullWidth
                                                label="Header Name"
                                                value={key}
                                                onChange={(e) => {
                                                    const newValue = interaction.headers[value];
                                                    handleRemoveHeader(key);
                                                    handleHeaderChange(e.target.value, newValue);
                                                }}
                                            />
                                            <TextField
                                                fullWidth
                                                label="Value"
                                                value={value}
                                                onChange={(e) => handleHeaderChange(key, e.target.value)}
                                            />
                                            <IconButton 
                                                onClick={() => handleRemoveHeader(key)}
                                                color="error"
                                                size="small"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Stack>
                                    ))}
                                    <Button
                                        startIcon={<AddIcon />}
                                        onClick={handleAddHeader}
                                        variant="outlined"
                                    >
                                        Add Header
                                    </Button>
                                </Stack>
                            </AccordionDetails>
                        </Accordion>
                    </Box>

                    {interaction.method !== 'GET' && (
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Request Body (JSON)
                            </Typography>
                            <Paper 
                                variant="outlined" 
                                sx={{ 
                                    bgcolor: 'background.default',
                                    border: theme => `1px solid ${!isValidJson ? theme.palette.error.main : theme.palette.divider}`
                                }}
                            >
                                <Editor
                                    value={interaction.body}
                                    onValueChange={code => {
                                        try {
                                            if (code) JSON.parse(code);
                                            setIsValidJson(true);
                                        } catch (e) {
                                            setIsValidJson(false);
                                        }
                                        setInteraction(prev => ({ ...prev, body: code }));
                                    }}
                                    highlight={code => highlight(code, languages.json, 'json')}
                                    padding={15}
                                    style={{
                                        fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                                        fontSize: 12,
                                        minHeight: 100
                                    }}
                                    placeholder="Enter JSON request body"
                                />
                            </Paper>
                        </Box>
                    )}
                </Paper>

                <Paper sx={{ p: 3, mb: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6">
                            Expected Response
                        </Typography>
                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="contained"
                                onClick={runTest}
                                startIcon={<PlayArrowIcon />}
                                color="primary"
                            >
                                Test Request
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
                    <Editor
                        value={interaction.response}
                        onValueChange={code => {
                            try {
                                if (code) JSON.parse(code);
                                setIsValidJson(true);
                            } catch (e) {
                                setIsValidJson(false);
                            }
                            setInteraction(prev => ({ ...prev, response: code }));
                        }}
                        highlight={code => highlight(code, languages.json, 'json')}
                        padding={15}
                        style={{
                            fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                            fontSize: 12,
                            minHeight: 100
                        }}
                        placeholder="Enter expected JSON response"
                    />
                </Paper>

                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Test Scenarios
                    </Typography>
                    {interaction.scenarios.map((scenario, index) => (
                        <Box key={index} sx={{ mb: 2 }}>
                            <pre style={{ 
                                whiteSpace: 'pre-wrap',
                                backgroundColor: '#f5f5f5',
                                padding: '1rem',
                                borderRadius: '4px'
                            }}>
                                {scenario}
                            </pre>
                        </Box>
                    ))}
                </Paper>

                <Paper sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6">
                            Test Results
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={runTest}
                            startIcon={<PlayArrowIcon />}
                        >
                            Run Test
                        </Button>
                    </Stack>
                    {testResponse && (
                        <Box sx={{ mt: 2 }}>
                            <pre style={{ 
                                whiteSpace: 'pre-wrap',
                                backgroundColor: '#f5f5f5',
                                padding: '1rem',
                                borderRadius: '4px'
                            }}>
                                {testResponse}
                            </pre>
                        </Box>
                    )}
                </Paper>
            </Box>
        </Container>
    );
}; 