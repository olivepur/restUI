import { sendRequest } from '../../utils/api';
import { useSettingsStore } from '../Settings/settingsStore';

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
    useProxy: boolean;
    onApiCall?: (method: string, url: string, request: any, response: any) => void;
}

interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
    details?: any;
    displayText?: string;
    scenarioId?: string;      // References the GeneratedScenario.id
    scenarioRunId?: string;   // References the specific test run
}

interface ScenarioStep {
    type: 'Given' | 'When' | 'Then' | 'And';
    text: string;
    status: 'running' | 'passed' | 'failed' | 'unimplemented';
    results: TestResult[];
    response?: any;
}

interface ScenarioExecution {
    scenarioId: string;      // References the GeneratedScenario.id
    scenarioRunId: string;   // Unique ID for this test run
    title: string;
    steps: ScenarioStep[];
    startTime: string;
    endTime?: string;
    status: 'running' | 'passed' | 'failed' | 'unimplemented';
}

interface StepResult {
    step: string;
    status: 'running' | 'passed' | 'failed' | 'unimplemented';
    results: Array<{
        passed: boolean;
        details?: {
            suggestion?: string;
            expected?: any;
            actual?: any;
            error?: string;
            isUnimplemented?: boolean;
        };
    }>;
}

interface StepPattern {
    type: 'Given' | 'When' | 'Then' | 'And';
    pattern: string;
    implementation: string;
}

