import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sendRequest } from '../../utils/api';

export interface StepPattern {
    id: string;
    type: 'Given' | 'When' | 'Then' | 'And';
    pattern: string;
    description: string;
    implementation: string;
    isBuiltIn?: boolean;
}

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

interface SettingsState {
    stepPatterns: StepPattern[];
    addPattern: (pattern: Omit<StepPattern, 'id'>) => void;
    updatePattern: (id: string, pattern: Partial<StepPattern>) => void;
    removePattern: (id: string) => void;
    resetToDefaults: () => void;
    findMatchingPattern: (step: string) => StepPattern | undefined;
    extractParameters: (step: string, pattern: StepPattern) => string[];
}

const defaultPatterns: StepPattern[] = [
    {
        id: 'endpoint-setup',
        type: 'Given',
        pattern: '^the API endpoint "([^"]+)"$',
        description: 'Set the API endpoint',
        implementation: `
            const endpointMatch = step.match(/"([^"]+)"/);
            if (endpointMatch) {
                // Initialize context if needed
                if (!context.headers) {
                    context.headers = {};
                }
                
                // Set the endpoint
                context.endpoint = endpointMatch[1];
                console.log('🔗 Setting API endpoint:', context.endpoint);
                
                // Initialize response object
                context.response = null;
                response = null;

                return [{
                    name: 'Setup endpoint',
                    passed: true,
                    details: { 
                        endpoint: context.endpoint,
                        headers: context.headers
                    }
                }];
            }
            return [{
                name: 'Setup endpoint',
                passed: false,
                error: 'Invalid endpoint format'
            }];
        `,
        isBuiltIn: true
    },
    {
        id: 'header-setup',
        type: 'Given',
        pattern: '^header "([^"]+)" with value "([^"]+)"$',
        description: 'Set a request header',
        implementation: `
            const headerMatch = step.match(/header "([^"]+)" with value "([^"]+)"/);
            if (headerMatch) {
                const [_, headerName, headerValue] = headerMatch;
                if (headerName.toLowerCase() !== 'authorization' || !context.authHeader) {
                    context.headers[headerName] = headerValue;
                }
                return [{
                    name: 'Setup header',
                    passed: true,
                    details: { header: headerName, value: context.headers[headerName] }
                }];
            }
            return [{
                name: 'Setup header',
                passed: false,
                error: 'Invalid header format'
            }];
        `,
        isBuiltIn: true
    },
    {
        id: 'variable-setup',
        type: 'Given',
        pattern: '^variable "([^"]+)" with value "([^"]+)"$',
        description: 'Set a test variable',
        implementation: `
            const variableMatch = step.match(/variable "([^"]+)" with value "([^"]+)"/);
            if (variableMatch) {
                const [_, varName, varValue] = variableMatch;
                variables.set(varName, varValue);
                return [{
                    name: 'Setup variable',
                    passed: true,
                    details: { variable: varName, value: varValue }
                }];
            }
            return [{
                name: 'Setup variable',
                passed: false,
                error: 'Invalid variable format'
            }];
        `,
        isBuiltIn: true
    },
    {
        id: 'get-request',
        type: 'When',
        pattern: '^I send a GET request$',
        description: 'Send a GET request',
        implementation: `
            return (async () => {
                try {
                    // Check if endpoint is set
                    if (!context.endpoint) {
                        console.log('❌ No endpoint configured');
                        return [{
                            name: 'HTTP Request',
                            passed: false,
                            error: 'No endpoint configured. Please set an endpoint using a Given step first.',
                            details: {
                                suggestion: 'Add a step like: Given the API endpoint "https://api.example.com"'
                            }
                        }];
                    }

                    // Initialize headers if not set
                    if (!context.headers) {
                        context.headers = {};
                    }

                    console.log('🚀 Sending GET request to:', context.endpoint);
                    console.log('📋 Request headers:', context.headers);

                    // Use the injected sendRequest function
                    const result = await sendRequest(context.endpoint, {
                        method: 'GET',
                        headers: context.headers,
                        useProxy: context.useProxy
                    });

                    console.log('📥 Received response:', {
                        status: result.status,
                        headers: result.headers,
                        body: result.body
                    });

                    // Update response directly
                    response.status = result.status;
                    response.headers = result.headers || {};
                    response.body = result.body;

                    // Update context response (they should be the same object)
                    context.response = response;

                    console.log('📝 Updated response:', response);

                    // Log the API call
                    if (context.onApiCall) {
                        context.onApiCall(
                            'GET',
                            context.endpoint,
                            {
                                method: 'GET',
                                headers: context.headers,
                                useProxy: context.useProxy
                            },
                            response
                        );
                    }

                    const success = result.status < 400;
                    return [{
                        name: 'HTTP Request',
                        passed: success,
                        error: success ? undefined : \`Request failed with status \${result.status}\`,
                        details: {
                            status: result.status,
                            endpoint: context.endpoint,
                            headers: context.headers,
                            response: result.body
                        }
                    }];
                } catch (error) {
                    console.error('❌ GET request failed:', error);

                    // Update response with error
                    response.status = 500;
                    response.headers = {};
                    response.body = { error: error instanceof Error ? error.message : 'Unknown error' };

                    // Update context response (they should be the same object)
                    context.response = response;

                    // Log the failed API call
                    if (context.onApiCall) {
                        context.onApiCall(
                            'GET',
                            context.endpoint,
                            {
                                method: 'GET',
                                headers: context.headers,
                                useProxy: context.useProxy
                            },
                            response
                        );
                    }

                    return [{
                        name: 'HTTP Request',
                        passed: false,
                        error: 'Request failed',
                        details: {
                            endpoint: context.endpoint,
                            headers: context.headers,
                            error: error instanceof Error ? error.message : 'Unknown error',
                            suggestion: 'Check if the endpoint is accessible and the network connection is stable'
                        }
                    }];
                }
            })();
        `,
        isBuiltIn: true
    },
    {
        id: 'wait',
        type: 'When',
        pattern: '^wait for (\\d+) (seconds|milliseconds)$',
        description: 'Wait for a specified duration',
        implementation: `
            const timeMatch = step.match(/(\\d+) (\\w+)/);
            if (timeMatch) {
                const [_, amount, unit] = timeMatch;
                const ms = unit === 'seconds' ? parseInt(amount) * 1000 : parseInt(amount);
                await new Promise(resolve => setTimeout(resolve, ms));
                return [{
                    name: 'Wait',
                    passed: true,
                    details: { duration: \`\${amount} \${unit}\` }
                }];
            }
            return [{
                name: 'Wait',
                passed: false,
                error: 'Invalid wait format'
            }];
        `,
        isBuiltIn: true
    },
    {
        id: 'status-check',
        type: 'Then',
        pattern: '^status should be (\\d+)$',
        description: 'Check response status code',
        implementation: `
            const statusMatch = step.match(/status should be (\\d+)/);
            if (statusMatch) {
                const expectedStatus = parseInt(statusMatch[1]);
                return [{
                    name: 'Status Check',
                    passed: response.status === expectedStatus,
                    details: {
                        expected: expectedStatus,
                        actual: response.status
                    }
                }];
            }
            return [{
                name: 'Status Check',
                passed: false,
                error: 'Invalid status format'
            }];
        `,
        isBuiltIn: true
    },
    {
        id: 'path-check',
        type: 'Then',
        pattern: '^path "([^"]+)" should be (.+)$',
        description: 'Check value at JSON path',
        implementation: `
            const pathMatch = step.match(/path "([^"]+)" should be (.+)/);
            if (pathMatch) {
                const [_, path, expectedValue] = pathMatch;
                const actualValue = path.split('.').reduce((obj, key) => obj?.[key], response.body);
                return [{
                    name: 'Path Value Check',
                    passed: String(actualValue) === expectedValue,
                    details: {
                        path,
                        expected: expectedValue,
                        actual: actualValue
                    }
                }];
            }
            return [{
                name: 'Path Value Check',
                passed: false,
                error: 'Invalid path format'
            }];
        `,
        isBuiltIn: true
    },
    {
        id: 'array-length',
        type: 'Then',
        pattern: '^should have (\\d+) items$',
        description: 'Check array length',
        implementation: `
            const lengthMatch = step.match(/should have (\\d+) items/);
            if (lengthMatch && Array.isArray(response.body)) {
                const expectedLength = parseInt(lengthMatch[1]);
                return [{
                    name: 'Array Length Check',
                    passed: response.body.length === expectedLength,
                    details: {
                        expected: expectedLength,
                        actual: response.body.length
                    }
                }];
            }
            return [{
                name: 'Array Length Check',
                passed: false,
                error: Array.isArray(response.body) ? 'Invalid length format' : 'Response body is not an array'
            }];
        `,
        isBuiltIn: true
    },
    {
        id: 'response-valid',
        type: 'Then',
        pattern: '^the response should be valid$',
        description: 'Validate response status and structure',
        implementation: `
            return (async () => {
                try {
                    console.log('🔍 Validating response:', response);

                    if (!response) {
                        console.log('❌ No response object found');
                        return [{
                            name: 'Response Validation',
                            passed: false,
                            error: 'No response received',
                            details: {
                                expected: 'Valid JSON response with status 200',
                                actual: 'No response received',
                                suggestion: 'Ensure the previous request step was successful'
                            }
                        }];
                    }

                    console.log('📊 Response status:', response.status);
                    console.log('📋 Response headers:', response.headers);
                    console.log('📦 Response body:', response.body);

                    const validStatus = response.status === 200;
                    const validBody = response.body && typeof response.body === 'object';
                    const validHeaders = response.headers && typeof response.headers === 'object';

                    const issues = [];
                    if (!validStatus) issues.push(\`Invalid status code: \${response.status}, expected: 200\`);
                    if (!validBody) issues.push('Invalid or missing response body');
                    if (!validHeaders) issues.push('Invalid or missing response headers');

                    const passed = validStatus && validBody && validHeaders;
                    const icon = passed ? '✅' : '❌';
                    console.log(\`\${icon} Response validation result: \${passed ? 'PASSED' : 'FAILED'}\`);
                    if (!passed) {
                        console.log('❗ Validation issues:', issues);
                    }

                    return [{
                        name: 'Response Validation',
                        passed: passed,
                        error: passed ? undefined : issues.join(', '),
                        details: {
                            expected: {
                                status: 200,
                                bodyType: 'object',
                                headersType: 'object'
                            },
                            actual: {
                                status: response.status,
                                bodyType: response.body ? typeof response.body : 'undefined',
                                headersType: response.headers ? typeof response.headers : 'undefined'
                            }
                        }
                    }];
                } catch (error) {
                    console.error('❌ Response validation error:', error);
                    return [{
                        name: 'Response Validation',
                        passed: false,
                        error: 'Response validation failed',
                        details: {
                            error: error instanceof Error ? error.message : 'Unknown error'
                        }
                    }];
                }
            })();
        `,
        isBuiltIn: true
    },
    {
        id: 'response-valid-status',
        type: 'Then',
        pattern: '^response should be valid with status (\\d+)$',
        description: 'Check if response is valid with specific status',
        implementation: `
            const validWithStatusMatch = step.match(/response should be valid with status (\\d+)/);
            if (validWithStatusMatch) {
                const expectedStatus = parseInt(validWithStatusMatch[1]);
                const isValid = response && 
                              response.status === expectedStatus && 
                              response.body !== undefined;
                
                return [{
                    name: 'Response Validation',
                    passed: isValid,
                    details: {
                        expected: \`Valid response with status \${expectedStatus}\`,
                        actual: response ? 
                            \`Response status: \${response.status}, body: \${JSON.stringify(response.body).substring(0, 100)}...\` :
                            'No response received',
                        suggestion: isValid ? undefined : 'Response is not valid or status code does not match'
                    }
                }];
            }
            return [{
                name: 'Response Validation',
                passed: false,
                error: 'Invalid pattern format'
            }];
        `,
        isBuiltIn: true
    },
    {
        id: 'response-status',
        type: 'Then',
        pattern: '^the response status should be (\\d+)$',
        description: 'Validates that the response status code matches the expected value',
        implementation: `
            const match = cleanText.match(/the response status should be (\\d+)/);
            if (!match) {
                return [{
                    name: 'Status Check',
                    passed: false,
                    error: 'Invalid status format'
                }];
            }
            
            const expectedStatus = parseInt(match[1], 10);
            if (!response || response.status === undefined) {
                return [{
                    name: 'Status Check',
                    passed: false,
                    error: 'No response available to check status code',
                    details: {
                        expected: expectedStatus,
                        actual: 'No response'
                    }
                }];
            }
            
            return [{
                name: 'Status Check',
                passed: response.status === expectedStatus,
                details: {
                    expected: expectedStatus,
                    actual: response.status
                }
            }];
        `,
        isBuiltIn: true
    },
    {
        id: 'response-success',
        type: 'And',
        pattern: 'the response should be successful',
        description: 'Validates that the response status is in the successful range (200-299)',
        implementation: `
            if (!response || response.status === undefined) {
                return [{
                    name: 'Success Check',
                    passed: false,
                    error: 'No response available to check status',
                    details: {
                        expected: '200-299 status code',
                        actual: 'No response'
                    }
                }];
            }
            
            const isSuccessful = response.status >= 200 && response.status < 300;
            return [{
                name: 'Success Check',
                passed: isSuccessful,
                details: {
                    expected: '200-299 status code',
                    actual: response.status
                }
            }];
        `,
        isBuiltIn: true
    },
    {
        id: 'path-object-check',
        type: 'Then',
        pattern: '^path "([^"]+)" should be an object$',
        description: 'Check if value at path is an object',
        implementation: `
            const pathMatch = step.match(/path "([^"]+)" should be an object/);
            if (pathMatch) {
                const [_, path] = pathMatch;
                const actualValue = path.split(/[.\\[\\]]+/).reduce((obj, key) => {
                    if (key === 'body' && obj === response) return obj.body;
                    return obj?.[key.replace(/[\\[\\]]/g, '')];
                }, response);
                
                const isObject = actualValue && typeof actualValue === 'object' && !Array.isArray(actualValue);
                
                return [{
                    name: 'Object Check',
                    passed: isObject,
                    details: {
                        expected: 'object',
                        actual: actualValue === undefined ? 'undefined' :
                               actualValue === null ? 'null' :
                               Array.isArray(actualValue) ? 'array' :
                               typeof actualValue
                    }
                }];
            }
            return [{
                name: 'Object Check',
                passed: false,
                error: 'Invalid path format'
            }];
        `,
        isBuiltIn: true
    },
    {
        id: 'path-type-check',
        type: 'Then',
        pattern: '^path "([^"]+)" should be of type "([^"]+)"$',
        description: 'Check type of value at path',
        implementation: `
            const pathMatch = step.match(/path "([^"]+)" should be of type "([^"]+)"/);
            if (pathMatch) {
                const [_, path, expectedType] = pathMatch;
                const actualValue = path.split(/[.\\[\\]]+/).reduce((obj, key) => {
                    if (key === 'body' && obj === response) return obj.body;
                    return obj?.[key.replace(/[\\[\\]]/g, '')];
                }, response);
                
                const actualType = actualValue === null ? 'null' :
                                 Array.isArray(actualValue) ? 'array' :
                                 typeof actualValue;
                
                return [{
                    name: 'Type Check',
                    passed: actualType === expectedType,
                    details: {
                        expected: expectedType,
                        actual: actualType,
                        actualValue: actualValue
                    }
                }];
            }
            return [{
                name: 'Type Check',
                passed: false,
                error: 'Invalid path format'
            }];
        `,
        isBuiltIn: true
    },
    {
        id: 'path-value-check',
        type: 'Then',
        pattern: '^path "([^"]+)" should be "([^"]+)"$',
        description: 'Check exact value at path',
        implementation: `
            const pathMatch = step.match(/path "([^"]+)" should be "([^"]+)"/);
            if (pathMatch) {
                const [_, path, expectedValue] = pathMatch;
                const actualValue = path.split(/[.\\[\\]]+/).reduce((obj, key) => {
                    if (key === 'body' && obj === response) return obj.body;
                    return obj?.[key.replace(/[\\[\\]]/g, '')];
                }, response);
                
                return [{
                    name: 'Value Check',
                    passed: String(actualValue) === expectedValue,
                    details: {
                        expected: expectedValue,
                        actual: actualValue
                    }
                }];
            }
            return [{
                name: 'Value Check',
                passed: false,
                error: 'Invalid path format'
            }];
        `,
        isBuiltIn: true
    },
    {
        id: 'path-array-check',
        type: 'Then',
        pattern: '^path "([^"]+)" should be an array$',
        description: 'Check if value at path is an array',
        implementation: `
            const pathMatch = step.match(/path "([^"]+)" should be an array/);
            if (pathMatch) {
                const [_, path] = pathMatch;
                const actualValue = path.split(/[.\\[\\]]+/).reduce((obj, key) => {
                    if (key === 'body' && obj === response) return obj.body;
                    return obj?.[key.replace(/[\\[\\]]/g, '')];
                }, response);
                
                const isArray = Array.isArray(actualValue);
                
                // Format array preview
                const formatArrayPreview = (arr) => {
                    if (!Array.isArray(arr)) return 'not an array';
                    const preview = arr.slice(0, 2).map(item => {
                        if (item === null) return 'null';
                        if (typeof item === 'object') return JSON.stringify(item, null, 2);
                        return String(item);
                    });
                    return \`array[\${arr.length}] = [\\n  \${preview.join(',\\n  ')}\${arr.length > 2 ? ',\\n  ...' : '\\n'}]\`;
                };
                
                return [{
                    name: 'Array Check',
                    passed: isArray,
                    details: {
                        expected: 'array',
                        actual: actualValue === undefined ? 'undefined' :
                               actualValue === null ? 'null' :
                               Array.isArray(actualValue) ? formatArrayPreview(actualValue) :
                               typeof actualValue,
                        actualValue: actualValue
                    }
                }];
            }
            return [{
                name: 'Array Check',
                passed: false,
                error: 'Invalid path format'
            }];
        `,
        isBuiltIn: true
    }
];

