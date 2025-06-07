import { sendRequest } from '../utils/api';

interface TestContext {
    response: {
        status: number;
        body: any;
        headers: Record<string, string>;
    } | null;
    env: {
        get: (key: string) => string | undefined;
        set: (key: string, value: string) => void;
    };
    variables: Map<string, any>;
    endpoint: string;
    headers: Record<string, string>;
    authHeader?: string;
}

interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
    details?: any;
    displayText?: string;
}

interface ScenarioStep {
    type: 'Given' | 'When' | 'Then' | 'And';
    text: string;
    status: 'passed' | 'failed';
    results: TestResult[];
    response?: any;
}

interface ScenarioExecution {
    id: string;
    title: string;
    steps: ScenarioStep[];
    startTime: string;
    endTime?: string;
    status: 'running' | 'completed' | 'failed';
}

class TestRunner {
    private env: Map<string, string> = new Map();
    private response: any = null;
    private currentScenario: ScenarioExecution | null = null;
    private variables: Map<string, any> = new Map();
    private context: TestContext = {
        response: null,
        env: {
            get: (key) => this.env.get(key),
            set: (key, value) => this.env.set(key, value)
        },
        variables: this.variables,
        endpoint: '',
        headers: {}
    };

    public getResponse() {
        return this.response;
    }

