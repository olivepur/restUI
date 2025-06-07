import React from 'react';
import { 
    Button, 
    Stack, 
    Typography, 
    List, 
    ListItem, 
    ListItemText, 
    CircularProgress,
    Chip,
    Box,
    Collapse,
    IconButton,
    Paper
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { GeneratedScenario } from './scenarioGenerator';
import { testRunner } from './testRunner';

interface RunScenariosProps {
    scenario: GeneratedScenario;
    onRun: (scenario: GeneratedScenario) => Promise<void>;
    disabled?: boolean;
}

interface StepResult {
    step: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    results: {
        suggestion?: string;
        expected?: any;
        actual?: any;
        error?: string;
    }[];
}

interface TestRun {
    id: string;           // scenarioRunId
    scenarioId: string;   // References the GeneratedScenario.id
    title: string;
    status: 'running' | 'completed' | 'failed';
    steps: StepResult[];
    startTime: string;
    endTime?: string;
}

interface RunScenariosState {
    isRunning: boolean;
    testRuns: TestRun[];
    error?: string;
    isExpanded: boolean;
}

export class RunScenarios extends React.Component<RunScenariosProps, RunScenariosState> {
    state: RunScenariosState = {
        isRunning: false,
        testRuns: [],
        error: undefined,
        isExpanded: false
    };

    parseSteps(content: string): string[] {
        return content.split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('Given') || line.startsWith('When') || line.startsWith('Then'));
    }

    handleRun = async () => {
        const { scenario } = this.props;
        const steps = this.parseSteps(scenario.content);
        const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create a new test run
        const newRun: TestRun = {
            id: runId,
            scenarioId: scenario.id,
            title: scenario.title,
            status: 'running',
            steps: steps.map(step => ({
                step,
                status: 'pending',
                results: []
            })),
            startTime: new Date().toISOString()
        };

        // Add the new run to the list
        this.setState(prev => ({
            isRunning: true,
            testRuns: [newRun, ...prev.testRuns],
            error: undefined,
            isExpanded: true
        }));

        try {
            await this.props.onRun(scenario);
            
            // Get the latest test results for this run
            const currentRun = this.state.testRuns.find(run => run.id === runId);
            if (currentRun) {
                // Check if any step failed
                const hasFailedSteps = currentRun.steps.some(step => step.status === 'failed');
                
                this.setState(prev => ({
                    isRunning: false,
                    testRuns: prev.testRuns.map(run => 
                        run.id === runId ? {
                            ...run,
                            status: hasFailedSteps ? 'failed' : 'completed',
                            steps: run.steps.map(step => ({
                                ...step,
                                // Keep the existing status if it's failed, otherwise mark as completed
                                status: step.status === 'failed' ? 'failed' : 'completed'
                            })),
                            endTime: new Date().toISOString()
                        } : run
                    )
                }));
            }
        } catch (error) {
            console.error('Error running scenario:', error);
            
            this.setState(prev => ({
                isRunning: false,
                testRuns: prev.testRuns.map(run => 
                    run.id === runId ? {
                        ...run,
                        status: 'failed',
                        steps: run.steps.map(step => ({
                            ...step,
                            // Only update pending steps to failed
                            status: step.status === 'pending' ? 'failed' : step.status
                        })),
                        endTime: new Date().toISOString()
                    } : run
                ),
                error: error instanceof Error ? error.message : 'Failed to run scenario'
            }));
        }
    };

    handleRemoveRun = (runId: string) => {
        this.setState(prev => ({
            testRuns: prev.testRuns.filter(run => run.id !== runId)
        }));
    };

    handleClearAllRuns = () => {
        this.setState({
            testRuns: [],
            error: undefined
        });
    };

    render() {
        const { disabled } = this.props;
        const { isRunning, testRuns, error, isExpanded } = this.state;

        return (
            <Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Button
                        variant="contained"
                        onClick={this.handleRun}
                        disabled={disabled || isRunning}
                        startIcon={isRunning ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                    >
                        {isRunning ? 'Running...' : 'Run Scenario'}
                    </Button>
                    {testRuns.length > 0 && (
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={this.handleClearAllRuns}
                            startIcon={<ClearAllIcon />}
                            size="medium"
                        >
                            Clear All Runs
                        </Button>
                    )}
                </Stack>

                {testRuns.length > 0 && (
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        {testRuns.map((run) => (
                            <Paper key={run.id} sx={{ p: 2 }}>
                                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                    <Chip
                                        label={run.status === 'completed' ? 'Passed' : 'Failed'}
                                        color={run.status === 'completed' ? 'success' : 'error'}
                                        size="small"
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        Run ID: {run.id}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {new Date(run.startTime).toLocaleString()}
                                    </Typography>
                                    <Box sx={{ flexGrow: 1 }} />
                                    <IconButton
                                        size="small"
                                        onClick={() => this.handleRemoveRun(run.id)}
                                        color="error"
                                        title="Remove this run"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Stack>

                                <List>
                                    {run.steps.map((step, index) => (
                                        <ListItem
                                            key={`${index}-${step.step}`}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                py: 1,
                                                borderBottom: (theme) =>
                                                    index < run.steps.length - 1 ?
                                                    `1px solid ${theme.palette.divider}` : 'none'
                                            }}
                                        >
                                            {step.status === 'running' ? (
                                                <CircularProgress size={20} sx={{ mr: 1, mt: 0.5 }} />
                                            ) : step.status === 'failed' ? (
                                                <ErrorIcon color="error" sx={{ mr: 1, mt: 0.5 }} />
                                            ) : step.status === 'completed' ? (
                                                <CheckCircleIcon color="success" sx={{ mr: 1, mt: 0.5 }} />
                                            ) : (
                                                <Box sx={{ width: 20, height: 20, mr: 1 }} />
                                            )}
                                            <Box sx={{ flex: 1 }}>
                                                <Typography
                                                    sx={{
                                                        color: step.status === 'failed' ? 'error.main' :
                                                               step.status === 'completed' ? 'success.main' :
                                                               'text.primary',
                                                        fontWeight: 500,
                                                        mb: step.results.length > 0 ? 1 : 0
                                                    }}
                                                >
                                                    {step.step}
                                                </Typography>
                                                {step.results.length > 0 && (
                                                    <Box sx={{ pl: 2, color: 'text.secondary' }}>
                                                        {step.results.map((result, idx) => (
                                                            <Box key={idx}>
                                                                {result.suggestion && (
                                                                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                                                        {result.suggestion}
                                                                    </Typography>
                                                                )}
                                                                {result.expected !== undefined && (
                                                                    <Typography variant="body2">
                                                                        Expected: {JSON.stringify(result.expected)}
                                                                    </Typography>
                                                                )}
                                                                {result.actual !== undefined && (
                                                                    <Typography variant="body2">
                                                                        Actual: {JSON.stringify(result.actual)}
                                                                    </Typography>
                                                                )}
                                                                {result.error && (
                                                                    <Typography variant="body2" color="error">
                                                                        Error: {result.error}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                )}
                                            </Box>
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        ))}
                    </Stack>
                )}

                {error && (
                    <Typography color="error" sx={{ mt: 2 }}>
                        {error}
                    </Typography>
                )}
            </Box>
        );
    }
} 