// Helper function to normalize step text by removing keywords and trimming
const normalizeStepText = (text: string): string => {
    return text.replace(/^(Given|When|Then|And)\s+/i, '').trim();
};

// Helper function to find matching pattern
const findMatchingPattern = (step: string, patterns: StepPattern[]): StepPattern | undefined => {
    const normalizedStep = normalizeStepText(step);
    
    return patterns.find(pattern => {
        const normalizedPattern = normalizeStepText(pattern.pattern);
        // Convert pattern to regex by replacing {param} with (.+)
        const regexPattern = normalizedPattern.replace(/\{[^}]+\}/g, '(.+)');
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(normalizedStep);
    });
};

// Helper function to extract parameters from step
const extractParameters = (step: string, pattern: StepPattern): string[] => {
    const normalizedStep = normalizeStepText(step);
    const normalizedPattern = normalizeStepText(pattern.pattern);
    
    // Convert pattern to regex by replacing {param} with capture groups
    const regexPattern = normalizedPattern.replace(/\{[^}]+\}/g, '(.+)');
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    const match = normalizedStep.match(regex);
    
    return match ? match.slice(1) : [];
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            stepPatterns: defaultPatterns,
            addPattern: (pattern) => set((state) => ({
                stepPatterns: [...defaultPatterns, ...state.stepPatterns.filter(p => !p.isBuiltIn), { ...pattern, id: crypto.randomUUID() }]
            })),
            updatePattern: (id, pattern) => set((state) => ({
                stepPatterns: [...defaultPatterns, ...state.stepPatterns.filter(p => !p.isBuiltIn).map(p => 
                    p.id === id ? { ...p, ...pattern } : p
                )]
            })),
            removePattern: (id) => set((state) => ({
                stepPatterns: [...defaultPatterns, ...state.stepPatterns.filter(p => !p.isBuiltIn && p.id !== id)]
            })),
            resetToDefaults: () => set(() => ({
                stepPatterns: defaultPatterns
            })),
            findMatchingPattern: (step: string) => findMatchingPattern(step, get().stepPatterns),
            extractParameters: (step: string, pattern: StepPattern) => extractParameters(step, pattern)
        }),
        {
            name: 'settings-storage',
            partialize: (state) => ({
                stepPatterns: state.stepPatterns.filter(p => !p.isBuiltIn)
            }),
            onRehydrateStorage: () => (state) => {
                // Ensure default patterns are always present
                if (state) {
                    state.stepPatterns = [...defaultPatterns, ...state.stepPatterns.filter(p => !p.isBuiltIn)];
                }
            }
        }
    )
); 