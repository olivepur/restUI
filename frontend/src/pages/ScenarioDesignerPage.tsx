import React, { useState, useRef, useEffect } from 'react';
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
    IconButton,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { 
    GeneratedScenario, 
    handlePlayScenario, 
    handleGenerateScenarios
} from '../components/scenarioGenerator';
import { RunScenarios } from '../components/runScenarios';
import { ScenarioEditor } from '../components/ScenarioEditor';
import { testRunner } from '../components/testRunner';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const STORAGE_KEY = 'scenarioDesigner';

interface ScenarioDesignerPageProps {
    onApiCall?: (method: string, url: string, request: any, response: any) => void;
}

interface Interaction {
    method: string;
    path: string;
    headers: Record<string, string>;
    body: string;
    lastResponse?: any;
    scenarios?: GeneratedScenario[];
}



export const ScenarioDesignerPage: React.FC<ScenarioDesignerPageProps> = ({ onApiCall }) => {
    // Load saved state from localStorage
    const loadSavedState = (): Interaction => {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                return {
                    method: parsed.method || 'GET',
                    path: parsed.path || '',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': parsed.headers?.Authorization || 'Bearer ',
                        ...parsed.headers
                    },
                    body: parsed.body || '',
                    lastResponse: parsed.lastResponse,
                    scenarios: parsed.scenarios || []
                };
            } catch (e) {
                console.error('Error parsing saved state:', e);
            }
        }
        return {
            method: 'GET',
            path: '',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '
            },
            body: '',
            lastResponse: undefined,
            scenarios: []
        };
    };

    const [interaction, setInteraction] = useState<Interaction>(loadSavedState);
    const [hasTestedRequest, setHasTestedRequest] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [expandedScenario, setExpandedScenario] = useState<string | false>(false);
    const [editingScenario, setEditingScenario] = useState<GeneratedScenario | null>(null);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            method: interaction.method,
            path: interaction.path,
            headers: interaction.headers,
            body: interaction.body,
            lastResponse: interaction.lastResponse,
            scenarios: interaction.scenarios || []
        }));
    }, [interaction]);

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
        // Prevent removing required headers
        if (key === 'Content-Type' || key === 'Authorization') {
            return;
        }
        setInteraction(prev => {
            const newHeaders = { ...prev.headers };
            delete newHeaders[key];
            return { ...prev, headers: newHeaders };
        });
    };

    const handleScenarioChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpandedScenario(isExpanded ? panel : false);
    };

    const handleDeleteScenario = (scenario: GeneratedScenario) => {
        setInteraction(prev => ({
            ...prev,
            scenarios: prev.scenarios?.filter(s => s !== scenario)
        }));
    };

    const handleEditClick = (scenario: GeneratedScenario) => {
        setEditingScenario(scenario);
    };

    const handleSaveScenario = (updatedScenario: GeneratedScenario) => {
        setInteraction(prev => ({
            ...prev,
            scenarios: prev.scenarios?.map(s => 
                s === editingScenario ? updatedScenario : s
            )
        }));
        setEditingScenario(null);
    };

    const onGenerateScenarios = () => {
        const newScenarios = handleGenerateScenarios({
            method: interaction.method,
            path: interaction.path,
            headers: interaction.headers,
            body: interaction.body,
            lastResponse: interaction.lastResponse,
            includeEnvironmentTests: true,
            onApiCall,
            hasTestedRequest
        });

        if (newScenarios) {
            setInteraction(prev => ({
                ...prev,
                scenarios: newScenarios
            }));
        }
    };

    const handlePlayClick = async (scenario: GeneratedScenario) => {
        try {
            // Get the current authorization header
            const authHeader = interaction.headers['Authorization'];
            
            testRunner.startScenario(scenario.title, authHeader);
            
            const steps = scenario.content.split('\n')
                .map(line => line.trim())
                .filter(line => line.startsWith('Given') || line.startsWith('When') || line.startsWith('Then'));

            for (const step of steps) {
                await testRunner.runStep(step, { onApiCall });
            }

            testRunner.endScenario({ onApiCall });
        } catch (error) {
            console.error('Error playing scenario:', error);
            testRunner.endScenario({ onApiCall });
        }
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

            let responseData: any;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                const text = await response.text();
                try {
                    responseData = JSON.parse(text);
                } catch (e) {
                    responseData = { text };
                }
            }

            // Store the response data for scenario generation
            setInteraction(prev => ({
                ...prev,
                lastResponse: responseData
            }));
            setHasTestedRequest(true);

            // Log the API call
            if (onApiCall) {
                onApiCall(
                    interaction.method,
                    requestUrl,
                    request,
                    {
                        status: response.status,
                        headers: Object.fromEntries(response.headers.entries()),
                        body: responseData
                    }
                );
            }
        } catch (error) {
            console.error('Error running test:', error);
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
                        body: { error: 'Failed to run test' }
                    }
                );
            }
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

                <Paper sx={{ p: 3, mb: 3 }}>
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
                                onClick={onGenerateScenarios}
                                startIcon={<AddIcon />}
                                disabled={!hasTestedRequest}
                                color="secondary"
                            >
                                Generate Scenarios
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>

                {interaction.scenarios && interaction.scenarios.length > 0 && (
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Generated Scenarios
                        </Typography>
                        <Box>
                            {interaction.scenarios.map((scenario, index) => (
                                <Accordion
                                    key={index}
                                    expanded={expandedScenario === `scenario-${index}`}
                                    onChange={handleScenarioChange(`scenario-${index}`)}
                                >
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        sx={{
                                            '& .MuiAccordionSummary-content': {
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }
                                        }}
                                    >
                                        <Typography>{scenario.title}</Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Tooltip title="Run scenario">
                                                <IconButton
                                                    size="small"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        await handlePlayClick(scenario);
                                                    }}
                                                >
                                                    <PlayArrowIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Edit scenario">
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditClick(scenario);
                                                    }}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete scenario">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteScenario(scenario);
                                                    }}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Paper
                                            sx={{
                                                p: 2,
                                                bgcolor: 'grey.50',
                                                fontFamily: 'monospace',
                                                whiteSpace: 'pre-wrap'
                                            }}
                                        >
                                            {scenario.content}
                                        </Paper>
                                        <Box sx={{ mt: 2 }}>
                                            <RunScenarios
                                                scenario={scenario}
                                                onRun={handlePlayClick}
                                                disabled={false}
                                            />
                                        </Box>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Box>
                    </Paper>
                )}

                {editingScenario && (
                    <ScenarioEditor
                        open={true}
                        scenario={editingScenario}
                        onClose={() => setEditingScenario(null)}
                        onSave={handleSaveScenario}
                    />
                )}
            </Box>
        </Container>
    );
}; 