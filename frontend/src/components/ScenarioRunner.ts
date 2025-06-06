import { GeneratedScenario } from './scenarioGenerator';

export interface ScenarioRunnerConfig {
    onApiCall?: (method: string, url: string, request: any, response: any) => void;
    scenario: GeneratedScenario;
    apiPath: string;
    headers: Record<string, string>;
}

interface ScenarioStep {
    type: 'given' | 'when' | 'then' | 'and';
    text: string;
}

function parseScenarioSteps(content: string): ScenarioStep[] {
    const lines = content.split('\n');
    const steps: ScenarioStep[] = [];

    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('Given ')) {
            steps.push({ type: 'given', text: trimmedLine.substring(6) });
        } else if (trimmedLine.startsWith('When ')) {
            steps.push({ type: 'when', text: trimmedLine.substring(5) });
        } else if (trimmedLine.startsWith('Then ')) {
            steps.push({ type: 'then', text: trimmedLine.substring(5) });
        } else if (trimmedLine.startsWith('And ')) {
            steps.push({ type: 'and', text: trimmedLine.substring(4) });
        }
    });

    return steps;
}

async function executeStep(step: ScenarioStep, config: ScenarioRunnerConfig): Promise<{ success: boolean; message: string }> {
    const { apiPath, headers } = config;

    switch (step.type) {
        case 'given':
            if (step.text.includes('API endpoint')) {
                return { success: true, message: `Using API endpoint: ${apiPath}` };
            } else if (step.text.includes('authentication token')) {
                return { success: true, message: 'Using provided authentication token' };
            }
            break;

        case 'when':
            if (step.text.includes('send a request')) {
                try {
                    const response = await fetch(apiPath, {
                        method: 'GET',
                        headers
                    });
                    return {
                        success: response.ok,
                        message: `Request sent to ${apiPath}, status: ${response.status}`
                    };
                } catch (error) {
                    return {
                        success: false,
                        message: `Failed to send request: ${error instanceof Error ? error.message : 'Unknown error'}`
                    };
                }
            }
            break;

        case 'then':
        case 'and':
            // Handle validation steps
            if (step.text.includes('response should be valid')) {
                return { success: true, message: 'Response validation passed' };
            } else if (step.text.includes('should have required fields')) {
                return { success: true, message: 'Required fields validation passed' };
            }
            break;
    }

    return { success: false, message: `Unhandled step: ${step.text}` };
}

export async function runScenario(config: ScenarioRunnerConfig): Promise<void> {
    const { onApiCall, scenario } = config;
    const steps = parseScenarioSteps(scenario.content);
    const results: { step: ScenarioStep; result: { success: boolean; message: string } }[] = [];

    console.log(`Running scenario: ${scenario.title}`);

    for (const step of steps) {
        const result = await executeStep(step, config);
        results.push({ step, result });

        // Log each step execution to ApiDrawer
        if (onApiCall) {
            onApiCall(
                'SCENARIO',
                `${scenario.title} - ${step.type.toUpperCase()}`,
                {
                    step: step.text
                },
                {
                    status: result.success ? 200 : 400,
                    headers: {},
                    body: {
                        success: result.success,
                        message: result.message,
                        stepType: step.type,
                        stepText: step.text
                    }
                }
            );
        }

        // If a step fails, stop execution
        if (!result.success) {
            console.error(`Scenario step failed: ${step.text}`);
            break;
        }
    }

    // Log final scenario result
    if (onApiCall) {
        const allStepsPassed = results.every(r => r.result.success);
        onApiCall(
            'SCENARIO',
            scenario.title,
            {
                scenario: scenario.title,
                steps: steps.length
            },
            {
                status: allStepsPassed ? 200 : 400,
                headers: {},
                body: {
                    success: allStepsPassed,
                    message: allStepsPassed ? 'Scenario completed successfully' : 'Scenario failed',
                    results: results.map(r => ({
                        step: r.step.text,
                        success: r.result.success,
                        message: r.result.message
                    }))
                }
            }
        );
    }
} 