class TestRunner {
    private env: Map<string, string> = new Map();
    private response: {
        status: number;
        headers: Record<string, string>;
        body: any;
    } | null = null;
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
        headers: {},
        useProxy: false
    };

    private initializeResponse() {
        this.response = {
            status: 0,
            headers: {},
            body: null
        };
        this.context.response = this.response;
    }

    public getResponse() {
        return this.response;
    }

    startScenario(
        title: string, 
        authHeader?: string, 
        ids?: { scenarioId: string; scenarioRunId: string }, 
        useProxy: boolean = true
    ) {
        this.currentScenario = {
            scenarioId: ids?.scenarioId || `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            scenarioRunId: ids?.scenarioRunId || `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title,
            steps: [],
            startTime: new Date().toISOString(),
            status: 'running'
        };
        
        // Reset context for new scenario
        this.variables.clear();
        this.initializeResponse();
        this.context = {
            response: this.response,
            env: {
                get: (key) => this.env.get(key),
                set: (key, value) => this.env.set(key, value)
            },
            variables: this.variables,
            endpoint: '',
            headers: {},
            useProxy: useProxy,
            authHeader: undefined
        };

        console.log('🔄 Starting new scenario with clean context:', this.context);
    }

    private getStepType(step: string): 'Given' | 'When' | 'Then' | 'And' {
        if (step.startsWith('Given')) return 'Given';
        if (step.startsWith('When')) return 'When';
        if (step.startsWith('Then')) return 'Then';
        return 'And';
    }

    private findMatchingPattern(stepType: 'Given' | 'When' | 'Then' | 'And', text: string): StepPattern | null {
        const { stepPatterns } = useSettingsStore.getState();
        return stepPatterns.find(pattern => 
            (stepType === 'And' || pattern.type === stepType) && 
            new RegExp(pattern.pattern).test(text)
        ) || null;
    }

    private async executeStep(stepType: 'Given' | 'When' | 'Then' | 'And', stepText: string): Promise<TestResult[]> {
        const cleanText = stepText.replace(/^(Given|When|Then|And)\s+/, '').trim();
        const pattern = this.findMatchingPattern(stepType, cleanText);

        if (!pattern) {
            console.log('No matching pattern found for step:', stepText);
            return [{
                name: 'Pattern Match',
                passed: false,
                error: 'No matching pattern found',
                details: {
                    suggestion: `Add a step pattern that matches: ${stepText}`,
                    isUnimplemented: true
                }
            }];
        }

        console.log(`Executing step: ${stepType} ${cleanText}`);
        console.log('Current context:', {
            endpoint: this.context.endpoint,
            headers: this.context.headers,
            response: this.context.response
        });

        try {
            // Ensure response objects are initialized
            if (!this.response) {
                this.initializeResponse();
            }

            // Create a safe execution context with access to necessary objects
            const executionContext = {
                context: this.context,
                response: this.response,
                variables: this.variables,
                step: stepText,
                cleanText,
                TestResult: (name: string, passed: boolean, details?: any) => ({
                    name,
                    passed,
                    details
                }),
                sendRequest
            };

            // Execute the implementation with the context
            const implementationFunction = new Function(
                'context', 
                'response', 
                'variables', 
                'step', 
                'cleanText',
                'TestResult',
                'sendRequest',
                `try {
                    ${pattern.implementation}
                } catch (error) {
                    return [{
                        name: 'Implementation Error',
                        passed: false,
                        error: error.message,
                        details: { error }
                    }];
                }`
            );

            const results = await implementationFunction(
                executionContext.context,
                executionContext.response,
                executionContext.variables,
                executionContext.step,
                executionContext.cleanText,
                executionContext.TestResult,
                executionContext.sendRequest
            );

            // Log the results without icons
            results.forEach((result: TestResult) => {
                console.log('Step result:', result);
            });

            // Update response after step execution
            if (executionContext.context.response) {
                this.response = executionContext.context.response;
                this.context.response = this.response;
                console.log('Updated response after step:', this.response);
            }

            // Log updated context
            console.log('Updated context:', {
                endpoint: this.context.endpoint,
                headers: this.context.headers,
                response: this.context.response
            });

            return results;
        } catch (error) {
            return [{
                name: 'Execution Error',
                passed: false,
                error: error instanceof Error ? error.message : 'Implementation execution failed',
                details: { error }
            }];
        }
    }

    async runStep(step: string, context: any): Promise<TestResult[]> {
        const stepType = this.getStepType(step);
        let results: TestResult[] = [];

        // Update context with onApiCall
        this.context.onApiCall = context.onApiCall;

        try {
            results = await this.executeStep(stepType, step);
        } catch (error) {
            results = [{
                name: step,
                passed: false,
                error: error instanceof Error ? error.message : 'Step execution failed',
                details: {
                    isUnimplemented: false
                }
            }];
        }

        // Update scenario execution
        if (this.currentScenario) {
            const isUnimplemented = results.some(r => r.details?.isUnimplemented);
            const stepResult: ScenarioStep = {
                type: stepType,
                text: step,
                status: isUnimplemented ? 'unimplemented' : 
                        results.every(r => r.passed) ? 'passed' : 'failed',
                results: results.map(r => ({
                    ...r,
                    displayText: this.formatResultDisplay(r, false) // Don't include icon in details
                })),
                response: stepType === 'When' ? this.response : undefined
            };

            this.currentScenario.steps.push(stepResult);

            // Send step result with icon
            if (context.onApiCall) {
                const icon = stepResult.status === 'passed' ? '✓' : 
                           stepResult.status === 'unimplemented' ? '❓' : '✗';
                
                const stepDisplay = `${icon} ${step}`;
                
                context.onApiCall(
                    'TEST_LOG',
                    'test-result',
                    {
                        type: 'test-log',
                        scenarioId: this.currentScenario.scenarioId,
                        scenarioRunId: this.currentScenario.scenarioRunId,
                        content: stepDisplay,
                        status: stepResult.status,
                        color: stepResult.status === 'unimplemented' ? '#ff9800' : 
                               stepResult.status === 'passed' ? '#4caf50' : '#f44336',
                        timestamp: new Date().toISOString(),
                        details: results[0]?.details
                    },
                    null
                );
            }
        }

        return results;
    }

    private formatResultDisplay(result: TestResult, includeIcon: boolean = false): string {
        let displayText = result.name;
        
        if (includeIcon) {
            const icon = result.details?.isUnimplemented ? '❓' : 
                        result.passed ? '✓' : '✗';
            displayText = `${icon} ${displayText}`;
        }

        if (!result.passed) {
            if (result.details?.isUnimplemented) {
                displayText += `\n   Status: Not Implemented`;
            }
            if (result.error) {
                displayText += `\n   Error: ${result.error}`;
            }
        }

        if (result.details) {
            if (result.details.expected !== undefined && result.details.actual !== undefined) {
                displayText += `\n   Expected: ${JSON.stringify(result.details.expected)}`;
                displayText += `\n   Actual: ${JSON.stringify(result.details.actual)}`;
            }
            if (result.details.suggestion) {
                displayText += `\n   Suggestion: ${result.details.suggestion}`;
            }
        }

        return displayText;
    }

    endScenario(context: any) {
        if (this.currentScenario) {
            this.currentScenario.endTime = new Date().toISOString();
            
            // Check if any step is unimplemented
            const hasUnimplementedStep = this.currentScenario.steps.some(s => s.status === 'unimplemented');
            // Check if any step has failed
            const hasFailedStep = this.currentScenario.steps.some(s => s.status === 'failed');
            
            // Set final status
            this.currentScenario.status = hasUnimplementedStep ? 'unimplemented' : 
                                         hasFailedStep ? 'failed' : 'passed';

            // Send final summary with proper test log format
            if (context.onApiCall) {
                const status = this.currentScenario.status;
                context.onApiCall(
                    'TEST_LOG',
                    'test-result',
                    {
                        type: 'test-log',
                        scenarioId: this.currentScenario.scenarioId,
                        scenarioRunId: this.currentScenario.scenarioRunId,
                        content: `Scenario: ${this.currentScenario.title} (${status})`,
                        status: status,
                        color: status === 'unimplemented' ? '#ff9800' : 
                               status === 'passed' ? '#4caf50' : '#f44336',
                        timestamp: new Date().toISOString()
                    },
                    null
                );
            }
        }
    }
}

export const testRunner = new TestRunner();