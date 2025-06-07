import { sendRequest } from '../utils/api';
import { testRunner } from './testRunner';

export interface GeneratedScenario {
    title: string;
    content: string;
}

interface ScenarioTemplate {
    title: string;
    steps: string[];
}

function generateBasicValidationScenario(endpoint: string): ScenarioTemplate {
    return {
        title: "Validate basic response structure",
        steps: [
            `Given the API endpoint "${endpoint}"`,
            "When I send a GET request",
            "Then the response should be valid"
        ]
    };
}

function analyzeValue(path: string[], value: any): string[] {
    const assertions: string[] = [];
    
    if (value === null) {
        assertions.push(`Then the path "${path.join('.')}" should be null`);
    } else if (Array.isArray(value)) {
        assertions.push(`Then the path "${path.join('.')}" should be an array`);
        assertions.push(`And the "${path.join('.')}" should have length ${value.length}`);
        
        // Analyze first item in array if exists
        if (value.length > 0) {
            const itemAssertions = analyzeValue([...path, '0'], value[0]);
            assertions.push(...itemAssertions.map(a => a.replace('Then', 'And')));
        }
    } else if (typeof value === 'object') {
        assertions.push(`Then the path "${path.join('.')}" should be an object`);
        
        // Analyze object properties
        Object.entries(value).forEach(([key, val]) => {
            const propertyAssertions = analyzeValue([...path, key], val);
            assertions.push(...propertyAssertions.map(a => a.replace('Then', 'And')));
        });
    } else {
        const type = typeof value;
        assertions.push(`Then the path "${path.join('.')}" should be of type "${type}"`);
        
        if (type === 'number') {
            assertions.push(`And the "${path.join('.')}" should be ${value}`);
        } else if (type === 'string') {
            assertions.push(`And the "${path.join('.')}" should be "${value}"`);
        } else if (type === 'boolean') {
            assertions.push(`And the "${path.join('.')}" should be ${value}`);
        }
    }
    
    return assertions;
}

function generateResponseStructureScenarios(response: any): ScenarioTemplate[] {
    const scenarios: ScenarioTemplate[] = [];
    
    if (!response) return scenarios;

    // Generate scenarios for response structure
    const mainPaths = Object.keys(response.body || {});
    mainPaths.forEach(path => {
        const value = response.body[path];
        const assertions = analyzeValue([path], value);
        
        scenarios.push({
            title: `Validate ${path} structure`,
            steps: [
                `Given the API endpoint "${response.requestUrl}"`,
                "When I send a GET request",
                ...assertions
            ]
        });
    });

    return scenarios;
}

function generateStatusScenarios(response: any): ScenarioTemplate[] {
    const scenarios: ScenarioTemplate[] = [];
    
    if (!response?.status) return scenarios;

    scenarios.push({
        title: `Validate ${response.status} response`,
        steps: [
            `Given the API endpoint "${response.requestUrl}"`,
            "When I send a GET request",
            `Then the response status should be ${response.status}`,
            response.status >= 400 
                ? 'And the response should contain an error message'
                : 'And the response should be successful'
        ]
    });

    return scenarios;
}

function generateHeaderValidationScenarios(response: any): ScenarioTemplate[] {
    const scenarios: ScenarioTemplate[] = [];
    
    if (!response?.headers) return scenarios;

    const headerEntries = Object.entries(response.headers);
    if (headerEntries.length > 0) {
        scenarios.push({
            title: "Validate response headers",
            steps: [
                `Given the API endpoint "${response.requestUrl}"`,
                "When I send a GET request",
                "Then the response should have headers",
                ...headerEntries.map(([key, value]) => 
                    `And the "${key}" header should be "${value}"`)
            ]
        });
    }

    return scenarios;
}

export const handleGenerateScenarios = (config: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body: string;
    lastResponse: any;
    includeEnvironmentTests: boolean;
    onApiCall?: (method: string, url: string, request: any, response: any) => void;
    hasTestedRequest: boolean;
}): GeneratedScenario[] => {
    const { path, lastResponse } = config;
    
    if (!lastResponse) {
        return [
            {
                title: "Basic API validation",
                content: generateBasicValidationScenario(path).steps.join('\n')
            }
        ];
    }

    // Collect all scenario templates
    const allScenarios: ScenarioTemplate[] = [
        generateBasicValidationScenario(path),
        ...generateStatusScenarios(lastResponse),
        ...generateResponseStructureScenarios(lastResponse),
        ...generateHeaderValidationScenarios(lastResponse)
    ];

    // Convert templates to actual scenarios
    return allScenarios.map(template => ({
        title: template.title,
        content: template.steps.join('\n')
    }));
};

export const handlePlayScenario = async (options: {
    onApiCall?: (method: string, url: string, request: any, response: any) => void;
    path: string;
    headers: Record<string, string>;
}) => {
    try {
        testRunner.startScenario('Validate response structure');

        const response = await sendRequest(options.path, {
            method: 'GET',
            headers: options.headers
        });

        testRunner.endScenario({ onApiCall: options.onApiCall });

        if (options.onApiCall) {
            options.onApiCall(
                'GET',
                options.path,
                { method: 'GET', headers: options.headers },
                response
            );
        }

        return response;
    } catch (error) {
        console.error('Error playing scenario:', error);
        testRunner.endScenario({ onApiCall: options.onApiCall });
        
        if (options.onApiCall) {
            options.onApiCall(
                'GET',
                options.path,
                { method: 'GET', headers: options.headers },
                { status: 500, headers: {}, body: { error: 'Failed to execute scenario' } }
            );
        }
        throw error;
    }
}; 