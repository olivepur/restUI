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
import { GeneratedScenario } from './scenarioGenerator';
import { testRunner } from './testRunner';

interface RunScenariosProps {
    scenario: GeneratedScenario;
    onRun: (scenario: GeneratedScenario) => Promise<void>;
    disabled?: boolean;
}

interface StepResult {
    step: string;
    status: 'pending' | 'running' | 'passed' | 'failed';
    error?: string;
    results: Array<{
        name: string;
        passed: boolean;
        error?: string;
        displayText?: string;
        details?: {
            expected?: any;
            actual?: any;
            suggestion?: string;
        };
    }>;
}

interface RunScenariosState {
    isRunning: boolean;
    currentStep: string;
    stepResults: StepResult[];
    error?: string;
    isExpanded: boolean;
    scenarioStatus: 'pending' | 'running' | 'passed' | 'failed';
}

export class RunScenarios extends React.Component<RunScenariosProps, RunScenariosState> {
    constructor(props: RunScenariosProps) {
        super(props);
        this.state = {
            isRunning: false,
            currentStep: '',
            stepResults: [],
            isExpanded: false,
            scenarioStatus: 'pending'
        };
    }

    parseSteps(content: string): string[] {
        return content.split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('Given') || line.startsWith('When') || line.startsWith('Then'));
    }

    handleRun = async () => {
        const { scenario } = this.props;
        const steps = this.parseSteps(scenario.content);
        const context = {
            endpoint: ''
        };

        this.setState({
            isRunning: true,
            stepResults: steps.map(step => ({
                step,
                status: 'pending',
                results: []
            })),
            error: undefined,
            scenarioStatus: 'running'
        });

        try {
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                
                this.setState(prev => ({
                    stepResults: prev.stepResults.map((result, index) => 
                        index === i ? { ...result, status: 'running' } : result
                    )
                }));

                const stepResults = await testRunner.runStep(step, context);
                const stepPassed = stepResults.every(result => result.passed);
                
                this.setState(prev => ({
                    stepResults: prev.stepResults.map((result, index) => 
                        index === i ? {
                            ...result,
                            status: stepPassed ? 'passed' : 'failed',
                            results: stepResults,
                            error: stepResults.find(r => !r.passed)?.error
                        } : result
                    )
                }));
            }

            // Update final scenario status
            this.setState(prev => ({
                scenarioStatus: prev.stepResults.some(step => step.status === 'failed') ? 'failed' : 'passed'
            }));

        } catch (error) {
            this.setState({
                error: error instanceof Error ? error.message : 'An error occurred while running the scenario',
                scenarioStatus: 'failed'
            });
        } finally {
            this.setState({ isRunning: false });
        }
    };

    renderScenarioStatus() {
        const { scenarioStatus } = this.state;
        
        switch (scenarioStatus) {
            case 'pending':
                return <Chip label="Not Run" variant="outlined" size="small" />;
            case 'running':
                return <Chip 
                    label="Running" 
                    color="primary" 
                    icon={<CircularProgress size={16} />} 
                    size="small" 
                />;
            case 'passed':
                return <Chip 
                    label="Passed" 
                    color="success" 
                    icon={<CheckCircleIcon />} 
                    size="small" 
                />;
            case 'failed':
                return <Chip 
                    label="Failed" 
                    color="error" 
                    icon={<ErrorIcon />} 
                    size="small" 
                />;
        }
    }

    render() {
        const { disabled, scenario } = this.props;
        const { isRunning, stepResults, error, isExpanded, scenarioStatus } = this.state;

        return (
            <Stack spacing={2}>
                <Paper 
                    sx={{ 
                        p: 2,
                        cursor: stepResults.length > 0 ? 'pointer' : 'default',
                        '&:hover': stepResults.length > 0 ? {
                            bgcolor: 'action.hover'
                        } : {}
                    }}
                    onClick={() => stepResults.length > 0 && this.setState(prev => ({ isExpanded: !prev.isExpanded }))}
                >
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={2} alignItems="center">
                            {this.renderScenarioStatus()}
                            <Typography>
                                {scenario.title}
                            </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Button
                                variant="contained"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    this.handleRun();
                                }}
                                startIcon={isRunning ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                                disabled={disabled || isRunning}
                                color="primary"
                                size="small"
                            >
                                {isRunning ? 'Running' : 'Run'}
                            </Button>
                            {stepResults.length > 0 && (
                                <IconButton 
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        this.setState(prev => ({ isExpanded: !prev.isExpanded }));
                                    }}
                                >
                                    {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                </IconButton>
                            )}
                        </Stack>
                    </Stack>
                </Paper>
                
                <Collapse in={isExpanded}>
                    <Paper sx={{ p: 2 }}>
                        <List>
                            {stepResults.map((stepResult, index) => (
                                <ListItem 
                                    key={index}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        flexDirection: 'column',
                                        gap: 1,
                                        borderBottom: (theme) => 
                                            index < stepResults.length - 1 ? 
                                            `1px solid ${theme.palette.divider}` : 'none',
                                        py: 2
                                    }}
                                >
                                    <Stack direction="row" spacing={2} alignItems="center" width="100%">
                                        {stepResult.status === 'failed' ? 
                                            <ErrorIcon fontSize="small" color="error" /> : 
                                            <CheckCircleIcon fontSize="small" color="success" />
                                        }
                                        <Typography 
                                            sx={{ 
                                                color: stepResult.status === 'failed' ? 'error.main' : 'success.main',
                                                flex: 1
                                            }}
                                        >
                                            {stepResult.step}
                                        </Typography>
                                        <Chip 
                                            label={stepResult.status} 
                                            size="small"
                                            color={stepResult.status === 'failed' ? 'error' : 'success'}
                                        />
                                    </Stack>
                                    {stepResult.status === 'failed' && stepResult.results[0]?.details && (
                                        <Box 
                                            sx={{ 
                                                pl: 6,
                                                width: '100%',
                                                color: 'text.secondary'
                                            }}
                                        >
                                            {stepResult.results[0].details.suggestion && (
                                                <Typography variant="body2" sx={{ mb: 1, fontStyle: 'italic' }}>
                                                    {stepResult.results[0].details.suggestion}
                                                </Typography>
                                            )}
                                            {stepResult.results[0].details.expected !== undefined && (
                                                <Typography variant="body2">
                                                    Expected: {JSON.stringify(stepResult.results[0].details.expected)}
                                                </Typography>
                                            )}
                                            {stepResult.results[0].details.actual !== undefined && (
                                                <Typography variant="body2">
                                                    Actual: {JSON.stringify(stepResult.results[0].details.actual)}
                                                </Typography>
                                            )}
                                        </Box>
                                    )}
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Collapse>

                {error && (
                    <Typography color="error" variant="body2">
                        {error}
                    </Typography>
                )}
            </Stack>
        );
    }
} 