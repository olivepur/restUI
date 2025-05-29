import React, { useState } from 'react';
import {
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Stack,
    SelectChangeEvent
} from '@mui/material';

interface RequestFileSelectorProps {
    onRequestChange: (request: { method: string; url: string }) => void;
}

export const RequestFileSelector: React.FC<RequestFileSelectorProps> = ({ onRequestChange }) => {
    const [method, setMethod] = useState('GET');
    const [url, setUrl] = useState('/api/hello/{node-label-target}');

    const handleMethodChange = (event: SelectChangeEvent) => {
        const newMethod = event.target.value;
        setMethod(newMethod);
        onRequestChange({ method: newMethod, url });
    };

    const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newUrl = event.target.value;
        setUrl(newUrl);
        onRequestChange({ method, url: newUrl });
    };

    return (
        <Stack spacing={2}>
            <FormControl fullWidth>
                <InputLabel id="method-select-label">Method</InputLabel>
                <Select
                    labelId="method-select-label"
                    value={method}
                    label="Method"
                    onChange={handleMethodChange}
                >
                    <MenuItem value="GET">GET</MenuItem>
                    <MenuItem value="POST">POST</MenuItem>
                    <MenuItem value="PUT">PUT</MenuItem>
                    <MenuItem value="DELETE">DELETE</MenuItem>
                    <MenuItem value="PATCH">PATCH</MenuItem>
                </Select>
            </FormControl>
            <TextField
                fullWidth
                label="URL"
                value={url}
                onChange={handleUrlChange}
                helperText="Use {node-label-target} to reference target node's label"
            />
        </Stack>
    );
}; 