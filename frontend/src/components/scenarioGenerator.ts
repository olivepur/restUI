export interface GeneratedScenario {
    title: string;
    content: string;
}

export interface ScenarioGeneratorConfig {
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: string;
    lastResponse?: any;
    includeEnvironmentTests?: boolean;
    onApiCall?: (method: string, url: string, request: any, response: any) => void;
    hasTestedRequest: boolean;
}

export function extractScenarioTitle(content: string): string {
    const scenarioMatch = content.match(/Scenario:([^\n]+)/);
    return scenarioMatch ? scenarioMatch[1].trim() : 'Untitled Scenario';
}

export function handleGenerateScenarios(config: ScenarioGeneratorConfig): GeneratedScenario[] | null {
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
        const scenarios: GeneratedScenario[] = [];

        // Basic API test scenario
        scenarios.push({
            title: "Basic API test",
            content: `Feature: API Testing
  Scenario: Basic API request test
    Given the API endpoint "${path}"
    When I send a ${method} request
    Then the response should be valid`
        });

        // Add response validation if we have a last response
        if (lastResponse) {
            scenarios.push({
                title: "Response validation",
                content: `Feature: Response Validation
  Scenario: Validate response structure
    Given the API endpoint "${path}"
    When I send a ${method} request
    Then the response should have required fields`
            });
        }

        // Add environment test scenarios if enabled
        if (config.includeEnvironmentTests) {
            scenarios.push({
                title: "Environment variable handling",
                content: `Feature: Environment Variables
  Scenario: Environment variable handling
    When I set the environment variable "variable" to "value1"
    Then the environment variable "variable" should have value "value1"`
            });
        }

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
                        scenarios
                    }
                }
            );
        }

        return scenarios;
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

export async function handlePlayScenario(
    scenario: GeneratedScenario,
    config: { onApiCall?: (method: string, url: string, request: any, response: any) => void; path: string; headers: Record<string, string> }
): Promise<void> {
    const { onApiCall, path, headers } = config;
    
    try {
        const response = await fetch(path, {
            method: 'GET',
            headers: {
                ...headers,
                'Accept': 'application/json'
            }
        });

        const responseData = await response.json();

        if (onApiCall) {
            onApiCall(
                'GET',
                path,
                { headers },
                {
                    status: response.status,
                    headers: Object.fromEntries(response.headers.entries()),
                    body: responseData
                }
            );
        }
    } catch (error) {
        console.error('Error running scenario:', error);
        if (onApiCall) {
            onApiCall(
                'GET',
                path,
                { headers },
                {
                    status: 500,
                    headers: {},
                    body: { error: 'Failed to execute scenario' }
                }
            );
        }
    }
} 