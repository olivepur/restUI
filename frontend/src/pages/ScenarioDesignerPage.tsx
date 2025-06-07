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
    Switch,
    CircularProgress
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
import SaveIcon from '@mui/icons-material/Save';
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

interface TestResult {
    type: 'test-log';
    scenarioId: string;      // References the GeneratedScenario.id
    scenarioRunId: string;   // Unique ID for this specific test run
    content: string;
    status: 'passed' | 'failed';
    color: string;
    timestamp: string;
    details?: {
        suggestion?: string;
        expected?: any;
        actual?: any;
        error?: string;
    };
}

interface TestResults {
    [scenarioRunId: string]: {
        id: string;           // scenarioRunId
        scenarioId: string;   // References the GeneratedScenario.id
        title: string;
        status: 'running' | 'completed' | 'failed';
        steps: TestResult[];
        startTime: string;
        endTime?: string;
    };
}

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

interface SavedState {
    [scenarioId: string]: {
        lastSavedAt?: string;
        lastRunId?: string;
    };
}

const getScenarioStatus = (scenarioId: string, testResults: TestResults) => {
    // Get all runs for this scenario
    const scenarioRuns = Object.values(testResults).filter(run => run.scenarioId === scenarioId);
    
    if (scenarioRuns.length === 0) {
        return 'none';  // No runs yet
    }
    
    // Check if any run is currently running
    const hasRunning = scenarioRuns.some(run => run.status === 'running');
    if (hasRunning) {
        return 'running';
    }
    
    // Check if any run has failed
    const hasFailed = scenarioRuns.some(run => run.status === 'failed');
    if (hasFailed) {
        return 'failed';
    }
    
    // If we get here, all runs must be completed successfully
    return 'success';
};

const prepareScenarioData = (scenario: GeneratedScenario, testResults: TestResults) => {
    // Get all runs for this scenario
    const scenarioRuns = Object.values(testResults)
        .filter(run => run.scenarioId === scenario.id)
        .map(run => ({
            id: run.id,
            status: run.status,
            startTime: run.startTime,
            endTime: run.endTime,
            steps: run.steps.map(step => ({
                content: step.content,
                status: step.status,
                results: {
                    expected: step.details?.expected,
                    actual: step.details?.actual,
                    error: step.details?.error,
                    suggestion: step.details?.suggestion
                }
            }))
        }));

    return {
        scenario: {
            id: scenario.id,
            title: scenario.title,
            content: scenario.content,
            created_at: new Date().toISOString()
        },
        runs: scenarioRuns
    };
};

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
    const [savedState, setSavedState] = useState<SavedState>({});

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

    // Helper to check if scenario has unsaved changes
    const hasUnsavedChanges = (scenario: GeneratedScenario) => {
        const state = savedState[scenario.id];
        if (!state?.lastSavedAt) {
            return true; // Never saved
        }

        // Get the latest run for this scenario
        const latestRun = Object.values(testResults)
            .filter(run => run.scenarioId === scenario.id)
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];

        // If there's a new run that hasn't been saved
        if (latestRun && (!state.lastRunId || state.lastRunId !== latestRun.id)) {
            return true;
        }

        return false;
    };

    const handleSaveScenario = (scenario: GeneratedScenario) => {
        const data = prepareScenarioData(scenario, testResults);
        console.log('Scenario data to be saved:', data);

        // Get the latest run ID for this scenario
        const latestRun = Object.values(testResults)
            .filter(run => run.scenarioId === scenario.id)
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];

        // Update saved state
        setSavedState(prev => ({
            ...prev,
            [scenario.id]: {
                lastSavedAt: new Date().toISOString(),
                lastRunId: latestRun?.id
            }
        }));
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
            
            // Mark all new scenarios as unsaved
            const newSavedState = { ...savedState };
            newScenarios.forEach(scenario => {
                if (!newSavedState[scenario.id]) {
                    newSavedState[scenario.id] = {};
                }
            });
            setSavedState(newSavedState);
        }
    };

    const handlePlayClick = async (scenario: GeneratedScenario) => {
        try {
            // Generate a unique run ID for this test execution
            const scenarioRunId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Get the current authorization header
            const authHeader = interaction.headers['Authorization'];
            
            // Start scenario with current proxy setting
            testRunner.startScenario(scenario.title, authHeader, {
                scenarioId: scenario.id,
                scenarioRunId: scenarioRunId
            }, interaction.useProxy);
            
            const steps = scenario.content.split('\n')
                .map(line => line.trim())
                .filter(line => line.startsWith('Given') || line.startsWith('When') || line.startsWith('Then'));

            // Initialize the test result structure
            setTestResults(prev => ({
                ...prev,
                [scenarioRunId]: {
                    id: scenarioRunId,
                    scenarioId: scenario.id,
                    title: scenario.title,
                    status: 'running',
                    steps: [],
                    startTime: new Date().toISOString()
                }
            }));

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

            // Store the complete response data for scenario generation
            setInteraction(prev => ({
                ...prev,
                lastResponse: {
                    status: response.status,
                    headers: response.headers,
                    body: response.body,
                    requestUrl: originalUrl
                }
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

            setTestResults(prev => {
                const currentScenario = prev[result.scenarioRunId] || {
                    id: result.scenarioRunId,
                    title: '',
                    status: 'running',
                    steps: []
                };

                if (result.content.startsWith('Scenario:')) {
                    // This is a scenario summary
                    const scenarioTitle = result.content.split('(')[0].replace('Scenario:', '').trim();
                    return {
                        ...prev,
                        [result.scenarioRunId]: {
                            ...currentScenario,
                            title: scenarioTitle,
                            status: result.status === 'passed' ? 'completed' : 'failed'
                        }
                    };
                } else {
                    // This is a step result
                    const existingStepIndex = currentScenario.steps.findIndex(
                        step => step.content === result.content
                    );

                    const updatedSteps = existingStepIndex >= 0
                        ? currentScenario.steps.map((step, index) =>
                            index === existingStepIndex ? result : step
                          )
                        : [...currentScenario.steps, result];

                    return {
                        ...prev,
                        [result.scenarioRunId]: {
                            ...currentScenario,
                            steps: updatedSteps
                        }
                    };
                }
            });
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
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            {/* Render status icon */}
                                            {getScenarioStatus(scenario.id, testResults) === 'success' && (
                                                <CheckCircleIcon color="success" />
                                            )}
                                            {getScenarioStatus(scenario.id, testResults) === 'failed' && (
                                                <ErrorIcon color="error" />
                                            )}
                                            {getScenarioStatus(scenario.id, testResults) === 'running' && (
                                                <CircularProgress size={20} />
                                            )}
                                            <Stack direction="column" spacing={0.5}>
                                                <Typography>{scenario.title}</Typography>
                                                <Typography 
                                                    variant="caption" 
                                                    sx={{ color: 'text.secondary' }}
                                                >
                                                    ID: {scenario.id}
                                                </Typography>
                                            </Stack>
                                        </Stack>
                                        <Stack 
                                            direction="row" 
                                            spacing={1}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Tooltip title="Save scenario">
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSaveScenario(scenario);
                                                        }}
                                                        color={hasUnsavedChanges(scenario) ? "primary" : "default"}
                                                        sx={{
                                                            ...(hasUnsavedChanges(scenario) && {
                                                                backgroundColor: 'action.hover'
                                                            })
                                                        }}
                                                    >
                                                        <SaveIcon />
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