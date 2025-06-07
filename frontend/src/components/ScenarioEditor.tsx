import React, { useState } from 'react';
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
    Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { GeneratedScenario } from './scenarioGenerator';

interface ScenarioEditorProps {
    open: boolean;
    scenario: GeneratedScenario;
    onClose: () => void;
    onSave: (updatedScenario: GeneratedScenario) => void;
}

interface Step {
    type: 'Given' | 'When' | 'Then' | 'And';
    content: string;
}

interface StepSuggestion {
    type: Step['type'];
    pattern: string;
    description: string;
}

const STEP_SUGGESTIONS: StepSuggestion[] = [
    {
        type: 'Given',
        pattern: 'the API endpoint "your-endpoint-here"',
        description: 'Set the API endpoint for the request'
    },
    {
        type: 'Given',
        pattern: 'header "Header-Name" with value "header-value"',
        description: 'Set a request header'
    },
    {
        type: 'Given',
        pattern: 'variable "variable-name" with value "variable-value"',
        description: 'Set a variable for later use'
    },
    {
        type: 'When',
        pattern: 'I send a GET request',
        description: 'Send a GET request to the endpoint'
    },
    {
        type: 'When',
        pattern: 'I wait for 5 seconds',
        description: 'Wait for a specified number of seconds'
    },
    {
        type: 'Then',
        pattern: 'the response should be valid',
        description: 'Check if response is valid (status 200 and valid JSON)'
    },
    {
        type: 'Then',
        pattern: 'response should be valid with status 404',
        description: 'Check response validity with specific status code'
    },
    {
        type: 'Then',
        pattern: 'status should be 200',
        description: 'Check response status code'
    },
    {
        type: 'Then',
        pattern: 'path "some.json.path" should be value',
        description: 'Check value at specific JSON path'
    },
    {
        type: 'Then',
        pattern: 'should have 5 items',
        description: 'Check array length in response'
    },
    {
        type: 'Then',
        pattern: 'header "Content-Type" should be "application/json"',
        description: 'Check response header value'
    },
    {
        type: 'Then',
        pattern: 'variable "myVar" should be "expectedValue"',
        description: 'Check variable value'
    },
    {
        type: 'Then',
        pattern: 'the field.name should be "expectedValue"',
        description: 'Check field value in response'
    }
];

