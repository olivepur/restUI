import React from 'react';
import { Chip } from '@mui/material';
import { EdgeStatus, TestStatus } from '../types';

interface StatusBadgeProps {
    runStatus?: EdgeStatus;
    testStatus?: TestStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ runStatus, testStatus }) => {
    const getStatusColor = (status: EdgeStatus | TestStatus | undefined) => {
        switch (status) {
            case 'running':
            case 'Testing':
                return 'info';
            case 'performed':
            case 'Passed':
                return 'success';
            case 'error':
            case 'Failed':
                return 'error';
            case 'pending':
                return 'warning';
            case 'stopped':
                return 'default';
            default:
                return 'default';
        }
    };

    return (
        <>
            {runStatus && (
                <Chip
                    label={runStatus}
                    color={getStatusColor(runStatus)}
                    size="small"
                    sx={{ mr: 1 }}
                />
            )}
            {testStatus && (
                <Chip
                    label={testStatus}
                    color={getStatusColor(testStatus)}
                    size="small"
                />
            )}
        </>
    );
}; 