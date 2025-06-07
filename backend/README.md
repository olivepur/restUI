# Scenario Designer Proxy Server

This proxy server handles CORS issues when making requests to external APIs.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

The proxy server will run on http://localhost:3001.

## Troubleshooting

If you see `ERR_CONNECTION_REFUSED`:
1. Make sure you're in the `backend` directory
2. Check if all dependencies are installed
3. Verify the server is running (you should see "Proxy server running on http://localhost:3001")
4. Check if port 3001 is available

## Testing the Proxy

You can test if the proxy is working using curl:
```bash
curl -v http://localhost:3001/api/vlmdm/group-vehicle-file/v1.0/vehicles/components/WAUTTTDLCMROW0001 -H "Authorization: Bearer your-token-here"
``` 