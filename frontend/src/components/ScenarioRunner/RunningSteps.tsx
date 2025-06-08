import React from 'react';
import {
    List,
    ListItem,
    Box,
    CircularProgress,
    Typography
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface StepDetails {
    suggestion?: string;
    expected?: any;
    actual?: any;
    error?: string;
    isUnimplemented?: boolean;
    responseText?: string;
    status?: number;
    endpoint?: string;
    headers?: Record<string, string>;
    response?: any;
    parseError?: string;
}

interface TestStepResult {
    content: string;
    status: 'running' | 'passed' | 'failed' | 'unimplemented';
    details?: StepDetails;
}

interface RunningStepsProps {
    steps: TestStepResult[];
}

// Helper function to safely convert any value to a string
const safeToString = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (value instanceof Error) return value.message;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

// Helper function to get status color
const getStatusColor = (status: TestStepResult['status']): string => {
    switch (status) {
        case 'passed':
            return '#4caf50';
        case 'failed':
            return '#f44336';
        case 'unimplemented':
            return '#ff9800';
        default:
            return 'inherit';
    }
};

const StepResult = ({ step }: { step: TestStepResult }) => {
    return (
        <div className="step-result" style={{ marginBottom: '8px' }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                color: getStatusColor(step.status),
                fontFamily: 'monospace'
            }}>
                <span>{step.content}</span>
            </div>
            {(step.details?.suggestion || step.details?.error) && (
                <div style={{ 
                    marginLeft: '24px', 
                    color: step.status === 'unimplemented' ? '#ff9800' : '#f44336',
                    fontSize: '0.9em',
                    fontStyle: 'italic'
                }}>
                    {step.details.error && (
                        <div style={{ marginBottom: '4px' }}>
                            Error: {safeToString(step.details.error)}
                        </div>
                    )}
                    {step.details.suggestion && (
                        <div>
                            Suggestion: {safeToString(step.details.suggestion)}
                        </div>
                    )}
                </div>
            )}
            {step.details?.responseText && (
                <div style={{
                    marginLeft: '24px',
                    marginTop: '8px',
                    padding: '8px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                }}>
                    Response: {safeToString(step.details.responseText)}
                </div>
            )}
            {step.details?.expected && step.details?.actual && (
                <div style={{
                    marginLeft: '24px',
                    marginTop: '4px',
                    fontSize: '0.9em',
                    fontFamily: 'monospace'
                }}>
                    <div style={{ color: '#666' }}>Expected: {safeToString(step.details.expected)}</div>
                    <div style={{ color: '#666' }}>Actual: {safeToString(step.details.actual)}</div>
                </div>
            )}
        </div>
    );
};

export const RunningSteps: React.FC<RunningStepsProps> = ({ steps }) => {
    return (
        <List>
            {steps.map((step, index) => (
                <ListItem
                    key={`${index}-${step.content}`}
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        py: 1,
                        borderBottom: (theme) =>
                            index < steps.length - 1 ?
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
    );
}; 