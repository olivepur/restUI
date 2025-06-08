import React, { useState, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Stack,
    Typography,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Link,
    Box,
    Divider,
    Tooltip,
    InputAdornment,
    Chip,
    Alert,
    useTheme
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GeneratedScenario } from './ScenarioGenerator';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

interface ScenarioEditorProps {
    open: boolean;
    scenario: GeneratedScenario;
    onClose: () => void;
    onSave: (updatedScenario: GeneratedScenario) => void;
    lastResponse?: {
        status: number;
        headers: Record<string, string>;
        body: any;
    };
}

interface Step {
    id: string;
    type: 'Given' | 'When' | 'Then' | 'And';
    content: string;
}

interface StepSuggestion {
    type: Step['type'];
    pattern: string;
    description: string;
    category?: string;
}

const STEP_SUGGESTIONS: StepSuggestion[] = [
    {
        type: 'Given',
        pattern: 'endpoint "https://api.example.com/v1/resource"',
        description: 'Set the API endpoint',
        category: 'Setup'
    },
    {
        type: 'Given',
        pattern: 'header "Authorization" with value "Bearer token"',
        description: 'Set an authorization header',
        category: 'Authentication'
    },
    {
        type: 'Given',
        pattern: 'variable "userId" with value "123"',
        description: 'Set a variable for use in the test',
        category: 'Variables'
    },
    {
        type: 'When',
        pattern: 'send a GET request',
        description: 'Make a GET request to the endpoint',
        category: 'HTTP'
    },
    {
        type: 'When',
        pattern: 'wait for 2 seconds',
        description: 'Add a delay in the test',
        category: 'Timing'
    },
    {
        type: 'Then',
        pattern: 'response should be valid',
        description: 'Verify response is valid (status 200 and valid JSON)',
        category: 'Validation'
    },
    {
        type: 'Then',
        pattern: 'response should be valid with status 201',
        description: 'Verify response has specific status code',
        category: 'Validation'
    },
    {
        type: 'Then',
        pattern: 'header "Content-Type" should be "application/json"',
        description: 'Check response header value',
        category: 'Headers'
    },
    {
        type: 'Then',
        pattern: 'the field.name should be "expectedValue"',
        description: 'Check field value in response',
        category: 'Response'
    }
];