export const ScenarioEditor: React.FC<ScenarioEditorProps> = ({
    open,
    scenario,
    onClose,
    onSave
}) => {
    // Parse steps from scenario content
    const parseSteps = (content: string): Step[] => {
        return content.split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map(line => {
                const type = line.startsWith('Given') ? 'Given' :
                           line.startsWith('When') ? 'When' :
                           line.startsWith('Then') ? 'Then' : 'And';
                const content = line.replace(type, '').trim();
                return { type, content };
            });
    };

    const [title, setTitle] = useState(scenario.title);
    const [steps, setSteps] = useState<Step[]>(parseSteps(scenario.content));
    const [newStepType, setNewStepType] = useState<Step['type']>('Given');
    const [newStepContent, setNewStepContent] = useState('');
    const [expandedSection, setExpandedSection] = useState<string | false>('given');

    const handleAddStep = () => {
        if (newStepContent.trim()) {
            setSteps([...steps, { type: newStepType, content: newStepContent.trim() }]);
            setNewStepContent('');
        }
    };

    const handleRemoveStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index));
    };

    const handleMoveStep = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= steps.length) return;
        const newSteps = [...steps];
        const [removed] = newSteps.splice(fromIndex, 1);
        newSteps.splice(toIndex, 0, removed);
        setSteps(newSteps);
    };

    const handleSave = () => {
        const content = steps
            .map(step => `${step.type} ${step.content}`)
            .join('\n');
        
        onSave({
            title,
            content
        });
        onClose();
    };

    const handleStepSuggestionClick = (suggestion: StepSuggestion) => {
        setNewStepType(suggestion.type);
        setNewStepContent(suggestion.pattern);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Edit Scenario</DialogTitle>
            <DialogContent>
                <Stack spacing={3}>
                    <TextField
                        label="Scenario Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                        margin="normal"
                    />

                    <Typography variant="h6">Steps</Typography>
                    <List>
                        {steps.map((step, index) => (
                            <ListItem
                                key={index}
                                sx={{
                                    border: '1px solid #ddd',
                                    borderRadius: 1,
                                    mb: 1
                                }}
                            >
                                <IconButton
                                    size="small"
                                    sx={{ mr: 1 }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        // Enable drag and drop functionality here if needed
                                    }}
                                >
                                    <DragIndicatorIcon />
                                </IconButton>
                                <ListItemText
                                    primary={
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography
                                                component="span"
                                                color="primary"
                                                sx={{ minWidth: 60 }}
                                            >
                                                {step.type}
                                            </Typography>
                                            <Typography component="span">
                                                {step.content}
                                            </Typography>
                                        </Stack>
                                    }
                                />
                                <ListItemSecondaryAction>
                                    <IconButton
                                        edge="end"
                                        onClick={() => handleRemoveStep(index)}
                                        size="small"
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>

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
                            fullWidth
                            multiline
                            rows={2}
                        />
                        <Button
                            variant="contained"
                            onClick={handleAddStep}
                            disabled={!newStepContent.trim()}
                            startIcon={<AddIcon />}
                        >
                            Add
                        </Button>
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="h6" gutterBottom>
                        Step Suggestions
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                        <Accordion 
                            expanded={expandedSection === 'given'}
                            onChange={() => setExpandedSection(expandedSection === 'given' ? false : 'given')}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography color="primary">Given Steps</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <List dense>
                                    {STEP_SUGGESTIONS.filter(s => s.type === 'Given').map((suggestion, index) => (
                                        <ListItem key={index}>
                                            <ListItemText
                                                primary={
                                                    <Link
                                                        component="button"
                                                        variant="body2"
                                                        onClick={() => handleStepSuggestionClick(suggestion)}
                                                        sx={{ textAlign: 'left' }}
                                                    >
                                                        {suggestion.pattern}
                                                    </Link>
                                                }
                                                secondary={suggestion.description}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </AccordionDetails>
                        </Accordion>

                        <Accordion 
                            expanded={expandedSection === 'when'}
                            onChange={() => setExpandedSection(expandedSection === 'when' ? false : 'when')}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography color="primary">When Steps</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <List dense>
                                    {STEP_SUGGESTIONS.filter(s => s.type === 'When').map((suggestion, index) => (
                                        <ListItem key={index}>
                                            <ListItemText
                                                primary={
                                                    <Link
                                                        component="button"
                                                        variant="body2"
                                                        onClick={() => handleStepSuggestionClick(suggestion)}
                                                        sx={{ textAlign: 'left' }}
                                                    >
                                                        {suggestion.pattern}
                                                    </Link>
                                                }
                                                secondary={suggestion.description}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </AccordionDetails>
                        </Accordion>

                        <Accordion 
                            expanded={expandedSection === 'then'}
                            onChange={() => setExpandedSection(expandedSection === 'then' ? false : 'then')}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography color="primary">Then Steps</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <List dense>
                                    {STEP_SUGGESTIONS.filter(s => s.type === 'Then').map((suggestion, index) => (
                                        <ListItem key={index}>
                                            <ListItemText
                                                primary={
                                                    <Link
                                                        component="button"
                                                        variant="body2"
                                                        onClick={() => handleStepSuggestionClick(suggestion)}
                                                        sx={{ textAlign: 'left' }}
                                                    >
                                                        {suggestion.pattern}
                                                    </Link>
                                                }
                                                secondary={suggestion.description}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </AccordionDetails>
                        </Accordion>
                    </Box>
                </Stack>
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