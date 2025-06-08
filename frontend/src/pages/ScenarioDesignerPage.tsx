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
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    LinearProgress,
    Menu,
    ListItemIcon
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
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { 
    GeneratedScenario, 
    handlePlayScenario, 
    handleGenerateScenarios
} from '../components/Scenario/ScenarioGenerator';
import { RunScenarios } from '../components/ScenarioRunner/runScenarios';
import { ScenarioEditor } from '../components/Scenario/ScenarioEditor';
import { testRunner } from '../components/ScenarioRunner/testRunner';
import { sendRequest } from '../utils/api';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useFavoritesStore, FavoriteRequest } from '../stores/favoritesStore';
import { useTheme } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const STORAGE_KEY = 'scenarioDesigner';

export interface TestResult {
    type: 'test-log';
    scenarioId: string;      // References the GeneratedScenario.id
    scenarioRunId: string;   // Unique ID for this specific test run
    content: string;
    status: 'running' | 'passed' | 'failed' | 'unimplemented';
    color: string;
    timestamp: string;
    details?: {
        suggestion?: string;
        expected?: any;
        actual?: any;
        error?: string;
        isUnimplemented?: boolean;
        actualValue?: any;    // For displaying actual values in test results
        expectedValue?: any;  // For displaying expected values in test results
    };
}

export interface TestResults {
    [scenarioRunId: string]: {
        id: string;           // scenarioRunId
        scenarioId: string;   // References the GeneratedScenario.id
        title: string;
        status: 'running' | 'passed' | 'failed' | 'unimplemented';
        steps: TestResult[];
        startTime: string;
        endTime?: string;
    };
}

interface ScenarioGroup {
    url: string;
    method: string;
    scenarios: GeneratedScenario[];
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
    scenarioGroups: ScenarioGroup[];
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
    // Parse steps from content
    const steps = scenario.content.split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('Given') || line.startsWith('When') || line.startsWith('Then'));

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
            steps: steps,  // Array of step strings
            created_at: new Date().toISOString()
        },
        runs: scenarioRuns
    };
};

interface SortableScenarioProps {
    scenario: GeneratedScenario;
    sequenceNumber: number;
    isExpanded: boolean;
    onAccordionChange: (expanded: boolean) => void;
    onEdit: () => void;
    onDelete: () => void;
    onRun: (scenario: GeneratedScenario) => Promise<void>;
    testResults: TestResults;
    onClearRuns: (scenarioId: string) => void;
}

