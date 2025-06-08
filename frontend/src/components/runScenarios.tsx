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
import { TestResults, TestResult } from '../pages/ScenarioDesignerPage';

interface RunScenariosProps {
    scenario: GeneratedScenario;
    onRun: (scenario: GeneratedScenario) => Promise<void>;
    disabled: boolean;
    testResults: TestResults;
    onClearRuns: () => void;
}

interface StepResult {
    step: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'unimplemented';
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
    error?: string;
    isExpanded: boolean;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'passed':
            return '#4caf50';  // Green
        case 'failed':
            return '#f44336';  // Red
        case 'unimplemented':
            return '#ff9800';  // Orange
        case 'running':
            return '#2196f3';  // Blue
        default:
            return '#757575';  // Grey
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'passed':
            return '✓';
        case 'failed':
            return '✗';
        case 'unimplemented':
            return '?';
        case 'running':
            return '⟳';
        default:
            return '-';
    }
};

const StepResult = ({ step }: { step: TestResult }) => {
    return (
        <div className="step-result" style={{ marginBottom: '8px' }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                color: getStatusColor(step.status),
                fontFamily: 'monospace'
            }}>
                <span style={{ marginRight: '8px' }}>{getStatusIcon(step.status)}</span>
                <span>{step.content}</span>
            </div>
            {step.details?.suggestion && (
                <div style={{ 
                    marginLeft: '24px', 
                    color: step.status === 'unimplemented' ? '#ff9800' : '#f44336',
                    fontSize: '0.9em',
                    fontStyle: 'italic'
                }}>
                    {step.details.suggestion}
                </div>
            )}
        </div>
    );
};

export class RunScenarios extends React.Component<RunScenariosProps, RunScenariosState> {
    state: RunScenariosState = {
        isRunning: false,
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
        
        this.setState({
            isRunning: true,
            error: undefined,
            isExpanded: true
        });

        try {
            await this.props.onRun(scenario);
            this.setState({ isRunning: false });
        } catch (error) {
            console.error('❌ Error running scenario:', error);
            this.setState({
                isRunning: false,
                error: error instanceof Error ? error.message : 'Failed to run scenario'
            });
        }
    };

    render() {
        const { disabled, scenario, testResults, onClearRuns } = this.props;
        const { isRunning, error } = this.state;

        // Get runs for this scenario
        const scenarioRuns = Object.values(testResults)
            .filter((run): run is TestResults[string] => run.scenarioId === scenario.id)
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

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
                    {scenarioRuns.length > 0 && (
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={onClearRuns}
                            startIcon={<ClearAllIcon />}
                            size="medium"
                        >
                            Clear All Runs
                        </Button>
                    )}
                </Stack>

                {scenarioRuns.length > 0 && (
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        {scenarioRuns.map((run) => (
                            <Paper key={run.id} sx={{ p: 2 }}>
                                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                    <Chip
                                        label={run.status === 'passed' ? 'Passed' : 'Failed'}
                                        color={run.status === 'passed' ? 'success' : 'error'}
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
                                        onClick={() => console.warn('Remove run should be handled by parent')}
                                        color="error"
                                        title="Remove this run"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Stack>

                                <List>
                                    {run.steps.map((step, index) => (
                                        <ListItem
                                            key={`${index}-${step.content}`}
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
                                            ) : step.status === 'passed' ? (
                                                <CheckCircleIcon color="success" sx={{ mr: 1, mt: 0.5 }} />
                                            ) : (
                                                <Box sx={{ width: 20, height: 20, mr: 1 }} />
                                            )}
                                            <Box sx={{ flex: 1 }}>
                                                <StepResult step={step} />
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