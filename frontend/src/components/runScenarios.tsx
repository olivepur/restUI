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
    Box
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
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
}

export class RunScenarios extends React.Component<RunScenariosProps, RunScenariosState> {
    constructor(props: RunScenariosProps) {
        super(props);
        this.state = {
            isRunning: false,
            currentStep: '',
            stepResults: []
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
            endpoint: ''  // Will be set by Given steps
        };

        // Initialize all steps as pending
        this.setState({
            isRunning: true,
            stepResults: steps.map(step => ({
                step,
                status: 'pending',
                results: []
            })),
            error: undefined
        });

        try {
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                
                // Update current step to running
                this.setState(prev => ({
                    stepResults: prev.stepResults.map((result, index) => 
                        index === i ? { ...result, status: 'running' } : result
                    )
                }));

                const stepResults = await testRunner.runStep(step, context);
                
              

                // Update step status based on results
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
        } catch (error) {
            this.setState({
                error: error instanceof Error ? error.message : 'An error occurred while running the scenario'
            });
        } finally {
            this.setState({ isRunning: false });
        }
    };

    renderStepBadge(status: StepResult['status']) {
        switch (status) {
            case 'pending':
                return <Chip label="Pending" variant="outlined" size="small" />;
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
        const { disabled } = this.props;
        const { isRunning, stepResults, error } = this.state;

        return (
            <Stack spacing={2}>
                <Button
                    variant="contained"
                    onClick={this.handleRun}
                    startIcon={isRunning ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                    disabled={disabled || isRunning}
                    color="primary"
                >
                    {isRunning ? 'Running Scenario' : 'Run Scenario'}
                </Button>
                
                {stepResults.length > 0 && (
                    <List>
                        {stepResults.map((stepResult, index) => (
                            <ListItem 
                                key={index}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    color: stepResult.status === 'failed' ? 'error.main' : 'success.main'
                                }}
                            >
                                {stepResult.status === 'failed' ? 
                                    <ErrorIcon fontSize="small" /> : 
                                    <CheckCircleIcon fontSize="small" />
                                }
                                <Typography>
                                    {stepResult.step}
                                    {stepResult.status === 'failed' && stepResult.results[0]?.details?.suggestion && (
                                        <Typography 
                                            component="span" 
                                            sx={{ 
                                                ml: 1,
                                                color: 'text.secondary',
                                                fontStyle: 'italic'
                                            }}
                                        >
                                            → {stepResult.results[0].details.suggestion}
                                        </Typography>
                                    )}
                                </Typography>
                            </ListItem>
                        ))}
                    </List>
                )}

                {error && (
                    <Typography color="error" variant="body2">
                        {error}
                    </Typography>
                )}
            </Stack>
        );
    }
} 