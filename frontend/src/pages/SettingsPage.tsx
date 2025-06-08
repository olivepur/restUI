import React, { useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Tooltip,
    Collapse
} from '@mui/material';
import { 
    Add as AddIcon, 
    Edit as EditIcon, 
    Delete as DeleteIcon, 
    Refresh as RefreshIcon,
    Code as CodeIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useSettingsStore, StepPattern } from '../stores/settingsStore';

interface PatternFormData {
    type: 'Given' | 'When' | 'Then';
    pattern: string;
    description: string;
    implementation?: string;
}

interface PatternDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: PatternFormData) => void;
    initialData?: PatternFormData;
    title: string;
}

const PatternDialog: React.FC<PatternDialogProps> = ({ open, onClose, onSave, initialData, title }) => {
    const [formData, setFormData] = useState<PatternFormData>(initialData || {
        type: 'Given',
        pattern: '',
        description: ''
    });

    const handleSave = () => {
        onSave(formData);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    <Select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'Given' | 'When' | 'Then' })}
                        fullWidth
                    >
                        <MenuItem value="Given">Given</MenuItem>
                        <MenuItem value="When">When</MenuItem>
                        <MenuItem value="Then">Then</MenuItem>
                    </Select>
                    
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

export const SettingsPage: React.FC = () => {
    const { stepPatterns, addStepPattern, updateStepPattern, removeStepPattern, resetToDefaultPatterns } = useSettingsStore();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPattern, setEditingPattern] = useState<StepPattern | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const handleAdd = () => {
        setEditingPattern(null);
        setDialogOpen(true);
    };

    const handleEdit = (pattern: StepPattern) => {
        setEditingPattern(pattern);
        setDialogOpen(true);
    };

    const handleSave = (data: PatternFormData) => {
        if (editingPattern) {
            updateStepPattern(editingPattern.id, data);
        } else {
            addStepPattern(data);
        }
    };

    const handleDelete = (id: string) => {
        removeStepPattern(id);
    };

    const toggleImplementation = (id: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleImplementationChange = (pattern: StepPattern, newImplementation: string) => {
        updateStepPattern(pattern.id, { implementation: newImplementation });
    };

    return (
        <Box sx={{ p: 3 }}>
            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5">Step Patterns</Typography>
                        <Box>
                            <Tooltip title="Reset to Default Patterns">
                                <IconButton onClick={resetToDefaultPatterns} sx={{ mr: 1 }}>
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleAdd}
                            >
                                Add Pattern
                            </Button>
                        </Box>
                    </Box>

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell width={40}></TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Pattern</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell width={120}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {stepPatterns.map((pattern) => (
                                    <React.Fragment key={pattern.id}>
                                        <TableRow>
                                            <TableCell>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => toggleImplementation(pattern.id)}
                                                >
                                                    {expandedRows.has(pattern.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                </IconButton>
                                            </TableCell>
                                            <TableCell>{pattern.type}</TableCell>
                                            <TableCell>
                                                <code>{pattern.pattern}</code>
                                            </TableCell>
                                            <TableCell>{pattern.description}</TableCell>
                                            <TableCell>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleEdit(pattern)}
                                                    disabled={!pattern.isCustom}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDelete(pattern.id)}
                                                    disabled={!pattern.isCustom}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={5} style={{ paddingBottom: 0, paddingTop: 0 }}>
                                                <Collapse in={expandedRows.has(pattern.id)} timeout="auto" unmountOnExit>
                                                    <Box sx={{ py: 2 }}>
                                                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <CodeIcon fontSize="small" />
                                                            Implementation
                                                        </Typography>
                                                        <TextField
                                                            fullWidth
                                                            multiline
                                                            rows={6}
                                                            value={pattern.implementation || ''}
                                                            onChange={(e) => handleImplementationChange(pattern, e.target.value)}
                                                            disabled={!pattern.isCustom}
                                                            sx={{
                                                                '& .MuiInputBase-input': {
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '0.875rem'
                                                                }
                                                            }}
                                                            placeholder={pattern.isCustom ? 
                                                                "Add implementation code here..." : 
                                                                "This is a built-in pattern. Implementation cannot be modified."}
                                                        />
                                                    </Box>
                                                </Collapse>
                                            </TableCell>
                                        </TableRow>
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            <PatternDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSave={handleSave}
                initialData={editingPattern || undefined}
                title={editingPattern ? 'Edit Step Pattern' : 'Add Step Pattern'}
            />
        </Box>
    );
}; 