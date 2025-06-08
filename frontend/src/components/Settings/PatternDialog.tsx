import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import { MonacoEditor } from './MonacoEditor';
import { StepPattern } from './settingsStore';

export interface PatternFormData {
    type: 'Given' | 'When' | 'Then' | 'And';
    pattern: string;
    description: string;
    implementation: string;
}

interface PatternDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: PatternFormData) => void;
    initialData?: StepPattern;
    title: string;
}

export const PatternDialog: React.FC<PatternDialogProps> = ({
    open,
    onClose,
    onSave,
    initialData,
    title
}) => {
    const [formData, setFormData] = useState<PatternFormData>(() => ({
        type: initialData?.type || 'Given',
        pattern: initialData?.pattern || '',
        description: initialData?.description || '',
        implementation: initialData?.implementation || ''
    }));

    const handleSave = () => {
        onSave(formData);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel id="step-type-label">Step Type</InputLabel>
                        <Select
                            labelId="step-type-label"
                            value={formData.type}
                            label="Step Type"
                            onChange={(e) =>
                                setFormData({ ...formData, type: e.target.value as 'Given' | 'When' | 'Then' | 'And' })
                            }
                        >
                            <MenuItem value="Given">Given</MenuItem>
                            <MenuItem value="When">When</MenuItem>
                            <MenuItem value="Then">Then</MenuItem>
                            <MenuItem value="And">And</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        label="Pattern (RegExp)"
                        value={formData.pattern}
                        onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                        fullWidth
                        helperText="Use regular expression syntax. Capture groups with ( )"
                    />

                    <TextField
                        label="Description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        fullWidth
                        multiline
                        rows={2}
                    />

                    <Box sx={{ mt: 2 }}>
                        <InputLabel sx={{ mb: 1 }}>Implementation</InputLabel>
                        <MonacoEditor
                            value={formData.implementation}
                            onChange={(value: string) =>
                                setFormData({ ...formData, implementation: value })
                            }
                            language="javascript"
                            height="300px"
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" color="primary">
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}; 