const SortableScenario: React.FC<SortableScenarioProps> = ({
    scenario,
    sequenceNumber,
    isExpanded,
    onAccordionChange,
    onEdit,
    onDelete,
    onRun,
    testResults,
    onClearRuns
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: scenario.id });

    // Calculate progress stats for the scenario
    const scenarioRuns = Object.values(testResults).filter(run => run.scenarioId === scenario.id);
    const latestRun = scenarioRuns[scenarioRuns.length - 1];
    
    let status = 'Not Run';
    let passedSteps = 0;
    let failedSteps = 0;
    let unimplementedSteps = 0;
    let runningSteps = 0;
    let totalSteps = 0;
    
    if (latestRun) {
        totalSteps = latestRun.steps.length;
        passedSteps = latestRun.steps.filter(step => step.status === 'passed').length;
        failedSteps = latestRun.steps.filter(step => step.status === 'failed').length;
        unimplementedSteps = latestRun.steps.filter(step => step.status === 'unimplemented').length;
        runningSteps = latestRun.steps.filter(step => step.status === 'running').length;
        
        if (latestRun.status === 'running') {
            status = 'Running';
        } else {
            status = failedSteps > 0 ? 'Failed' : passedSteps === totalSteps ? 'Passed' : 'Incomplete';
        }
    }

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    };

    const handleAccordionClick = (event: React.SyntheticEvent, expanded: boolean) => {
        // Don't trigger accordion if clicking buttons or drag handle
        if ((event.target as HTMLElement).closest('.action-buttons, .drag-handle')) {
            event.stopPropagation();
            return;
        }
        onAccordionChange(expanded);
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Accordion
                expanded={isExpanded}
                onChange={handleAccordionClick}
                sx={{
                    '&:hover .drag-handle': {
                        opacity: 1
                    }
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                        '& .MuiAccordionSummary-content': {
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%'
                        }
                    }}
                >
                    <Stack direction="column" spacing={1} sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Box
                                {...attributes}
                                {...listeners}
                                className="drag-handle"
                                onClick={(e) => e.stopPropagation()}
                                sx={{
                                    cursor: 'grab',
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    '&:hover': {
                                        opacity: 1
                                    }
                                }}
                            >
                                <DragIndicatorIcon />
                            </Box>
                            <Typography
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={{
                                        bgcolor: 'primary.main',
                                        color: 'primary.contrastText',
                                        borderRadius: '50%',
                                        width: 24,
                                        height: 24,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.875rem',
                                        fontWeight: 'medium'
                                    }}
                                >
                                    {sequenceNumber}
                                </Box>
                                {scenario.title}
                            </Typography>
                            <Stack 
                                direction="row" 
                                spacing={1} 
                                className="action-buttons"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Tooltip title="Run Scenario">
                                    <IconButton size="small" onClick={() => onRun(scenario)}>
                                        <PlayArrowIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit">
                                    <IconButton size="small" onClick={onEdit}>
                                        <EditIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                    <IconButton size="small" onClick={onDelete}>
                                        <DeleteIcon />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </Stack>
                        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ 
                                flex: 1, 
                                height: 8, 
                                borderRadius: 4, 
                                bgcolor: 'grey.200',
                                display: 'flex',
                                overflow: 'hidden'
                            }}>
                                {totalSteps > 0 && (
                                    <>
                                        {passedSteps > 0 && (
                                            <Box 
                                                sx={{ 
                                                    width: `${(passedSteps / totalSteps) * 100}%`,
                                                    bgcolor: 'success.main',
                                                    height: '100%'
                                                }} 
                                            />
                                        )}
                                        {failedSteps > 0 && (
                                            <Box 
                                                sx={{ 
                                                    width: `${(failedSteps / totalSteps) * 100}%`,
                                                    bgcolor: 'error.main',
                                                    height: '100%'
                                                }} 
                                            />
                                        )}
                                        {unimplementedSteps > 0 && (
                                            <Box 
                                                sx={{ 
                                                    width: `${(unimplementedSteps / totalSteps) * 100}%`,
                                                    bgcolor: 'warning.main',
                                                    height: '100%'
                                                }} 
                                            />
                                        )}
                                        {runningSteps > 0 && (
                                            <Box 
                                                sx={{ 
                                                    width: `${(runningSteps / totalSteps) * 100}%`,
                                                    bgcolor: 'primary.main',
                                                    height: '100%'
                                                }} 
                                            />
                                        )}
                                    </>
                                )}
                            </Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="caption" sx={{ minWidth: 60 }}>
                                    {status}
                                </Typography>
                                {totalSteps > 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                        ({passedSteps}/{totalSteps})
                                    </Typography>
                                )}
                            </Stack>
                        </Box>
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
                            onRun={async (s) => onRun(s)}
                            disabled={false}
                            testResults={testResults}
                            onClearRuns={() => onClearRuns(scenario.id)}
                        />
                    </Box>
                </AccordionDetails>
            </Accordion>
        </div>
    );
};

