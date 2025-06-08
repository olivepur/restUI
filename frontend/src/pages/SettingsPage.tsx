import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Collapse
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { StepPattern, useSettingsStore } from '../components/Settings/settingsStore';
import { PatternDialog, PatternFormData } from '../components/Settings/PatternDialog';
import { MonacoEditor } from '../components/Settings/MonacoEditor';

export const SettingsPage: React.FC = () => {
    const { stepPatterns, addPattern, updatePattern, removePattern, resetToDefaults } = useSettingsStore();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPattern, setEditingPattern] = useState<StepPattern | null>(null);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleEdit = (pattern: StepPattern) => {
        setEditingPattern(pattern);
        setDialogOpen(true);
    };

    const handleAddPattern = (data: PatternFormData) => {
        if (editingPattern) {
            updatePattern(editingPattern.id, data);
        } else {
            addPattern({
                type: data.type,
                pattern: data.pattern,
                description: data.description,
                implementation: data.implementation || ''
            });
        }
        setDialogOpen(false);
        setEditingPattern(null);
    };

    const handleRemovePattern = (id: string) => {
        removePattern(id);
    };

    const handleImplementationChange = (pattern: StepPattern, newImplementation: string) => {
        updatePattern(pattern.id, { implementation: newImplementation });
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">Step Patterns</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        color="warning"
                        onClick={resetToDefaults}
                    >
                        Reset to Defaults
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            setEditingPattern(null);
                            setDialogOpen(true);
                        }}
                    >
                        Add Pattern
                    </Button>
                </Box>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell />
                            <TableCell>Type</TableCell>
                            <TableCell>Pattern</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {stepPatterns.map((pattern) => (
                            <React.Fragment key={pattern.id}>
                                <TableRow>
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            onClick={() => toggleRow(pattern.id)}
                                        >
                                            {expandedRows[pattern.id] ? (
                                                <KeyboardArrowUpIcon />
                                            ) : (
                                                <KeyboardArrowDownIcon />
                                            )}
                                        </IconButton>
                                    </TableCell>
                                    <TableCell>{pattern.type}</TableCell>
                                    <TableCell>{pattern.pattern}</TableCell>
                                    <TableCell>{pattern.description}</TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleEdit(pattern)}
                                            disabled={pattern.isBuiltIn}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleRemovePattern(pattern.id)}
                                            disabled={pattern.isBuiltIn}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell
                                        style={{ paddingBottom: 0, paddingTop: 0 }}
                                        colSpan={6}
                                    >
                                        <Collapse
                                            in={expandedRows[pattern.id]}
                                            timeout="auto"
                                            unmountOnExit
                                        >
                                            <Box sx={{ margin: 1 }}>
                                                <Typography variant="h6" gutterBottom>
                                                    Implementation
                                                </Typography>
                                                <MonacoEditor
                                                    value={pattern.implementation}
                                                    onChange={(value) =>
                                                        handleImplementationChange(pattern, value)
                                                    }
                                                    language="javascript"
                                                    height="200px"
                                                    readOnly={pattern.isBuiltIn}
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

            <PatternDialog
                open={dialogOpen}
                onClose={() => {
                    setDialogOpen(false);
                    setEditingPattern(null);
                }}
                onSave={handleAddPattern}
                initialData={editingPattern || undefined}
                title={editingPattern ? 'Edit Step Pattern' : 'Add Step Pattern'}
            />
        </Box>
    );
}; 