    startScenario(title: string, authHeader?: string, scenarioId?: string) {
        this.currentScenario = {
            id: scenarioId || `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title,
            steps: [],
            startTime: new Date().toISOString(),
            status: 'running'
        };
        // Reset context for new scenario
        this.variables.clear();
        this.response = null;
        this.context.headers = {};
        if (authHeader) {
            this.context.authHeader = authHeader;
            this.context.headers['Authorization'] = authHeader;
        }
    }

    private getStepType(step: string): 'Given' | 'When' | 'Then' | 'And' {
        if (step.startsWith('Given')) return 'Given';
        if (step.startsWith('When')) return 'When';
        if (step.startsWith('Then')) return 'Then';
        return 'And';
    }

    private async executeGivenStep(step: string): Promise<TestResult[]> {
        const results: TestResult[] = [];
        
        // Handle endpoint setup
        const endpointMatch = step.match(/"([^"]+)"/);
        if (endpointMatch && step.includes('endpoint')) {
            this.context.endpoint = endpointMatch[1];
                    results.push({
                name: 'Setup endpoint',
                passed: true,
                details: { endpoint: this.context.endpoint }
            });
        }

        // Handle header setup
        const headerMatch = step.match(/header "([^"]+)" with value "([^"]+)"/);
        if (headerMatch) {
            const [_, headerName, headerValue] = headerMatch;
            // Don't override authorization header if it was set from test request
            if (headerName.toLowerCase() !== 'authorization' || !this.context.authHeader) {
                this.context.headers[headerName] = headerValue;
            }
            results.push({
                name: 'Setup header',
                passed: true,
                details: { header: headerName, value: this.context.headers[headerName] }
            });
        }

        // Handle variable setup
        const variableMatch = step.match(/variable "([^"]+)" with value "([^"]+)"/);
        if (variableMatch) {
            const [_, varName, varValue] = variableMatch;
            this.variables.set(varName, varValue);
            results.push({
                name: 'Setup variable',
                passed: true,
                details: { variable: varName, value: varValue }
            });
        }
        
        return results;
    }

    private async executeWhenStep(step: string): Promise<TestResult[]> {
        const results: TestResult[] = [];

        try {
            if (step.includes('send a GET request')) {
                // Ensure authorization header is set
                if (this.context.authHeader && !this.context.headers['Authorization']) {
                    this.context.headers['Authorization'] = this.context.authHeader;
                }

                this.response = await sendRequest(this.context.endpoint, {
                    method: 'GET',
                    headers: this.context.headers
                });
                
                results.push({
                    name: 'HTTP Request',
                    passed: this.response.status < 400,
                    details: {
                        status: this.response.status,
                        endpoint: this.context.endpoint,
                        headers: this.context.headers
                    }
                });
            }
            // Add support for POST, PUT, DELETE etc.
            else if (step.includes('wait for')) {
                const timeMatch = step.match(/(\d+) (\w+)/);
                if (timeMatch) {
                    const [_, amount, unit] = timeMatch;
                    const ms = unit === 'seconds' ? parseInt(amount) * 1000 : parseInt(amount);
                    await new Promise(resolve => setTimeout(resolve, ms));
                    results.push({
                        name: 'Wait',
                        passed: true,
                        details: { duration: `${amount} ${unit}` }
                    });
                }
            }
        } catch (error) {
            results.push({
                name: 'HTTP Request',
                passed: false,
                error: error instanceof Error ? error.message : 'Request failed',
                details: {
                    headers: this.context.headers
                }
            });
        }

        return results;
    }

    private async executeThenStep(step: string): Promise<TestResult[]> {
        const results: TestResult[] = [];

        try {
            // Response validity with status check
            const validWithStatusMatch = step.match(/response should be valid with status (\d+)/);
            if (validWithStatusMatch) {
                const expectedStatus = parseInt(validWithStatusMatch[1]);
                const isValid = this.response && 
                              this.response.status === expectedStatus && 
                              this.response.body !== undefined;
                
                results.push({
                    name: 'Response Validation',
                    passed: isValid,
                    details: {
                        expected: `Valid response with status ${expectedStatus}`,
                        actual: this.response ? 
                            `Response status: ${this.response.status}, body: ${JSON.stringify(this.response.body).substring(0, 100)}...` :
                            'No response received',
                        suggestion: isValid ? undefined : 'Response is not valid or status code does not match'
                    }
                });
                return results;
            }

            // Simple response validity check - handle both with and without 'the' and 'Then'
            const validityStep = step.replace(/^Then\s+/, '');  // Remove 'Then ' if present
            if (validityStep === 'response should be valid' || validityStep === 'the response should be valid') {
                // Check if response exists and has status 200
                const hasValidStatus = this.response && this.response.status === 200;
                
                // Check if response body is valid JSON
                let isValidJson = false;
                let jsonError = '';
                try {
                    // If body is already an object, it's valid JSON
                    if (typeof this.response?.body === 'object') {
                        isValidJson = true;
                    } else if (typeof this.response?.body === 'string') {
                        // Try parsing if it's a string
                        JSON.parse(this.response.body);
                        isValidJson = true;
                    }
                } catch (e) {
                    jsonError = e instanceof Error ? e.message : 'Invalid JSON format';
                }

                const isValid = hasValidStatus && isValidJson;
                
                results.push({
                    name: 'Response Validation',
                    passed: isValid,
                    details: {
                        expected: 'Valid JSON response with status 200',
                        actual: this.response ? 
                            `Status: ${this.response.status}, Content-Type: ${this.response.headers?.['content-type']}, Body: ${
                                typeof this.response.body === 'object' ? 
                                    JSON.stringify(this.response.body).substring(0, 100) : 
                                    String(this.response.body).substring(0, 100)
                            }...` :
                            'No response received',
                        suggestion: !hasValidStatus ? 'Status code must be exactly 200' :
                                  !isValidJson ? `Response body must be valid JSON. ${jsonError}` :
                                  undefined
                    }
                });
                return results;
            }

            // Response status assertions
            const statusMatch = step.match(/status should be (\d+)/);
            if (statusMatch) {
                const expectedStatus = parseInt(statusMatch[1]);
                results.push({
                    name: 'Status Check',
                    passed: this.response.status === expectedStatus,
                    details: {
                        expected: expectedStatus,
                        actual: this.response.status
                    }
                });
                return results;
            }

            // Response body path assertions
            const pathMatch = step.match(/path "([^"]+)" should be (.+)/);
            if (pathMatch) {
                const [_, path, expectedValue] = pathMatch;
                const actualValue = path.split('.').reduce((obj, key) => obj?.[key], this.response.body);
                results.push({
                    name: 'Path Value Check',
                    passed: String(actualValue) === expectedValue,
                    details: {
                        path,
                        expected: expectedValue,
                        actual: actualValue
                    }
                });
                return results;
            }

            // Array length assertions
            const lengthMatch = step.match(/should have (\d+) items/);
            if (lengthMatch && Array.isArray(this.response.body)) {
                const expectedLength = parseInt(lengthMatch[1]);
                results.push({
                    name: 'Array Length Check',
                    passed: this.response.body.length === expectedLength,
                    details: {
                        expected: expectedLength,
                        actual: this.response.body.length
                    }
                });
                return results;
            }

            // Header assertions
            const headerMatch = step.match(/header "([^"]+)" should be "([^"]+)"/);
            if (headerMatch) {
                const [_, headerName, expectedValue] = headerMatch;
                const actualValue = this.response.headers[headerName];
                results.push({
                    name: 'Header Check',
                    passed: actualValue === expectedValue,
                    details: {
                        header: headerName,
                        expected: expectedValue,
                        actual: actualValue
                    }
                });
                return results;
            }

            // Variable assertions
            const variableMatch = step.match(/variable "([^"]+)" should be "([^"]+)"/);
            if (variableMatch) {
                const [_, varName, expectedValue] = variableMatch;
                const actualValue = this.variables.get(varName);
                results.push({
                    name: 'Variable Check',
                    passed: actualValue === expectedValue,
                    details: {
                        variable: varName,
                        expected: expectedValue,
                        actual: actualValue
                    }
                });
                return results;
            }

            // Custom field value assertions
            const fieldMatch = step.match(/the ([a-zA-Z0-9_.]+) should be "([^"]+)"/);
            if (fieldMatch) {
                const [_, field, expectedValue] = fieldMatch;
                const actualValue = field.split('.').reduce((obj, key) => obj?.[key], this.response.body);
                results.push({
                    name: 'Field Value Check',
                    passed: String(actualValue) === expectedValue,
                    details: {
                        field,
                        expected: expectedValue,
                        actual: actualValue
                    }
                });
                return results;
            }

            // If no known assertion pattern matches, mark as unimplemented
            results.push({
                name: 'Unimplemented Step',
                passed: false,
                error: `Step implementation not found: "${step}"`,
                details: {
                    step,
                    suggestion: 'This step type is not yet implemented. Please implement the required assertion pattern.',
                    isUnimplemented: true
                }
            });

        } catch (error) {
            results.push({
                name: 'Assertion',
                passed: false,
                error: error instanceof Error ? error.message : 'Assertion failed'
            });
        }

        return results;
    }

    async runStep(step: string, context: any): Promise<TestResult[]> {
        const stepType = this.getStepType(step);
        let results: TestResult[] = [];

        try {
            switch (stepType) {
                case 'Given':
                    results = await this.executeGivenStep(step);
                    break;
                case 'When':
                    results = await this.executeWhenStep(step);
                    break;
                case 'Then':
                case 'And':
                    results = await this.executeThenStep(step);
                    break;
            }

            // Update scenario execution with enhanced formatting
            if (this.currentScenario) {
                const stepResult: ScenarioStep = {
                    type: stepType,
                    text: step,
                    status: results.every(r => r.passed) ? 'passed' : 'failed',
                    results: results.map(r => ({
                        ...r,
                        displayText: this.formatResultDisplay(r)
                    })),
                    response: stepType === 'When' ? this.response : undefined
                };

                this.currentScenario.steps.push(stepResult);

                // Format step result for API drawer
                if (context.onApiCall) {
                    const stepDisplay = `${stepResult.status === 'passed' ? '✓' : '✗'} ${step}${
                        stepResult.status === 'failed' && results[0]?.details?.suggestion 
                            ? ` → ${results[0].details.suggestion}`
                            : ''
                    }`;

                    context.onApiCall(
                        'TEST_LOG',
                        'test-result',
                        {
                            type: 'test-log',
                            scenarioId: this.currentScenario.id,
                            content: stepDisplay,
                            status: stepResult.status,
                            color: results[0]?.details?.isUnimplemented ? '#ff9800' : (stepResult.status === 'passed' ? '#4caf50' : '#f44336'),
                            timestamp: new Date().toISOString()
                        },
                        null
                    );
                }
            }
        } catch (error) {
            results = [{
                name: step,
                passed: false,
                error: error instanceof Error ? error.message : 'Step execution failed',
                displayText: `✗ ${step} - ${error instanceof Error ? error.message : 'Step execution failed'}`
            }];

            // Send error status
            if (context.onApiCall && this.currentScenario) {
                const errorDisplay = `✗ ${step} → ${error instanceof Error ? error.message : 'Step execution failed'}`;
                
                context.onApiCall(
                    'TEST_LOG',
                    'test-result',
                    {
                        type: 'test-log',
                        scenarioId: this.currentScenario.id,
                        content: errorDisplay,
                        status: 'failed',
                        color: '#f44336',
                        timestamp: new Date().toISOString()
                    },
                    null
                );
            }
        }

        return results;
    }

    private formatResultDisplay(result: TestResult): string {
        const symbol = result.passed ? '✓' : '✗';
        let displayText = `${symbol} ${result.name}`;

        if (!result.passed && result.error) {
            displayText += `\n   Error: ${result.error}`;
        }

        if (result.details) {
            if (result.details.expected !== undefined && result.details.actual !== undefined) {
                displayText += `\n   Expected: ${JSON.stringify(result.details.expected)}`;
                displayText += `\n   Actual: ${JSON.stringify(result.details.actual)}`;
            } else if (result.details.suggestion) {
                displayText += `\n   Suggestion: ${result.details.suggestion}`;
            }
        }

        return displayText;
    }

    endScenario(context: any) {
        if (this.currentScenario) {
            this.currentScenario.endTime = new Date().toISOString();
            this.currentScenario.status = this.currentScenario.steps.some(s => s.status === 'failed') ? 'failed' : 'completed';

            // Send final summary with proper test log format
            if (context.onApiCall) {
                const status = this.currentScenario.status === 'completed' ? 'passed' : 'failed';
                context.onApiCall(
                    'TEST_LOG',
                    'test-result',
                    {
                        type: 'test-log',
                        scenarioId: this.currentScenario.id,
                        content: `Scenario: ${this.currentScenario.title} (${status})`,
                        status: status,
                        color: status === 'passed' ? '#4caf50' : '#f44336',
                        timestamp: new Date().toISOString()
                    },
                    null
                );
            }
        }
    }
}

export const testRunner = new TestRunner();