export const ScenarioDesignerPage: React.FC<ScenarioDesignerPageProps> = ({ onApiCall }) => {
    // Load saved state from localStorage
    const loadSavedState = (): Interaction => {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                // Convert old format to new format if needed
                const scenarioGroups = parsed.scenarios 
                    ? [{ url: parsed.path, scenarios: parsed.scenarios }]
                    : parsed.scenarioGroups || [];
                    
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
                    scenarioGroups,
                    useProxy: parsed.useProxy ?? true
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
            scenarioGroups: [],
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
    const [favoriteMenuAnchor, setFavoriteMenuAnchor] = useState<null | HTMLElement>(null);
    const [saveFavoriteDialogOpen, setSaveFavoriteDialogOpen] = useState(false);
    const [favoriteName, setFavoriteName] = useState('');
    const { favorites, addFavorite, removeFavorite } = useFavoritesStore();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Save state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            method: interaction.method,
            path: interaction.path,
            headers: interaction.headers,
            body: interaction.body,
            lastResponse: interaction.lastResponse,
            scenarioGroups: interaction.scenarioGroups.map(g => ({
                url: g.url,
                scenarios: g.scenarios.map(s => s.id)
            })),
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

    const handleScenarioChange = (scenarioId: string) => {
        setExpandedScenario(current => current === scenarioId ? false : scenarioId);
    };

    const handleDeleteScenario = (scenario: GeneratedScenario, url: string) => {
        setInteraction(prev => ({
            ...prev,
            scenarioGroups: prev.scenarioGroups.map(group => 
                group.url === url
                    ? { ...group, scenarios: group.scenarios.filter(s => s !== scenario) }
                    : group
            ).filter(group => group.scenarios.length > 0) // Remove empty groups
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

        // Update the scenario in the interaction.scenarios array
        setInteraction(prev => ({
            ...prev,
            scenarioGroups: prev.scenarioGroups.map(group => 
                group.url === prev.path
                    ? { ...group, scenarios: group.scenarios.map(s => 
                        s.id === scenario.id ? scenario : s
                    ) }
                    : group
            )
        }));

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
            setInteraction(prev => {
                const existingGroupIndex = prev.scenarioGroups.findIndex(g => 
                    g.url === prev.path && g.method === prev.method
                );
                const updatedGroups = [...prev.scenarioGroups];

                if (existingGroupIndex >= 0) {
                    // Add to existing group
                    updatedGroups[existingGroupIndex] = {
                        ...updatedGroups[existingGroupIndex],
                        scenarios: [...updatedGroups[existingGroupIndex].scenarios, ...newScenarios]
                    };
                } else {
                    // Create new group
                    updatedGroups.push({
                        url: prev.path,
                        method: prev.method,
                        scenarios: newScenarios
                    });
                }

                return {
                    ...prev,
                    scenarioGroups: updatedGroups
                };
            });
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
            
            // Include And steps in the filter
            const steps = scenario.content.split('\n')
                .map(line => line.trim())
                .filter(line => line.startsWith('Given') || line.startsWith('When') || line.startsWith('Then') || line.startsWith('And'));

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

            // Execute all steps regardless of failures
            for (const step of steps) {
                try {
                    await testRunner.runStep(step, { onApiCall: handleApiCall });
                } catch (error) {
                    console.error(`Error executing step "${step}":`, error);
                    // Continue with next step even if this one failed
                }
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
                    scenarioId: result.scenarioId,
                    title: '',
                    status: 'running',
                    steps: [],
                    startTime: new Date().toISOString()
                };

                if (result.content.startsWith('Scenario:')) {
                    // This is a scenario summary
                    const scenarioTitle = result.content.split('(')[0].replace('Scenario:', '').trim();
                    return {
                        ...prev,
                        [result.scenarioRunId]: {
                            ...currentScenario,
                            title: scenarioTitle,
                            status: result.status,
                            endTime: new Date().toISOString()
                        }
                    };
                } else {
                    // This is a step result
                    const existingStepIndex = currentScenario.steps.findIndex(
                        step => step.content === result.content
                    );

                    // Combine details from both request and response
                    const details = {
                        ...result.details,
                        actual: result.details?.actual,
                        expected: result.details?.expected,
                        error: result.details?.error,
                        suggestion: result.details?.suggestion
                    };

                    console.log('Step result details:', details);  // Debug log

                    const updatedStep = {
                        ...result,
                        details
                    };

                    const updatedSteps = existingStepIndex >= 0
                        ? currentScenario.steps.map((step, index) =>
                            index === existingStepIndex ? updatedStep : step
                          )
                        : [...currentScenario.steps, updatedStep];

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
        
        // Forward the API call to the parent component
        if (onApiCall) {
            onApiCall(method, url, request, response);
        }
    };

    // Add clearScenarioRuns function
    const clearScenarioRuns = (scenarioId: string) => {
        setTestResults(prev => {
            const newResults = { ...prev };
            // Remove all runs for this scenario
            Object.keys(newResults).forEach(runId => {
                if (newResults[runId].scenarioId === scenarioId) {
                    delete newResults[runId];
                }
            });
            return newResults;
        });

        // Clear the last run ID from saved state
        setSavedState(prev => ({
            ...prev,
            [scenarioId]: {
                ...prev[scenarioId],
                lastRunId: undefined
            }
        }));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setInteraction(prev => {
                let sourceGroupIndex = -1;
                let sourceScenarioIndex = -1;
                let targetGroupIndex = -1;
                let targetScenarioIndex = -1;

                // Find source and target positions
                prev.scenarioGroups.forEach((group, groupIndex) => {
                    const sIndex = group.scenarios.findIndex(s => s.id === active.id);
                    const tIndex = group.scenarios.findIndex(s => s.id === over.id);
                    if (sIndex !== -1) {
                        sourceGroupIndex = groupIndex;
                        sourceScenarioIndex = sIndex;
                    }
                    if (tIndex !== -1) {
                        targetGroupIndex = groupIndex;
                        targetScenarioIndex = tIndex;
                    }
                });

                if (sourceGroupIndex === targetGroupIndex) {
                    // Moving within the same group
                    const newGroups = [...prev.scenarioGroups];
                    const group = newGroups[sourceGroupIndex];
                    newGroups[sourceGroupIndex] = {
                        ...group,
                        scenarios: arrayMove(group.scenarios, sourceScenarioIndex, targetScenarioIndex)
                    };
                    return { ...prev, scenarioGroups: newGroups };
                }

                return prev;
            });
        }
    };

    const handleSaveAsFavorite = () => {
        addFavorite({
            name: favoriteName,
            method: interaction.method,
            path: interaction.path,
            headers: interaction.headers,
            body: interaction.body,
            lastResponse: interaction.lastResponse
        });
        setSaveFavoriteDialogOpen(false);
        setFavoriteName('');
    };

    const handleLoadFavorite = (favorite: FavoriteRequest) => {
        setInteraction({
            method: favorite.method,
            path: favorite.path,
            headers: favorite.headers,
            body: favorite.body || '',
            lastResponse: favorite.lastResponse,
            scenarioGroups: interaction.scenarioGroups,
            useProxy: interaction.useProxy
        });
        setFavoriteMenuAnchor(null);
    };

    // Add this component to display test results with actual values
    const TestResultDisplay = ({ step }: { step: TestResult }) => {
        const theme = useTheme();
        const statusColors = {
            passed: theme.palette.success.main,
            failed: theme.palette.error.main,
            running: theme.palette.primary.main,
            unimplemented: theme.palette.warning.main
        };

        const formatValue = (value: any): string => {
            if (value === undefined || value === null) return 'undefined';
            if (typeof value === 'object') {
                try {
                    return JSON.stringify(value, null, 2);
                } catch (e) {
                    return String(value);
                }
            }
            return String(value);
        };

        return (
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: 1,
                p: 1,
                borderLeft: `4px solid ${statusColors[step.status]}`,
                bgcolor: `${statusColors[step.status]}10`
            }}>
                <Typography variant="body2" sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1
                }}>
                    {step.status === 'passed' && <CheckIcon color="success" />}
                    {step.status === 'failed' && <CloseIcon color="error" />}
                    {step.status === 'running' && <CircularProgress size={16} />}
                    {step.status === 'unimplemented' && <ErrorIcon color="warning" />}
                    {step.content}
                </Typography>
                
                {(step.status === 'failed' || step.status === 'unimplemented') && step.details && (
                    <Box sx={{ 
                        pl: 3, 
                        fontSize: '0.875rem',
                        '& pre': {
                            margin: '4px 0',
                            padding: '8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            borderRadius: '4px',
                            overflow: 'auto'
                        }
                    }}>
                        {step.details.error && (
                            <Typography color="error.main" variant="body2" gutterBottom>
                                Error: {step.details.error}
                            </Typography>
                        )}
                        {step.details.actual !== undefined && (
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Actual:
                                </Typography>
                                <pre>
                                    {formatValue(step.details.actual)}
                                </pre>
                            </Box>
                        )}
                        {step.details.expected !== undefined && (
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Expected:
                                </Typography>
                                <pre>
                                    {formatValue(step.details.expected)}
                                </pre>
                            </Box>
                        )}
                        {step.details.suggestion && (
                            <Typography color="info.main" variant="body2" sx={{ mt: 1 }}>
                                Suggestion: {step.details.suggestion}
                            </Typography>
                        )}
                    </Box>
                )}
            </Box>
        );
    };

    // Update the RunScenarios component to use the new TestResultDisplay
    const RunScenarios = ({ 
        scenario,
        onRun,
        disabled,
        testResults,
        onClearRuns
    }: { 
        scenario: GeneratedScenario;
        onRun: (scenario: GeneratedScenario) => Promise<void>;
        disabled: boolean;
        testResults: TestResults;
        onClearRuns: () => void;
    }) => {
        // Get all runs for this scenario
        const scenarioRuns = Object.values(testResults)
            .filter(run => run.scenarioId === scenario.id)
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

        const latestRun = scenarioRuns[0];

        return (
            <Box>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                    <Button
                        variant="contained"
                        onClick={() => onRun(scenario)}
                        disabled={disabled}
                        startIcon={<PlayArrowIcon />}
                        size="small"
                    >
                        Run
                    </Button>
                    {scenarioRuns.length > 0 && (
                        <Button
                            variant="outlined"
                            onClick={onClearRuns}
                            startIcon={<DeleteIcon />}
                            size="small"
                        >
                            Clear Results
                        </Button>
                    )}
                </Stack>

                {latestRun && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Latest Run Results:
                        </Typography>
                        <Stack spacing={1}>
                            {latestRun.steps.map((step, index) => (
                                <TestResultDisplay key={index} step={step} />
                            ))}
                        </Stack>
                    </Box>
                )}
            </Box>
        );
    };

    return (
        <Container maxWidth="lg">
            <Box ref={containerRef} sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Scenario Designer
                </Typography>

                <Paper sx={{ p: 3, mb: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6">
                            Request Details
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <Tooltip title="Favorites">
                                <IconButton
                                    onClick={(e) => setFavoriteMenuAnchor(e.currentTarget)}
                                >
                                    <StarBorderIcon />
                                </IconButton>
                            </Tooltip>
                            <Button
                                variant="outlined"
                                startIcon={<StarIcon />}
                                onClick={() => setSaveFavoriteDialogOpen(true)}
                            >
                                Save as Favorite
                            </Button>
                        </Stack>
                    </Stack>

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

                {interaction.scenarioGroups.length > 0 && (
                    <Paper sx={{ p: 3 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                            <Typography variant="h6">
                                Generated Scenarios
                            </Typography>
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={() => setInteraction(prev => ({ ...prev, scenarioGroups: [] }))}
                                startIcon={<DeleteIcon />}
                            >
                                Clear All
                            </Button>
                        </Stack>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <Stack spacing={4}>
                                {interaction.scenarioGroups.map((group, groupIndex) => (
                                    <Box key={`${group.method}-${group.url}`}>
                                        <Typography 
                                            variant="subtitle1" 
                                            sx={{ 
                                                mb: 2, 
                                                pb: 1, 
                                                borderBottom: '1px solid',
                                                borderColor: 'divider',
                                                fontFamily: 'monospace'
                                            }}
                                        >
                                            <Box component="span" sx={{ 
                                                color: 'primary.main',
                                                fontWeight: 'bold',
                                                mr: 1
                                            }}>
                                                {group.method}
                                            </Box>
                                            {group.url}
                                        </Typography>
                                        <SortableContext
                                            items={group.scenarios.map(s => s.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {group.scenarios.map((scenario, index) => (
                                                <SortableScenario
                                                    key={scenario.id}
                                                    scenario={scenario}
                                                    sequenceNumber={index + 1}
                                                    isExpanded={expandedScenario === scenario.id}
                                                    onAccordionChange={(expanded) => {
                                                        setExpandedScenario(expanded ? scenario.id : false);
                                                    }}
                                                    onEdit={() => handleEditClick(scenario)}
                                                    onDelete={() => handleDeleteScenario(scenario, group.url)}
                                                    onRun={handlePlayClick}
                                                    testResults={testResults}
                                                    onClearRuns={clearScenarioRuns}
                                                />
                                            ))}
                                        </SortableContext>
                                    </Box>
                                ))}
                            </Stack>
                        </DndContext>
                    </Paper>
                )}

                {editingScenario && (
                    <ScenarioEditor
                        open={true}
                        scenario={editingScenario}
                        onClose={() => setEditingScenario(null)}
                        onSave={handleSaveScenario}
                        lastResponse={interaction.lastResponse}
                    />
                )}

                {/* Favorites Menu */}
                <Menu
                    anchorEl={favoriteMenuAnchor}
                    open={Boolean(favoriteMenuAnchor)}
                    onClose={() => setFavoriteMenuAnchor(null)}
                >
                    {favorites.length === 0 ? (
                        <MenuItem disabled>
                            <ListItemText primary="No favorites yet" />
                        </MenuItem>
                    ) : (
                        favorites.map((favorite) => (
                            <MenuItem
                                key={favorite.id}
                                onClick={() => handleLoadFavorite(favorite)}
                            >
                                <ListItemIcon>
                                    <StarIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText 
                                    primary={favorite.name}
                                    secondary={`${favorite.method} ${favorite.path}`}
                                />
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeFavorite(favorite.id);
                                    }}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </MenuItem>
                        ))
                    )}
                </Menu>

                {/* Save Favorite Dialog */}
                <Dialog
                    open={saveFavoriteDialogOpen}
                    onClose={() => setSaveFavoriteDialogOpen(false)}
                >
                    <DialogTitle>Save as Favorite</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Name"
                            fullWidth
                            value={favoriteName}
                            onChange={(e) => setFavoriteName(e.target.value)}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setSaveFavoriteDialogOpen(false)}>Cancel</Button>
                        <Button 
                            onClick={handleSaveAsFavorite}
                            disabled={!favoriteName.trim()}
                        >
                            Save
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Container>
    );
}; 