import React, { useState, useEffect } from 'react';
import {
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Typography
} from '@mui/material';
import { fileService } from '../services/FileService';

interface RequestFileData {
    method: string;
    url: string;
    metadata?: any;
}

interface RequestFileSelectorProps {
    onRequestChange: (requestData: RequestFileData) => void;
}

export const RequestFileSelector: React.FC<RequestFileSelectorProps> = ({ onRequestChange }) => {
    const [selectedFile, setSelectedFile] = useState<string>('');
    const [requestContent, setRequestContent] = useState<string>('');
    const [requestFiles, setRequestFiles] = useState<string[]>([]);

    useEffect(() => {
        loadRequestFiles();
    }, []);

    const loadRequestFiles = async () => {
        try {
            const files = await fileService.getRequestFiles();
            setRequestFiles(files);
        } catch (error) {
            console.error('Error loading request files:', error);
        }
    };

    const handleFileSelect = async (filename: string) => {
        setSelectedFile(filename);
        try {
            const content = await fileService.getRequestFileContent(filename);
            setRequestContent(JSON.stringify(content, null, 2));
            onRequestChange(content);
        } catch (error) {
            console.error('Error loading request file:', error);
        }
    };

    const handleContentChange = (newContent: string) => {
        setRequestContent(newContent);
        try {
            const parsed = JSON.parse(newContent);
            onRequestChange(parsed);
        } catch (error) {
            console.error('Invalid JSON:', error);
        }
    };

    return (
        <Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Request File</InputLabel>
                <Select
                    value={selectedFile}
                    label="Request File"
                    onChange={(e) => handleFileSelect(e.target.value)}
                >
                    {requestFiles.map((file) => (
                        <MenuItem key={file} value={file}>
                            {file}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            {selectedFile && (
                <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Edit Request JSON:
                    </Typography>
                    <TextField
                        multiline
                        fullWidth
                        rows={10}
                        value={requestContent}
                        onChange={(e) => handleContentChange(e.target.value)}
                        sx={{ fontFamily: 'monospace' }}
                    />
                </Box>
            )}
        </Box>
    );
}; 