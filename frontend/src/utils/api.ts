const API_PROXY_BASE = 'http://localhost:8080/api/proxy';
const API_BASE = 'https://api.int.group-vehicle-file.com';

interface RequestOptions extends RequestInit {
    useProxy?: boolean;
}

export const transformUrl = (url: string, useProxy: boolean = true): string => {
    // If it's already a full URL
    if (url.startsWith('http')) {
        if (useProxy) {
            // If using proxy, route through localhost
            return `${API_PROXY_BASE}${url.replace(API_BASE, '')}`;
        }
        // If not using proxy, use the URL as is
        return url;
    }

    // If it's just a path
    if (useProxy) {
        // If using proxy, route through localhost
        return `http://localhost:8080${url.startsWith('/') ? url : `/${url}`}`;
    }
    // If not using proxy, construct full URL with API_BASE
    return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
};

export const sendRequest = async (url: string, options: RequestOptions = {}) => {
    const { useProxy = true, ...requestOptions } = options;
    
    console.log('Sending request to:', url);
    console.log('Using proxy:', useProxy);
    
    const transformedUrl = transformUrl(url, useProxy);
    console.log('Transformed URL:', transformedUrl);
    
    const defaultHeaders = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    // Only include credentials when using proxy
    const fetchOptions: RequestInit = {
        ...requestOptions,
        headers: {
            ...defaultHeaders,
            ...requestOptions.headers
        },
        ...(useProxy ? { credentials: 'include' as const } : {})
    };

    try {
        const response = await fetch(transformedUrl, fetchOptions);

        let responseBody;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                responseBody = await response.json();
            } catch (e) {
                console.warn('Failed to parse JSON response:', e);
                responseBody = await response.text();
            }
        } else {
            responseBody = await response.text();
        }

        console.log('📥 Response received:', {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseBody
        });

        return {
            status: response.status,
            body: responseBody,
            headers: Object.fromEntries(response.headers.entries())
        };
    } catch (error) {
        console.error('❌ Request failed:', error);
        throw error;
    }
}; 