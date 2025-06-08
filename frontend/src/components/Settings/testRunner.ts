import { StepPattern } from './settingsStore';

interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
    details?: {
        suggestion?: string;
        expected?: any;
        actual?: any;
        error?: string;
        isUnimplemented?: boolean;
        responseText?: string;
        status?: number;
        endpoint?: string;
        headers?: Record<string, string>;
        response?: any;
        parseError?: string;
    };
}

interface ScenarioStep {
    type: 'Given' | 'When' | 'Then' | 'And';
    text: string;
    status: 'running' | 'passed' | 'failed' | 'unimplemented';
    results: TestResult[];
    response?: any;
}

interface ScenarioContext {
    onApiCall?: (method: string, url: string, request: any, response: any) => void;
    variables: Record<string, any>;
    response: {
        status?: number;
        headers?: Record<string, string>;
        body?: any;
        text?: string;
    };
}

interface ScenarioExecution {
    title: string;
    scenarioId: string;
    scenarioRunId: string;
    status: 'running' | 'passed' | 'failed' | 'unimplemented';
    steps: ScenarioStep[];
    startTime: string;
    endTime?: string;
}

class TestRunner {
    private patterns: StepPattern[] = [];
    private currentScenario: ScenarioExecution | null = null;
    private context: ScenarioContext = {
        variables: {},
        response: {}
    };

    setPatterns(patterns: StepPattern[]) {
        this.patterns = patterns;
    }

    private initializeResponse() {
        this.context.response = {
            status: undefined,
            headers: {},
            body: undefined,
            text: undefined
        };
    }

    startScenario(title: string, authHeader: string | undefined, metadata: { scenarioId: string; scenarioRunId: string }, useProxy: boolean = false) {
        this.currentScenario = {
            title,
            scenarioId: metadata.scenarioId,
            scenarioRunId: metadata.scenarioRunId,
            status: 'running',
            steps: [],
            startTime: new Date().toISOString()
        };

        // Initialize context
        this.context = {
            variables: {},
            response: {}
        };

        // Set initial variables
        if (authHeader) {
            this.context.variables['authHeader'] = authHeader;
        }
        this.context.variables['useProxy'] = useProxy;
    }

    private getStepType(step: string): 'Given' | 'When' | 'Then' | 'And' {
        if (step.startsWith('Given')) return 'Given';
        if (step.startsWith('When')) return 'When';
        if (step.startsWith('Then')) return 'Then';
        return 'And';
    }

    private findMatchingPattern(stepType: string, stepText: string): StepPattern | undefined {
        const cleanText = stepText.replace(`${stepType} `, '');
        
        // For 'And' steps, try to infer the actual type based on the previous step
        if (stepType === 'And' && this.currentScenario && this.currentScenario.steps.length > 0) {
            const previousStep = this.currentScenario.steps[this.currentScenario.steps.length - 1];
            // Try to find a matching pattern using the previous step's type
            const pattern = this.patterns.find(p => {
                if (p.type !== previousStep.type) return false;
                try {
                    const regex = new RegExp(p.pattern);
                    return regex.test(cleanText);
                } catch (e) {
                    console.error('Invalid regex pattern:', p.pattern);
                    return false;
                }
            });
            if (pattern) return pattern;
        }

        // If no pattern found for And using previous type, or for other step types
        return this.patterns.find(pattern => {
            if (pattern.type !== stepType) return false;
            try {
                const regex = new RegExp(pattern.pattern);
                return regex.test(cleanText);
            } catch (e) {
                console.error('Invalid regex pattern:', pattern.pattern);
                return false;
            }
        });
    }

    private async executeStep(stepType: 'Given' | 'When' | 'Then' | 'And', stepText: string): Promise<TestResult[]> {
        const cleanText = stepText.replace(`${stepType} `, '');
        const pattern = this.findMatchingPattern(stepType, stepText);

        if (!pattern) {
            // For 'And' steps, include the inferred type in the suggestion
            let suggestion = `Add a step pattern that matches: ${stepText}`;
            if (stepType === 'And' && this.currentScenario && this.currentScenario.steps.length > 0) {
                const previousStep = this.currentScenario.steps[this.currentScenario.steps.length - 1];
                suggestion = `Add a step pattern that matches: ${previousStep.type} ${cleanText}`;
            }

            return [{
                name: stepText,
                passed: false,
                details: {
                    isUnimplemented: true,
                    suggestion
                }
            }];
        }

        try {
            // Ensure response objects are initialized
            if (!this.context.response) {
                this.initializeResponse();
            }

            // Create a safe execution context with access to necessary objects
            const executionContext = {
                context: this.context,
                response: this.context.response,
                variables: this.context.variables,
                step: stepText,
                cleanText,
                TestResult: (name: string, passed: boolean, details?: any) => ({
                    name,
                    passed,
                    details
                })
            };

            // Execute the implementation with the context
            const implementationFunction = new Function(
                'context', 
                'response', 
                'variables', 
                'step', 
                'cleanText',
                'TestResult',
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
                executionContext.TestResult
            );

            return results;
        } catch (error) {
            return [{
                name: stepText,
                passed: false,
                error: error instanceof Error ? error.message : 'Step execution failed',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
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
                    isUnimplemented: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
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
                results: results,
                response: stepType === 'When' ? this.context.response : undefined
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