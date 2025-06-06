import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Stack,
    IconButton,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const STORAGE_KEY = 'scenarioDesigner';

interface ScenarioDesignerPageProps {
    onApiCall?: (method: string, url: string, request: any, response: any) => void;
}

interface Interaction {
    method: string;
    path: string;
    headers: Record<string, string>;
    body: string;
    lastResponse?: any;
    scenarios?: GeneratedScenario[];
}

interface DeviceContent {
    semanticId: number;
    value: string;
}

interface Device {
    number: string;
    indicatorId: number;
    diagnosticAddress16bit: string;
    rateFlag: string;
    type: string;
    content: DeviceContent[];
}

interface VehicleResponse {
    vehicleDeviceInformation: {
        value: Device[];
        status: number;
        message: string;
    };
    ecu: {
        value: any[];
        status: number;
        message: string;
    };
    nonEcu: {
        value: any[];
        status: string;
        message: string;
    };
}

interface GeneratedScenario {
    title: string;
    content: string;
}

export const ScenarioDesignerPage: React.FC<ScenarioDesignerPageProps> = ({ onApiCall }) => {
    // Load saved state from localStorage
    const loadSavedState = (): Interaction => {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                return {
                    method: parsed.method || 'GET',
                    path: parsed.path || '',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': parsed.headers?.Authorization || 'Bearer ',
                        ...parsed.headers
                    },
                    body: parsed.body || '',
                    lastResponse: parsed.lastResponse,
                    scenarios: parsed.scenarios || []
                };
            } catch (e) {
                console.error('Error parsing saved state:', e);
            }
        }
        return {
            method: 'GET',
            path: '',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '
            },
            body: '',
            lastResponse: undefined,
            scenarios: []
        };
    };

    const [interaction, setInteraction] = useState<Interaction>(loadSavedState);
    const [hasTestedRequest, setHasTestedRequest] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [expandedScenario, setExpandedScenario] = useState<string | false>(false);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            method: interaction.method,
            path: interaction.path,
            headers: interaction.headers,
            body: interaction.body,
            lastResponse: interaction.lastResponse,
            scenarios: interaction.scenarios || []
        }));
    }, [interaction]);

    const handleHeaderChange = (oldKey: string, newKey: string, value: string) => {
        setInteraction(prev => {
            const newHeaders = { ...prev.headers };
            if (oldKey !== newKey) {
                delete newHeaders[oldKey];
            }
            newHeaders[newKey] = value;
            return { ...prev, headers: newHeaders };
        });
    };

    const handleAddHeader = () => {
        setInteraction(prev => ({
            ...prev,
            headers: { ...prev.headers, '': '' }
        }));
    };

    const handleRemoveHeader = (key: string) => {
        // Prevent removing required headers
        if (key === 'Content-Type' || key === 'Authorization') {
            return;
        }
        setInteraction(prev => {
            const newHeaders = { ...prev.headers };
            delete newHeaders[key];
            return { ...prev, headers: newHeaders };
        });
    };

    const handleScenarioChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpandedScenario(isExpanded ? panel : false);
    };

    const handlePlayScenario = (scenario: GeneratedScenario) => {
        // TODO: Implement scenario execution
        console.log('Playing scenario:', scenario.title);
    };

    const handleEditScenario = (scenario: GeneratedScenario) => {
        // TODO: Implement scenario editing
        console.log('Editing scenario:', scenario.title);
    };

    const handleDeleteScenario = (scenario: GeneratedScenario) => {
        setInteraction(prev => ({
            ...prev,
            scenarios: prev.scenarios?.filter(s => s !== scenario)
        }));
    };

    const extractScenarioTitle = (content: string): string => {
        const scenarioMatch = content.match(/Scenario:([^\n]+)/);
        return scenarioMatch ? scenarioMatch[1].trim() : 'Untitled Scenario';
    };

    const handleGenerateScenarios = () => {
        if (!hasTestedRequest) {
            if (onApiCall) {
                onApiCall(
                    interaction.method,
                    interaction.path,
                    {
                        method: interaction.method,
                        headers: interaction.headers,
                        body: interaction.method !== 'GET' ? interaction.body : undefined
                    },
                    {
                        status: 400,
                        headers: {},
                        body: { error: 'Please test the request before generating scenarios' }
                    }
                );
            }
            return;
        }

        try {
            // Get the last response from the interaction
            const lastResponse = interaction.lastResponse as VehicleResponse;
            if (!lastResponse) {
                throw new Error('No response data available');
            }

            const vehicle = lastResponse.vehicleDeviceInformation;
            const ecu = lastResponse.ecu;
            const nonEcu = lastResponse.nonEcu;

            // Find specific devices from the response
            const bop = vehicle.value.find(d => d.number === "B0P");
            const boq = vehicle.value.find(d => d.number === "B0Q");

            const scenarios = [
                // Feature Overview
                `Feature: Vehicle Device Information API Tests
  As an API consumer
  I want to verify the vehicle device information
  So that I can ensure the data is correct and complete

  Background:
    Given the API endpoint is "${interaction.path}"
    And I am using a valid authentication token
    And I send a GET request to the endpoint
`,
                // Basic Checks
                `  Scenario: Basic response validation
    Then the response status code should be 200
    And the response body should exist
    And the vehicleDeviceInformation section should be present
`,
                // Vehicle Element Validation
                `  Scenario: Vehicle element validation
    Then the vehicleDeviceInformation section should:
      | Property | Value |
      | status   | ${vehicle.status} |
    And the vehicleDeviceInformation should contain a list of devices
`,
                // B0P Device Tests
                ...(bop ? [`  Scenario: Validate B0P device information
    When I find the device with number "B0P"
    Then the device should have the following properties:
      | Property             | Value |
      | number              | ${bop.number} |
      | indicatorId         | ${bop.indicatorId} |
      | diagnosticAddress   | ${bop.diagnosticAddress16bit} |
      | rateFlag           | ${bop.rateFlag} |
    And the device type should be empty
    And the device should have semantic content:
      | SemanticId | Value |
${bop.content.map(c => `      | ${c.semanticId.toString().padStart(10)} | ${c.value.trim()} |`).join('\n')}`] : []),

                // B0Q Device Tests
                ...(boq ? [`  Scenario: Validate B0Q device information
    When I find the device with number "B0Q"
    Then the device should have the following properties:
      | Property             | Value |
      | number              | ${boq.number} |
      | indicatorId         | ${boq.indicatorId} |
      | diagnosticAddress   | ${boq.diagnosticAddress16bit} |
      | rateFlag           | ${boq.rateFlag} |
    And the device type should be empty
    And the device should have semantic content:
      | SemanticId | Value |
${boq.content.map(c => `      | ${c.semanticId.toString().padStart(10)} | ${c.value.trim()} |`).join('\n')}

    Scenario: Validate B0Q revision information
    When I find the device with number "B0Q"
    And I get the revision from environment variable "Revision0001a"
    Then the semantic content with ID 96 should match the revision`] : []),

                // ECU Error Tests
                `  Scenario: ECU error validation
    Then the ECU section should have the following properties:
      | Property | Value |
      | status   | ${ecu.status} |
      | message  | ${ecu.message} |
    And the ECU value list should be empty`,

                // Non-ECU Error Tests
                `  Scenario: Non-ECU error validation
    Then the Non-ECU section should have the following properties:
      | Property | Value |
      | status   | ${nonEcu.status} |
      | message  | ${nonEcu.message} |
    And the Non-ECU value list should be empty`,

                // Environment Variable Test
                `  Scenario: Environment variable handling
    When I set the environment variable "variable" to "value1"
    Then the environment variable "variable" should have value "value1"`
            ];

            const formattedScenarios: GeneratedScenario[] = scenarios
                .filter(s => s.trim().startsWith('  Scenario:'))
                .map(content => ({
                    title: extractScenarioTitle(content),
                    content: content.trim()
                }));

            // Store scenarios in the interaction state
            setInteraction(prev => ({
                ...prev,
                scenarios: formattedScenarios
            }));

            // Log the generated scenarios
            if (onApiCall) {
                onApiCall(
                    'GENERATE',
                    'scenarios',
                    {
                        method: interaction.method,
                        headers: interaction.headers,
                        body: interaction.method !== 'GET' ? interaction.body : undefined
                    },
                    {
                        status: 200,
                        headers: {},
                        body: {
                            message: 'Generated test scenarios',
                            scenarios: formattedScenarios
                        },
                        test: {
                            script: scenarios.join('\n\n'),
                            enabled: true
                        }
                    }
                );
            }
        } catch (error) {
            // Handle scenario generation error
            if (onApiCall) {
                onApiCall(
                    'GENERATE',
                    'scenarios',
                    {
                        method: interaction.method,
                        headers: interaction.headers,
                        body: interaction.method !== 'GET' ? interaction.body : undefined
                    },
                    {
                        status: 400,
                        headers: {},
                        body: {
                            error: 'Failed to generate scenarios',
                            message: error instanceof Error ? error.message : 'Invalid response format',
                            details: 'Make sure you have executed a successful API test first'
                        }
                    }
                );
            }
        }
    };

    const runTest = async () => {
        try {
            const originalUrl = interaction.path.trim();
            const requestUrl = originalUrl.startsWith('http') 
                ? `http://localhost:8080/api/proxy${originalUrl.replace('https://api.int.group-vehicle-file.com', '')}`
                : `http://localhost:8080${interaction.path.startsWith('/') ? interaction.path : `/${interaction.path}`}`;

            console.log('Making request to:', requestUrl);
            console.log('Method:', interaction.method);

            // Prepare headers with defaults
            const requestHeaders: Record<string, string> = {
                'Accept': 'application/json',
                ...interaction.headers
            };

            // Remove content-type for GET requests
            if (interaction.method === 'GET' && 'Content-Type' in requestHeaders) {
                delete requestHeaders['Content-Type'];
            }

            console.log('Headers:', requestHeaders);
            console.log('Body:', interaction.method !== 'GET' ? interaction.body : 'No body for GET request');

            const request = {
                method: interaction.method,
                headers: requestHeaders,
                body: interaction.method !== 'GET' ? interaction.body : undefined
            };

            const response = await fetch(requestUrl, request);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}\nResponse: ${errorText}`);
            }

            let data: VehicleResponse | { text: string };
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json() as VehicleResponse;
            } else {
                const text = await response.text();
                try {
                    data = JSON.parse(text) as VehicleResponse;
                } catch (e) {
                    data = { text };
                }
            }

            // Store the response data for scenario generation
            setInteraction(prev => ({
                ...prev,
                lastResponse: data
            }));

            // Log the API call
            if (onApiCall) {
                onApiCall(
                    interaction.method,
                    requestUrl,
                    request,
                    {
                        status: response.status,
                        headers: Object.fromEntries(response.headers.entries()),
                        body: data
                    }
                );
            }

            setHasTestedRequest(true);
        } catch (error) {
            console.error('Error details:', error);
            let errorMessage = 'Failed to execute test';
            
            if (error instanceof Error) {
                errorMessage = `Error: ${error.message}`;
            }
            
            const errorResponse = {
                error: errorMessage,
                details: 'Check the browser console (F12) for more details',
                possibleSolutions: [
                    'Check if your Bearer token is valid',
                    'Verify the URL is correct and accessible',
                    'Check the browser console for detailed error messages'
                ]
            };

            // Log the failed API call
            if (onApiCall) {
                onApiCall(
                    interaction.method,
                    interaction.path,
                    {
                        method: interaction.method,
                        headers: interaction.headers,
                        body: interaction.method !== 'GET' ? interaction.body : undefined
                    },
                    {
                        status: 500,
                        headers: {},
                        body: errorResponse
                    }
                );
            }
            
            setHasTestedRequest(false);
        }
    };

    return (
        <Container maxWidth="lg">
            <Box ref={containerRef} sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Scenario Designer
                </Typography>

                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Request Details
                    </Typography>

                    <Stack spacing={3}>
                        <FormControl>
                            <InputLabel>Method</InputLabel>
                            <Select
                                value={interaction.method}
                                onChange={(e) => setInteraction(prev => ({ ...prev, method: e.target.value }))}
                                label="Method"
                            >
                                {HTTP_METHODS.map(method => (
                                    <MenuItem key={method} value={method}>{method}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Path"
                            value={interaction.path}
                            onChange={(e) => setInteraction(prev => ({ ...prev, path: e.target.value }))}
                            fullWidth
                        />

                        <Box>
                            <Typography variant="subtitle1" gutterBottom>
                                Headers
                            </Typography>
                            {Object.entries(interaction.headers).map(([key, value], index) => (
                                <Stack key={index} direction="row" spacing={2} sx={{ mb: 2 }}>
                                    <TextField
                                        label="Key"
                                        value={key}
                                        onChange={(e) => handleHeaderChange(key, e.target.value, value)}
                                        sx={{ flex: 1 }}
                                    />
                                    <TextField
                                        label="Value"
                                        value={value}
                                        onChange={(e) => handleHeaderChange(key, key, e.target.value)}
                                        sx={{ flex: 2 }}
                                    />
                                    <IconButton onClick={() => handleRemoveHeader(key)} color="error">
                                        <DeleteIcon />
                                    </IconButton>
                                </Stack>
                            ))}
                            <Button
                                startIcon={<AddIcon />}
                                onClick={handleAddHeader}
                                variant="outlined"
                                size="small"
                            >
                                Add Header
                            </Button>
                        </Box>

                        {interaction.method !== 'GET' && (
                            <TextField
                                label="Request Body"
                                value={interaction.body}
                                onChange={(e) => setInteraction(prev => ({ ...prev, body: e.target.value }))}
                                multiline
                                rows={4}
                                fullWidth
                            />
                        )}
                    </Stack>
                </Paper>

                <Paper sx={{ p: 3, mb: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6">
                            Test Controls
                        </Typography>
                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="contained"
                                onClick={runTest}
                                startIcon={<PlayArrowIcon />}
                                color="primary"
                            >
                                Run Test
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleGenerateScenarios}
                                startIcon={<AddIcon />}
                                disabled={!hasTestedRequest}
                                color="secondary"
                            >
                                Generate Scenarios
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>

                {interaction.scenarios && interaction.scenarios.length > 0 && (
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Generated Scenarios
                        </Typography>
                        <Box>
                            {interaction.scenarios.map((scenario, index) => (
                                <Accordion
                                    key={index}
                                    expanded={expandedScenario === `scenario-${index}`}
                                    onChange={handleScenarioChange(`scenario-${index}`)}
                                >
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        sx={{
                                            '& .MuiAccordionSummary-content': {
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }
                                        }}
                                    >
                                        <Typography>{scenario.title}</Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Tooltip title="Run scenario">
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePlayScenario(scenario);
                                                    }}
                                                >
                                                    <PlayArrowIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Edit scenario">
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditScenario(scenario);
                                                    }}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete scenario">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteScenario(scenario);
                                                    }}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Paper
                                            sx={{
                                                p: 2,
                                                bgcolor: 'grey.50',
                                                fontFamily: 'monospace',
                                                whiteSpace: 'pre-wrap'
                                            }}
                                        >
                                            {scenario.content}
                                        </Paper>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Box>
                    </Paper>
                )}
            </Box>
        </Container>
    );
}; 