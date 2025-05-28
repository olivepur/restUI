import axios from 'axios';

export interface RequestFile {
    name: string;
    content: {
        method: string;
        url: string;
        metadata?: any;
    };
}

class FileService {
    private baseUrl: string;

    constructor() {
        // In development, use the local development server
        this.baseUrl = process.env.NODE_ENV === 'development' 
            ? 'http://localhost:8080/api'  // Update this to match your backend URL
            : '/api';
    }

    async getRequestFiles(): Promise<string[]> {
        try {
            // For now, return static files for testing
            return [
                'request_0001.json',
                'request_0002.json'
            ];
            // In production, this would be:
            // const response = await axios.get(`${this.baseUrl}/collections`);
            // return response.data;
        } catch (error) {
            console.error('Error fetching request files:', error);
            return [];
        }
    }

    async getRequestFileContent(filename: string): Promise<any> {
        try {
            // For development/testing, return mock data
            if (filename === 'request_0001.json') {
                return {
                    method: "GET",
                    url: "https://api.int.group-vehicle-file.com/vlmdm/group-vehicle-file/v1.0/vehicles/components/WAUTTTDLCMROW0001",
                    metadata: {
                        vin: "WAUTTTDLCMROW0001",
                        brand: "AUDI",
                        country: "DE",
                        components: ["B0P", "B0Q"]
                    }
                };
            }
            // Add more mock data as needed
            
            // In production, this would be:
            // const response = await axios.get(`${this.baseUrl}/collections/${filename}`);
            // return response.data;
            
            throw new Error('File not found');
        } catch (error) {
            console.error('Error fetching file content:', error);
            throw error;
        }
    }
}

export const fileService = new FileService(); 