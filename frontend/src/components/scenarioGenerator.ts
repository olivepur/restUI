import { runScenario, ScenarioRunnerConfig } from './ScenarioRunner';

export interface GeneratedScenario {
    title: string;
    content: string;
}

export interface ScenarioGeneratorConfig {
    apiPath: string;
    response: any;
    // Additional configuration options can be added here
    includeEnvironmentTests?: boolean;
    customScenarios?: GeneratedScenario[];
}

export interface ScenarioHandlerConfig {
    onApiCall?: (method: string, url: string, request: any, response: any) => void;
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: string;
    lastResponse?: any;
    hasTestedRequest: boolean;
}

export function extractScenarioTitle(content: string): string {
    const scenarioMatch = content.match(/Scenario:([^\n]+)/);
    return scenarioMatch ? scenarioMatch[1].trim() : 'Untitled Scenario';
}

export async function handlePlayScenario(
    scenario: GeneratedScenario,
    config: { onApiCall?: (method: string, url: string, request: any, response: any) => void; path: string; headers: Record<string, string> }
): Promise<void> {
    const runnerConfig: ScenarioRunnerConfig = {
        onApiCall: config.onApiCall,
        scenario,
        apiPath: config.path,
        headers: config.headers
    };

    await runScenario(runnerConfig);
}

export function handleEditScenario(scenario: GeneratedScenario): void {
    // TODO: Implement scenario editing
    console.log('Editing scenario:', scenario.title);
}

export function handleGenerateScenarios(config: ScenarioHandlerConfig): GeneratedScenario[] | null {
    const { onApiCall, method, path, headers, body, lastResponse, hasTestedRequest } = config;

    if (!hasTestedRequest) {
        if (onApiCall) {
            onApiCall(
                method,
                path,
                {
                    method,
                    headers,
                    body: method !== 'GET' ? body : undefined
                },
                {
                    status: 400,
                    headers: {},
                    body: { error: 'Please test the request before generating scenarios' }
                }
            );
        }
        return null;
    }

    try {
        const formattedScenarios = generateScenarios({
            apiPath: path,
            response: lastResponse,
            includeEnvironmentTests: true
        });

        // Log the generated scenarios
        if (onApiCall) {
            onApiCall(
                'GENERATE',
                'scenarios',
                {
                    method,
                    headers,
                    body: method !== 'GET' ? body : undefined
                },
                {
                    status: 200,
                    headers: {},
                    body: {
                        message: 'Generated test scenarios',
                        scenarios: formattedScenarios
                    }
                }
            );
        }

        return formattedScenarios;
    } catch (error) {
        console.error('Error generating scenarios:', error);
        if (onApiCall) {
            onApiCall(
                'GENERATE',
                'scenarios',
                {
                    method,
                    headers,
                    body: method !== 'GET' ? body : undefined
                },
                {
                    status: 500,
                    headers: {},
                    body: { error: 'Failed to generate scenarios' }
                }
            );
        }
        return null;
    }
}

function generateBasicValidationScenarios(config: ScenarioGeneratorConfig): GeneratedScenario[] {
    const { apiPath, response } = config;
    
    const scenarios: GeneratedScenario[] = [];

    // Add feature description
    const featureDescription = `Feature: API Response Validation
  As an API consumer
  I want to verify the API response
  So that I can ensure the data is correct and complete

  Background:
    Given the API endpoint is "${apiPath}"
    And I am using a valid authentication token
    And I send a request to the endpoint
`;

    // Basic response validation
    scenarios.push({
        title: "Basic response validation",
        content: `${featureDescription}
  Scenario: Basic response validation
    Then the response should be valid
    And the response should have required fields`
    });

    // Generate scenarios based on response structure
    if (response && typeof response === 'object') {
        // Status validation if present
        if ('status' in response) {
            scenarios.push({
                title: "Status validation",
                content: `  Scenario: Status validation
    Then the response status should be ${response.status}
    And the response should be successful`
            });
        }

        // Generate scenarios for each top-level property
        Object.entries(response).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                scenarios.push({
                    title: `Validate ${key} section`,
                    content: `  Scenario: Validate ${key} section
    Then the ${key} section should be present
    And the ${key} section should be properly formatted`
                });
            }
        });
    }

    return scenarios;
}

function processObject(obj: any, path: string[] = [], scenarios: GeneratedScenario[] = []): void {
    Object.entries(obj).forEach(([key, value]) => {
        const currentPath = [...path, key];
        const readablePath = currentPath.join(' ');

        if (Array.isArray(value)) {
            // Array validation
            scenarios.push({
                title: `Validate ${readablePath} array`,
                content: `  Scenario: Validate ${readablePath} array
    Then the ${readablePath} should be an array
    And the ${readablePath} should not be empty
    And each item in ${readablePath} should be valid`
            });
        } else if (typeof value === 'object' && value !== null) {
            // Object validation
            scenarios.push({
                title: `Validate ${readablePath} object`,
                content: `  Scenario: Validate ${readablePath} object
    Then the ${readablePath} should be present
    And the ${readablePath} should have all required properties`
            });
            processObject(value, currentPath, scenarios);
        }
    });
}

function generateDataValidationScenarios(config: ScenarioGeneratorConfig): GeneratedScenario[] {
    const { response } = config;
    const scenarios: GeneratedScenario[] = [];

    if (response && typeof response === 'object') {
        processObject(response, [], scenarios);
    }

    return scenarios;
}

function generateEnvironmentScenarios(config: ScenarioGeneratorConfig): GeneratedScenario[] {
    if (!config.includeEnvironmentTests) {
        return [];
    }

    return [{
        title: "Environment variable handling",
        content: `  Scenario: Environment variable handling
    When I set the environment variable "variable" to "value1"
    Then the environment variable "variable" should have value "value1"`
    }];
}

export function generateScenarios(config: ScenarioGeneratorConfig): GeneratedScenario[] {
    const scenarios: GeneratedScenario[] = [
        ...generateBasicValidationScenarios(config),
        ...generateDataValidationScenarios(config),
        ...generateEnvironmentScenarios(config),
        ...(config.customScenarios || [])
    ];

    return scenarios.map(scenario => ({
        ...scenario,
        content: scenario.content.trim()
    }));
} 