import React from 'react';
import { 
    Button, 
    Stack, 
    Typography, 
    CircularProgress,
    Chip,
    Box,
    Collapse,
    IconButton,
    Paper
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { GeneratedScenario } from '../Scenario/ScenarioGenerator';
import { TestResults } from '../../pages/ScenarioDesignerPage';
import { RunningSteps } from './RunningSteps';

interface RunScenariosProps {
    scenario: GeneratedScenario;
    onRun: (scenario: GeneratedScenario) => Promise<void>;
    disabled: boolean;
    testResults: TestResults;
    onClearRuns: () => void;
}

interface RunScenariosState {
    isRunning: boolean;
    error?: string;
    isExpanded: boolean;
}

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

    handleRunClick = async () => {
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
            this.setState({
                isRunning: false,
                error: error instanceof Error ? error.message : 'An error occurred'
            });
        }
    };

    render() {
        const { scenario, disabled, testResults, onClearRuns } = this.props;
        const { isRunning, error, isExpanded } = this.state;

        // Get all runs for this scenario
        const scenarioRuns = Object.values(testResults)
            .filter(run => run.scenarioId === scenario.id)
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

        const hasRuns = scenarioRuns.length > 0;

        return (
            <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={this.handleRunClick}
                        disabled={disabled || isRunning}
                        startIcon={isRunning ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                    >
                        {isRunning ? 'Running...' : 'Run'}
                    </Button>

                    {hasRuns && (
                        <>
                            <IconButton
                                size="small"
                                onClick={() => this.setState(prev => ({ isExpanded: !prev.isExpanded }))}
                            >
                                {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                            </IconButton>

                            <IconButton
                                size="small"
                                onClick={onClearRuns}
                                title="Clear all runs"
                            >
                                <ClearAllIcon />
                            </IconButton>
                        </>
                    )}
                </Stack>

                {hasRuns && (
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        {scenarioRuns.map((run) => (
                            <Paper
                                key={run.id}
                                sx={{
                                    p: 2,
                                    bgcolor: 'grey.50'
                                }}
                            >
                                <Typography variant="subtitle2" gutterBottom>
                                    Run started at {new Date(run.startTime).toLocaleString()}
                                    {run.endTime && ` - ended at ${new Date(run.endTime).toLocaleString()}`}
                                </Typography>
                                <RunningSteps steps={run.steps} />
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