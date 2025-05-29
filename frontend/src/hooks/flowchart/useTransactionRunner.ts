import { useCallback, useState } from 'react';
import axios from 'axios';
import { TransactionEdge, TransactionDetails, EdgeStatus } from '../../components/FlowchartEditor/types';

interface UseTransactionRunnerProps {
    edges: TransactionEdge[];
    updateEdgeStatus: (edgeId: string, status: EdgeStatus) => void;
    setEdgeRunning: (edgeId: string, isRunning: boolean) => void;
}

export const useTransactionRunner = ({
    edges,
    updateEdgeStatus,
    setEdgeRunning
}: UseTransactionRunnerProps) => {
    const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);

    const convertHeaders = (headers: any): Record<string, string> => {
        const result: Record<string, string> = {};
        Object.entries(headers).forEach(([key, value]) => {
            if (value !== undefined) {
                result[key] = String(value);
            }
        });
        return result;
    };

    const getRelativeUrl = (url: string): string => {
        try {
            const fullUrl = new URL(url);
            // Keep the /vlmdm path as it's handled by our proxy
            return fullUrl.pathname;
        } catch {
            // If the URL is already relative, return it as is
            return url.startsWith('/') ? url : `/${url}`;
        }
    };

    const runTransaction = useCallback(async (edgeIds: string | string[]) => {
        const edgeIdArray = Array.isArray(edgeIds) ? edgeIds : [edgeIds];
        const responses: Array<{
            path: string;
            status: number;
            headers: Record<string, string>;
            body: any;
        }> = [];

        try {
            // Add all edges to running set
            edgeIdArray.forEach(id => {
                setEdgeRunning(id, true);
                updateEdgeStatus(id, 'running');
            });

            for (let i = 0; i < edgeIdArray.length; i++) {
                const id = edgeIdArray[i];
                const edge = edges.find(e => e.id === id);
                
                if (!edge) {
                    console.error(`Edge ${id} not found`);
                    continue;
                }

                try {
                    const url = edge.data?.path || '';
                    const relativeUrl = getRelativeUrl(url);
                    console.log('Making request to:', relativeUrl);

                    // Make the actual API call
                    const response = await axios({
                        method: edge.data?.operation || 'GET',
                        url: relativeUrl,
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });

                    // Update transaction details with successful response
                    setTransactionDetails({
                        id: edge.data?.transactionId || '',
                        request: {
                            method: edge.data?.operation || 'GET',
                            path: edge.data?.path || '',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: edge.data?.requestBody
                        },
                        response: {
                            status: response.status,
                            headers: convertHeaders(response.headers),
                            body: response.data
                        },
                        loading: false
                    });

                    // Update edge status based on response
                    updateEdgeStatus(id, 'success');

                } catch (err) {
                    const error = err as Error;
                    const status = axios.isAxiosError(err) ? err.response?.status || 500 : 500;
                    
                    // Update edge status based on error type
                    if (status === 403) {
                        updateEdgeStatus(id, 'failed');
                    } else {
                        updateEdgeStatus(id, 'error');
                    }

                    // Create error response details
                    const errorResponse = {
                        status: status,
                        headers: axios.isAxiosError(err) ? convertHeaders(err.response?.headers || {}) : {},
                        body: {
                            error: error.message,
                            details: axios.isAxiosError(err) ? err.response?.data : 'An unexpected error occurred',
                            path: edge.data?.path || ''
                        }
                    };

                    // Update transaction details with error response
                    setTransactionDetails({
                        id: edge.data?.transactionId || '',
                        request: {
                            method: edge.data?.operation || 'GET',
                            path: edge.data?.path || '',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: edge.data?.requestBody
                        },
                        response: errorResponse,
                        loading: false
                    });
                }

                setEdgeRunning(id, false);

                if (i < edgeIdArray.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        } catch (error) {
            console.error('Error running transactions:', error);
            edgeIdArray.forEach(id => {
                updateEdgeStatus(id, 'error');
                setEdgeRunning(id, false);
            });
        }

        return responses;
    }, [edges, setEdgeRunning, updateEdgeStatus]);

    const stopTransaction = useCallback(() => {
        setTransactionDetails(null);
    }, []);

    return {
        runTransaction,
        stopTransaction,
        transactionDetails
    };
}; 