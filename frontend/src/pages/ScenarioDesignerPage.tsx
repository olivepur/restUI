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
    Tooltip,
    Chip,
    Collapse,
    List,
    ListItem,
    ListItemText,
    FormControlLabel,
    Switch
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { 
    GeneratedScenario, 
    handlePlayScenario, 
    handleGenerateScenarios
} from '../components/scenarioGenerator';
import { RunScenarios } from '../components/runScenarios';
import { ScenarioEditor } from '../components/ScenarioEditor';
import { testRunner } from '../components/testRunner';
import { sendRequest } from '../utils/api';

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
    useProxy: boolean;
}

interface TestResult {
    type: 'test-log';
    scenarioId: string;
    content: string;
    status: 'passed' | 'failed';
    color: string;
    timestamp: string;
}

interface TestResults {
    [scenarioId: string]: {
        id: string;
        title: string;
        status: 'running' | 'completed' | 'failed';
        steps: TestResult[];
    };
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
                    path: parsed.path || 'https://api.restful-api.dev/objects',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': parsed.headers?.Authorization || 'Bearer ',
                        ...parsed.headers
                    },
                    body: parsed.body || '',
                    lastResponse: parsed.lastResponse,
                    scenarios: parsed.scenarios || [],
                    useProxy: parsed.useProxy ?? true // Default to true for backward compatibility
                };
            } catch (e) {
                console.error('Error parsing saved state:', e);
            }
        }
        return {
            method: 'GET',
            path: 'https://api.restful-api.dev/objects',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '
            },
            body: '',
            lastResponse: undefined,
            scenarios: [],
            useProxy: true
        };
    };

    const [interaction, setInteraction] = useState<Interaction>(loadSavedState);
    const [hasTestedRequest, setHasTestedRequest] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [expandedScenario, setExpandedScenario] = useState<string | false>(false);
    const [editingScenario, setEditingScenario] = useState<GeneratedScenario | null>(null);
    const [testResults, setTestResults] = useState<TestResults>({});
    const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            method: interaction.method,
            path: interaction.path,
            headers: interaction.headers,
            body: interaction.body,
            lastResponse: interaction.lastResponse,
            scenarios: interaction.scenarios || [],
            useProxy: interaction.useProxy
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
            // Generate a unique scenario ID
            const scenarioId = `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Get the current authorization header
            const authHeader = interaction.headers['Authorization'];
            
            testRunner.startScenario(scenario.title, authHeader, scenarioId);
            
            const steps = scenario.content.split('\n')
                .map(line => line.trim())
                .filter(line => line.startsWith('Given') || line.startsWith('When') || line.startsWith('Then'));

            for (const step of steps) {
                await testRunner.runStep(step, { onApiCall: handleApiCall });
            }

            testRunner.endScenario({ onApiCall: handleApiCall });
        } catch (error) {
            console.error('Error playing scenario:', error);
            testRunner.endScenario({ onApiCall: handleApiCall });
        }
    };

    const runTest = async () => {
        try {
            const originalUrl = interaction.path.trim();
            
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

            const response = await sendRequest(originalUrl, {
                method: interaction.method,
                headers: requestHeaders,
                body: interaction.method !== 'GET' ? interaction.body : undefined,
                useProxy: interaction.useProxy
            });

            // Store the response data for scenario generation
            setInteraction(prev => ({
                ...prev,
                lastResponse: response.body
            }));
            setHasTestedRequest(true);

            // Log the API call
            if (onApiCall) {
                onApiCall(
                    interaction.method,
                    originalUrl,
                    {
                        method: interaction.method,
                        headers: requestHeaders,
                        body: interaction.method !== 'GET' ? interaction.body : undefined
                    },
                    {
                        status: response.status,
                        headers: response.headers,
                        body: response.body
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

    // Modify the onApiCall wrapper to organize results by scenario
    const handleApiCall = (method: string, url: string, request: any, response: any) => {
        if (method === 'TEST_LOG' && request?.type === 'test-log') {
            const result = request as TestResult;
            
            // Ensure we have valid content
            if (!result.content) {
                console.warn('Received test log without content:', result);
                return;
            }

            if (result.content.startsWith('Scenario:')) {
                // This is a scenario summary
                const scenarioTitle = result.content.split('(')[0].replace('Scenario:', '').trim();
                setTestResults(prev => ({
                    ...prev,
                    [result.scenarioId]: {
                        id: result.scenarioId,
                        title: scenarioTitle,
                        status: result.status === 'passed' ? 'completed' : 'failed',
                        steps: []
                    }
                }));
            } else {
                // This is a step result
                setTestResults(prev => {
                    if (!result.scenarioId || !prev[result.scenarioId]) {
                        console.warn('Received step result for unknown scenario:', result);
                        return prev;
                    }
                    
                    return {
                        ...prev,
                        [result.scenarioId]: {
                            ...prev[result.scenarioId],
                            steps: [...prev[result.scenarioId].steps, result]
                        }
                    };
                });
            }
        }
        
        // Forward the call to the original onApiCall if provided
        if (onApiCall) {
            onApiCall(method, url, request, response);
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
                        <Stack direction="row" spacing={2} alignItems="center">
                            <FormControl sx={{ minWidth: 120 }}>
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
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={interaction.useProxy}
                                        onChange={(e) => setInteraction(prev => ({ 
                                            ...prev, 
                                            useProxy: e.target.checked 
                                        }))}
                                    />
                                }
                                label="Use Proxy"
                            />
                        </Stack>

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
                                        <Stack 
                                            direction="row" 
                                            spacing={1}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Tooltip title="Run scenario">
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            await handlePlayClick(scenario);
                                                        }}
                                                    >
                                                        <PlayArrowIcon />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Edit scenario">
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditClick(scenario);
                                                        }}
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Delete scenario">
                                                <span>
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
                                                </span>
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

                {Object.entries(testResults).length > 0 && (
                    <Paper sx={{ p: 3, mt: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Test Results
                        </Typography>
                        <Stack spacing={2}>
                            {Object.entries(testResults).map(([scenarioId, scenario]) => (
                                <Paper
                                    key={scenarioId}
                                    sx={{
                                        p: 2,
                                        cursor: 'pointer',
                                        '&:hover': {
                                            bgcolor: 'action.hover'
                                        }
                                    }}
                                    onClick={() => setExpandedScenarioId(
                                        expandedScenarioId === scenarioId ? null : scenarioId
                                    )}
                                >
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Chip
                                            label={scenario.status === 'completed' ? 'Passed' : 'Failed'}
                                            color={scenario.status === 'completed' ? 'success' : 'error'}
                                            size="small"
                                        />
                                        <Typography flex={1}>{scenario.title}</Typography>
                                        <IconButton size="small">
                                            {expandedScenarioId === scenarioId ? 
                                                <KeyboardArrowUpIcon /> : 
                                                <KeyboardArrowDownIcon />
                                            }
                                        </IconButton>
                                    </Stack>
                                    <Collapse in={expandedScenarioId === scenarioId}>
                                        <Box sx={{ mt: 2, pl: 4 }}>
                                            <List dense>
                                                {scenario.steps.map((step, index) => (
                                                    <ListItem
                                                        key={index}
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            py: 1,
                                                            borderBottom: (theme) =>
                                                                index < scenario.steps.length - 1 ?
                                                                `1px solid ${theme.palette.divider}` : 'none'
                                                        }}
                                                    >
                                                        {step.status === 'failed' ?
                                                            <ErrorIcon fontSize="small" color="error" sx={{ mr: 1 }} /> :
                                                            <CheckCircleIcon fontSize="small" color="success" sx={{ mr: 1 }} />
                                                        }
                                                        <ListItemText
                                                            primary={step.content}
                                                            sx={{
                                                                color: step.status === 'failed' ? 'error.main' : 'success.main'
                                                            }}
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Box>
                                    </Collapse>
                                </Paper>
                            ))}
                        </Stack>
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