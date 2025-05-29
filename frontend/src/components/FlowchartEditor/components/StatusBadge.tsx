import React from 'react';
import { Stack, Chip } from '@mui/material';
import { EdgeStatus, TestStatus } from '../types';
import { statusColors, testStatusColors } from '../styles';

interface StatusBadgeProps {
    runStatus?: EdgeStatus;
    testStatus?: TestStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
    runStatus = 'open', 
    testStatus = 'Not Tested' 
}) => {
    return (
        <Stack direction="row" spacing={1} alignItems="center">
            <Chip
                label={`Run: ${runStatus}`}
                size="small"
                sx={{
                    backgroundColor: statusColors[runStatus].backgroundColor,
                    color: statusColors[runStatus].color,
                    '& .MuiChip-label': {
                        fontWeight: 'bold'
                    }
                }}
            />
            <Chip
                label={`Test: ${testStatus}`}
                size="small"
                sx={{
                    backgroundColor: testStatusColors[testStatus].backgroundColor,
                    color: testStatusColors[testStatus].color,
                    '& .MuiChip-label': {
                        fontWeight: 'bold'
                    }
                }}
            />
        </Stack>
    );
}; 