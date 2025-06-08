import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StepPattern {
    id: string;
    type: 'Given' | 'When' | 'Then';
    pattern: string;
    description: string;
    implementation?: string;  // Code implementation of the step
    isCustom?: boolean;  // To differentiate between built-in and custom patterns
}

interface SettingsState {
    stepPatterns: StepPattern[];
    addStepPattern: (pattern: Omit<StepPattern, 'id'>) => void;
    updateStepPattern: (id: string, pattern: Partial<StepPattern>) => void;
    removeStepPattern: (id: string) => void;
    resetToDefaultPatterns: () => void;
}

// Default built-in patterns
const DEFAULT_PATTERNS: StepPattern[] = [
    {
        id: 'given-endpoint',
        type: 'Given',
        pattern: 'endpoint "([^"]+)"',
        description: 'Set the API endpoint',
        implementation: `const endpointMatch = step.match(/"([^"]+)"/);
if (endpointMatch) {
    this.context.endpoint = endpointMatch[1];
    return [{
        name: 'Setup endpoint',
        passed: true,
        details: { endpoint: this.context.endpoint }
    }];
}`
    },
    {
        id: 'given-header',
        type: 'Given',
        pattern: 'header "([^"]+)" with value "([^"]+)"',
        description: 'Set a request header',
        implementation: `const headerMatch = step.match(/header "([^"]+)" with value "([^"]+)"/);
if (headerMatch) {
    const [_, headerName, headerValue] = headerMatch;
    if (headerName.toLowerCase() !== 'authorization' || !this.context.authHeader) {
        this.context.headers[headerName] = headerValue;
    }
    return [{
        name: 'Setup header',
        passed: true,
        details: { header: headerName, value: this.context.headers[headerName] }
    }];
}`
    },
    {
        id: 'given-variable',
        type: 'Given',
        pattern: 'variable "([^"]+)" with value "([^"]+)"',
        description: 'Set a test variable'
    },
    {
        id: 'when-http-request',
        type: 'When',
        pattern: 'send a (GET|POST|PUT|DELETE) request',
        description: 'Send an HTTP request',
        implementation: `const methodMatch = step.match(/send a (GET|POST|PUT|DELETE) request/);
if (methodMatch) {
    const method = methodMatch[1];
    this.response = await sendRequest(this.context.endpoint, {
        method,
        headers: this.context.headers,
        useProxy: this.context.useProxy
    });
    return [{
        name: 'HTTP Request',
        passed: this.response.status < 400,
        details: {
            status: this.response.status,
            endpoint: this.context.endpoint,
            headers: this.context.headers
        }
    }];
}`
    },
    {
        id: 'when-wait',
        type: 'When',
        pattern: 'wait for (\\d+) (seconds?|milliseconds?)',
        description: 'Wait for a specified duration'
    },
    {
        id: 'then-valid-status',
        type: 'Then',
        pattern: 'response should be valid with status (\\d+)',
        description: 'Validate response with specific status'
    },
    {
        id: 'then-valid',
        type: 'Then',
        pattern: '^(the )?response should be valid$',
        description: 'Validate response'
    },
    {
        id: 'then-status',
        type: 'Then',
        pattern: 'status should be (\\d+)',
        description: 'Check response status'
    },
    {
        id: 'then-path',
        type: 'Then',
        pattern: 'path "([^"]+)" should be (.+)',
        description: 'Check response path value'
    },
    {
        id: 'then-items',
        type: 'Then',
        pattern: 'should have (\\d+) items',
        description: 'Check array length'
    },
    {
        id: 'then-header',
        type: 'Then',
        pattern: 'header "([^"]+)" should be "([^"]+)"',
        description: 'Check response header'
    }
];

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            stepPatterns: DEFAULT_PATTERNS,
            
            addStepPattern: (pattern) => set((state) => ({
                stepPatterns: [...state.stepPatterns, {
                    ...pattern,
                    id: `${pattern.type.toLowerCase()}-${Date.now()}`,
                    isCustom: true
                }]
            })),
            
            updateStepPattern: (id, updates) => set((state) => ({
                stepPatterns: state.stepPatterns.map(pattern =>
                    pattern.id === id ? { ...pattern, ...updates } : pattern
                )
            })),
            
            removeStepPattern: (id) => set((state) => ({
                stepPatterns: state.stepPatterns.filter(pattern => 
                    pattern.id !== id || !pattern.isCustom // Prevent removal of built-in patterns
                )
            })),
            
            resetToDefaultPatterns: () => set(() => ({
                stepPatterns: DEFAULT_PATTERNS
            }))
        }),
        {
            name: 'rest-ui-settings',
            version: 1
        }
    )
); 