const SortableStep = ({ 
    step, 
    onRemove,
    onUpdate
}: { 
    step: Step; 
    onRemove: () => void;
    onUpdate: (updatedStep: Step) => void;
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(step.content);
    const [editedType, setEditedType] = useState<Step['type']>(step.type);
    const editInputRef = useRef<HTMLInputElement>(null);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition
    } = useSortable({ id: step.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    };

    const handleStartEdit = () => {
        setIsEditing(true);
        setEditedContent(step.content);
        setEditedType(step.type);
    };

    const handleSaveEdit = () => {
        if (editedContent.trim()) {
            onUpdate({
                ...step,
                type: editedType,
                content: editedContent.trim()
            });
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditedContent(step.content);
            setEditedType(step.type);
        }
    };

    useEffect(() => {
        if (isEditing) {
            editInputRef.current?.focus();
        }
    }, [isEditing]);

    return (
        <ListItem
            ref={setNodeRef}
            style={style}
            sx={{
                border: (theme) => `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                mb: 1,
                bgcolor: 'background.paper',
                '&:hover .edit-actions': {
                    opacity: 1
                }
            }}
        >
            <Box {...attributes} {...listeners} sx={{ mr: 1, cursor: 'grab' }}>
                <DragIndicatorIcon color="action" />
            </Box>
            {isEditing ? (
                <Stack direction="row" spacing={2} sx={{ flex: 1, alignItems: 'flex-start' }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                            value={editedType}
                            onChange={(e) => setEditedType(e.target.value as Step['type'])}
                            variant="outlined"
                            size="small"
                        >
                            <MenuItem value="Given">Given</MenuItem>
                            <MenuItem value="When">When</MenuItem>
                            <MenuItem value="Then">Then</MenuItem>
                            <MenuItem value="And">And</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        inputRef={editInputRef}
                        fullWidth
                        size="small"
                        multiline
                        maxRows={3}
                        autoFocus
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <Tooltip title="Save (Enter)">
                                        <IconButton
                                            onClick={handleSaveEdit}
                                            size="small"
                                            color="primary"
                                        >
                                            <CheckIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Cancel (Esc)">
                                        <IconButton
                                            onClick={() => {
                                                setIsEditing(false);
                                                setEditedContent(step.content);
                                                setEditedType(step.type);
                                            }}
                                            size="small"
                                        >
                                            <CloseIcon />
                                        </IconButton>
                                    </Tooltip>
                                </InputAdornment>
                            )
                        }}
                    />
                </Stack>
            ) : (
                <>
                    <ListItemText
                        primary={
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                    label={step.type}
                                    size="small"
                                    color={
                                        step.type === 'Given' ? 'primary' :
                                        step.type === 'When' ? 'secondary' :
                                        'default'
                                    }
                                />
                                <Typography>{step.content}</Typography>
                            </Stack>
                        }
                        onClick={handleStartEdit}
                        sx={{ cursor: 'pointer' }}
                    />
                    <Box 
                        className="edit-actions"
                        sx={{ 
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            display: 'flex',
                            gap: 1
                        }}
                    >
                        <Tooltip title="Edit step">
                            <IconButton
                                size="small"
                                onClick={handleStartEdit}
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove step">
                            <IconButton
                                edge="end"
                                onClick={onRemove}
                                size="small"
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </>
            )}
        </ListItem>
    );
};

export const ScenarioEditor: React.FC<ScenarioEditorProps> = ({
    open,
    scenario,
    onClose,
    onSave,
    lastResponse
}) => {
    const theme = useTheme();
    const [title, setTitle] = useState(scenario.title);
    const [steps, setSteps] = useState<Step[]>(parseSteps(scenario.content));
    const [newStepType, setNewStepType] = useState<Step['type']>('Given');
    const [newStepContent, setNewStepContent] = useState('');
    const [expandedSection, setExpandedSection] = useState<string | false>('given');
    const [searchQuery, setSearchQuery] = useState('');
    const [titleError, setTitleError] = useState('');
    const newStepInputRef = useRef<HTMLInputElement>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function parseSteps(content: string): Step[] {
        return content.split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map((line, index) => {
                const type = line.startsWith('Given') ? 'Given' :
                           line.startsWith('When') ? 'When' :
                           line.startsWith('Then') ? 'Then' : 'And';
                const content = line.replace(type, '').trim();
                return { id: `step-${index}`, type, content };
            });
    }

    const handleAddStep = () => {
        if (newStepContent.trim()) {
            setSteps([...steps, {
                id: `step-${steps.length}`,
                type: newStepType,
                content: newStepContent.trim()
            }]);
            setNewStepContent('');
            newStepInputRef.current?.focus();
        }
    };

    const handleRemoveStep = (stepId: string) => {
        setSteps(steps.filter(step => step.id !== stepId));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setSteps((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSave = () => {
        const content = steps.map(step => `${step.type} ${step.content}`).join('\n');
        onSave({
            ...scenario,
            title,
            content
        });
        onClose();
    };

    const handleStepSuggestionClick = (suggestion: StepSuggestion) => {
        setNewStepType(suggestion.type);
        setNewStepContent(suggestion.pattern);
        newStepInputRef.current?.focus();
    };

    const filteredSuggestions = STEP_SUGGESTIONS.filter(suggestion =>
        suggestion.pattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
        suggestion.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        suggestion.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group suggestions by category
    const groupedSuggestions = filteredSuggestions.reduce((acc, suggestion) => {
        const category = suggestion.category || 'Other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(suggestion);
        return acc;
    }, {} as Record<string, StepSuggestion[]>);

    const handleUpdateStep = (updatedStep: Step) => {
        setSteps(steps.map(step => 
            step.id === updatedStep.id ? updatedStep : step
        ));
    };

    const adjustPathExpression = (path: string, responseBody: any): string => {
        console.log('🔍 Adjusting path:', {
            originalPath: path,
            responseBodyStructure: typeof responseBody === 'object' ? 
                Object.keys(responseBody) : 
                typeof responseBody
        });

        // Handle array index paths like "0" or "0.id"
        const parts = path.split('.');
        let adjustedParts = parts.map((part, index) => {
            // If it's a number, it's likely an array index
            if (/^\d+$/.test(part)) {
                const newPart = index === 0 ? `body[${part}]` : `[${part}]`;
                console.log(`  📝 Converting path part: "${part}" → "${newPart}"`);
                return newPart;
            }
            return part;
        });

        const result = adjustedParts.join('.');
        console.log('  ✅ Adjusted path result:', result);
        return result;
    };

    const getValueFromPath = (obj: any, path: string): any => {
        console.log('🔍 Getting value from path:', {
            path,
            objectStructure: typeof obj === 'object' ? 
                Object.keys(obj) : 
                typeof obj
        });

        const value = path.split('.').reduce((acc, part) => {
            if (acc === undefined) return undefined;
            // Handle array indices
            if (/^\d+$/.test(part)) {
                return acc[parseInt(part)];
            }
            return acc[part];
        }, obj);

        console.log('  ✅ Found value:', {
            type: typeof value,
            isArray: Array.isArray(value),
            preview: value === null ? 'null' :
                    typeof value === 'object' ? 
                        (Array.isArray(value) ? 
                            `Array(${value.length})` : 
                            Object.keys(value)) :
                        String(value)
        });

        return value;
    };

    const inferTypeFromValue = (value: any): string => {
        const type = value === null ? 'null' :
                    Array.isArray(value) ? 'array' :
                    typeof value;
        
        console.log('🔍 Inferring type:', {
            value: typeof value === 'object' ? 
                (Array.isArray(value) ? 
                    `Array(${value.length})` : 
                    Object.keys(value)) :
                value,
            inferredType: type
        });
        
        return type;
    };

    const instrumentalize = () => {
        console.group('🔧 Smart Adjust Process');
        console.log('📊 Response Data Available:', {
            hasResponse: !!lastResponse,
            status: lastResponse?.status,
            bodyType: typeof lastResponse?.body,
            isArray: Array.isArray(lastResponse?.body)
        });

        if (!lastResponse?.body) {
            console.warn('⚠️ No response body available for smart path adjustment');
            console.groupEnd();
            return;
        }

        const newSteps = steps.map(step => {
            let adjustedContent = step.content;
            console.group(`Processing step: ${step.content}`);

            if (step.type === 'Then' || step.type === 'And') {
                // Handle type assertions
                adjustedContent = adjustedContent.replace(
                    /(?:the )?(?:path )?["']?(\d+(?:\.\w+)*|\w+(?:\.\w+)*)["']? should be of type ["'](\w+)["']/g,
                    (match, path, type) => {
                        console.group('  🔄 Processing type assertion');
                        console.log('    Found match:', { path, type });
                        
                        const adjustedPath = adjustPathExpression(path, lastResponse.body);
                        const result = `path "${adjustedPath}" should be of type "${type}"`;
                        
                        console.log('    ✅ Result:', result);
                        console.groupEnd();
                        return result;
                    }
                );

                // Handle object assertions
                adjustedContent = adjustedContent.replace(
                    /(?:the )?(?:path )?["']?(\d+(?:\.\w+)*|\w+(?:\.\w+)*)["']? should be an object/g,
                    (match, path) => {
                        console.group('  🔄 Processing object assertion');
                        console.log('    Found match:', { path });
                        
                        const adjustedPath = adjustPathExpression(path, lastResponse.body);
                        const result = `path "${adjustedPath}" should be an object`;
                        
                        console.log('    ✅ Result:', result);
                        console.groupEnd();
                        return result;
                    }
                );

                // Handle array assertions
                adjustedContent = adjustedContent.replace(
                    /(?:the )?(?:path )?["']?(\d+(?:\.\w+)*|\w+(?:\.\w+)*)["']? should be an array/g,
                    (match, path) => {
                        console.group('  🔄 Processing array assertion');
                        console.log('    Found match:', { path });
                        
                        const adjustedPath = adjustPathExpression(path, lastResponse.body);
                        const result = `path "${adjustedPath}" should be an array`;
                        
                        console.log('    ✅ Result:', result);
                        console.groupEnd();
                        return result;
                    }
                );

                // Handle direct value assertions
                adjustedContent = adjustedContent.replace(
                    /(?:the )?["']?(\d+(?:\.\w+)*|\w+(?:\.\w+)*)["']? should be ["']([^"']+)["']/g,
                    (match, path, expectedValue) => {
                        console.group('  🔄 Processing value assertion');
                        console.log('    Found match:', { path, expectedValue });
                        
                        const adjustedPath = adjustPathExpression(path, lastResponse.body);
                        const result = `path "${adjustedPath}" should be "${expectedValue}"`;
                        
                        console.log('    ✅ Result:', result);
                        console.groupEnd();
                        return result;
                    }
                );

                // Status checks
                adjustedContent = adjustedContent.replace(
                    /(?:the )?status should be (\d+)/,
                    (match, status) => {
                        console.group('  🔄 Processing status check');
                        const statusMap: { [key: string]: string } = {
                            '200': 'response status should be 200',
                            '201': 'response status should be 201',
                            '204': 'response status should be 204',
                            '400': 'response status should be 400',
                            '401': 'response status should be 401',
                            '403': 'response status should be 403',
                            '404': 'response status should be 404',
                            '409': 'response status should be 409',
                            '500': 'response status should be 500'
                        };
                        const result = statusMap[status] || match;
                        console.log('    ✅ Result:', result);
                        console.groupEnd();
                        return result;
                    }
                );
            }

            if (adjustedContent !== step.content) {
                console.log('  ✨ Step adjusted:', {
                    from: step.content,
                    to: adjustedContent
                });
            } else {
                console.log('  ℹ️ No adjustments needed');
            }

            console.groupEnd();
            return {
                ...step,
                content: adjustedContent
            };
        });

        console.log('📊 Summary of changes:', {
            originalStepCount: steps.length,
            adjustedStepCount: newSteps.length,
            changedSteps: newSteps.filter((step, i) => step.content !== steps[i].content).length
        });

        setSteps(newSteps);
        console.groupEnd();
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="md" 
            fullWidth
            PaperProps={{
                sx: { minHeight: '80vh' }
            }}
        >
            <DialogTitle>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Edit Scenario</Typography>
                    <Tooltip title="Press Enter to add a step, Ctrl+S to save, Esc to cancel">
                        <HelpOutlineIcon color="action" />
                    </Tooltip>
                </Stack>
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 2 }}>
                    <TextField
                        label="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                    />
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Stack spacing={1} sx={{ flex: 1 }}>
                            {steps.map((step, index) => (
                                <Stack 
                                    key={step.id} 
                                    direction="row" 
                                    spacing={1} 
                                    alignItems="center"
                                >
                                    <TextField
                                        value={step.content}
                                        onChange={(e) => handleUpdateStep({
                                            ...step,
                                            content: e.target.value
                                        })}
                                        fullWidth
                                        size="small"
                                    />
                                    <IconButton
                                        size="small"
                                        onClick={() => handleRemoveStep(step.id)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Stack>
                            ))}
                            <Button
                                startIcon={<AddIcon />}
                                onClick={handleAddStep}
                                variant="outlined"
                                size="small"
                            >
                                Add Step
                            </Button>
                        </Stack>
                        <Tooltip title="Smart Adjust - Automatically improve test steps using response data">
                            <Button
                                onClick={instrumentalize}
                                variant="contained"
                                color="secondary"
                                startIcon={<AutoFixHighIcon />}
                                sx={{ 
                                    minWidth: 'auto',
                                    alignSelf: 'flex-start',
                                    px: 2,
                                    py: 1
                                }}
                            >
                                Smart Adjust
                            </Button>
                        </Tooltip>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained" 
                    color="primary"
                >
                    Save Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
}; 