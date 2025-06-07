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
import { GeneratedScenario } from './scenarioGenerator';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';

interface ScenarioEditorProps {
    open: boolean;
    scenario: GeneratedScenario;
    onClose: () => void;
    onSave: (updatedScenario: GeneratedScenario) => void;
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
    onSave
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
        if (!title.trim()) {
            setTitleError('Title is required');
            return;
        }

        const content = steps
            .map(step => `${step.type} ${step.content}`)
            .join('\n');
        
        onSave({
            id: `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: title.trim(),
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
                <Stack spacing={3}>
                    <TextField
                        label="Scenario Title"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            setTitleError('');
                        }}
                        fullWidth
                        margin="normal"
                        error={!!titleError}
                        helperText={titleError}
                        required
                    />

                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Steps
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                (drag to reorder)
                            </Typography>
                        </Typography>

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={steps}
                                strategy={verticalListSortingStrategy}
                            >
                                <List>
                                    {steps.map((step) => (
                                        <SortableStep
                                            key={step.id}
                                            step={step}
                                            onRemove={() => handleRemoveStep(step.id)}
                                            onUpdate={handleUpdateStep}
                                        />
                                    ))}
                                </List>
                            </SortableContext>
                        </DndContext>
                    </Box>

                    <Stack spacing={2}>
                        <Typography variant="subtitle1" gutterBottom>
                            Add New Step
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="flex-start">
                            <FormControl sx={{ minWidth: 120 }}>
                                <InputLabel>Step Type</InputLabel>
                                <Select
                                    value={newStepType}
                                    onChange={(e) => setNewStepType(e.target.value as Step['type'])}
                                    label="Step Type"
                                >
                                    <MenuItem value="Given">Given</MenuItem>
                                    <MenuItem value="When">When</MenuItem>
                                    <MenuItem value="Then">Then</MenuItem>
                                    <MenuItem value="And">And</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                label="New Step Content"
                                value={newStepContent}
                                onChange={(e) => setNewStepContent(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAddStep();
                                    }
                                }}
                                fullWidth
                                multiline
                                rows={2}
                                inputRef={newStepInputRef}
                            />
                            <Tooltip title="Add step (Enter)">
                                <Button
                                    variant="contained"
                                    onClick={handleAddStep}
                                    disabled={!newStepContent.trim()}
                                    startIcon={<AddIcon />}
                                >
                                    Add
                                </Button>
                            </Tooltip>
                        </Stack>
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Step Suggestions
                        </Typography>

                        <TextField
                            fullWidth
                            placeholder="Search suggestions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            sx={{ mb: 2 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                )
                            }}
                        />

                        {Object.entries(groupedSuggestions).map(([category, suggestions]) => (
                            <Accordion
                                key={category}
                                expanded={expandedSection === category.toLowerCase()}
                                onChange={() => setExpandedSection(expandedSection === category.toLowerCase() ? false : category.toLowerCase())}
                            >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography color="primary">{category}</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <List dense>
                                        {suggestions.map((suggestion, index) => (
                                            <ListItem key={index}>
                                                <ListItemText
                                                    primary={
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Chip
                                                                label={suggestion.type}
                                                                size="small"
                                                                color={
                                                                    suggestion.type === 'Given' ? 'primary' :
                                                                    suggestion.type === 'When' ? 'secondary' :
                                                                    'default'
                                                                }
                                                            />
                                                            <Link
                                                                component="button"
                                                                variant="body2"
                                                                onClick={() => handleStepSuggestionClick(suggestion)}
                                                                sx={{ textAlign: 'left' }}
                                                            >
                                                                {suggestion.pattern}
                                                            </Link>
                                                        </Stack>
                                                    }
                                                    secondary={suggestion.description}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained" 
                    color="primary"
                    disabled={!title.trim() || steps.length === 0}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}; 