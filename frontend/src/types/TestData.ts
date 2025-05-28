export interface ComponentData {
    value: string;
    timestamp: string;
    rateFlag: string;
    type: string;
    user: string;
}

export interface TestCase {
    vin: string;
    brand: string;
    country: string;
    b0p: ComponentData;
    b0q: ComponentData;
    requestData: string;
    responseData: string;
}

export type RestOperation = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'OPTIONS';

export type TransactionStatus = 'PENDING' | 'GENERATED';

export interface RequestFileContent {
    method: RestOperation;
    url: string;
    headers?: Record<string, string>;
    body?: any;
}

export interface Transaction {
    id: string;
    name: string;
    request: File | null;
    response: File | null;
    requestContent: string;
    responseContent: string;
    testCase: TestCase | null;
    generatedScript: string;
    requestPath: string;
    operation: RestOperation;
    status: TransactionStatus;
} 