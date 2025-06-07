const API_PROXY_BASE = 'http://localhost:8080/api/proxy';
const API_BASE = 'https://api.int.group-vehicle-file.com';

export const transformUrl = (url: string): string => {
    if (url.startsWith('http')) {
        return `${API_PROXY_BASE}${url.replace(API_BASE, '')}`;
    }
    return `http://localhost:8080${url.startsWith('/') ? url : `/${url}`}`;
};

export const sendRequest = async (url: string, options: RequestInit = {}) => {
    const transformedUrl = transformUrl(url);
    const defaultHeaders = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('token') || ''
    };

    const response = await fetch(transformedUrl, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        },
        credentials: 'include'
    });

    return {
        status: response.status,
        body: await response.json(),
        headers: Object.fromEntries(response.headers.entries())
    };
}; 