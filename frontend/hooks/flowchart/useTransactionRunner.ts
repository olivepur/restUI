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

    const runTransaction = useCallback(async (edgeIds: string | string[]) => {
        const edgeIdArray = Array.isArray(edgeIds) ? edgeIds : [edgeIds];
        const responses: Array<{
            path: string;
            status: number;
            headers: Record<string, string>;
            body: any;
        }> = [];

        // Add all edges to running set
        edgeIdArray.forEach(id => setEdgeRunning(id, true));

        for (let i = 0; i < edgeIdArray.length; i++) {
            const id = edgeIdArray[i];
            const edge = edges.find(e => e.id === id);

            if (edge?.data) {
                updateEdgeStatus(id, 'pending');

                try {
                    const response = await axios({
                        method: edge.data.operation.toLowerCase(),
                        url: `http://localhost:8080${edge.data.path}`,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer sample-token'
                        }
                    });

                    updateEdgeStatus(id, 'running');

                    responses.push({
                        path: edge.data.path,
                        status: response.status,
                        headers: convertHeaders(response.headers),
                        body: response.data
                    });

                    setTransactionDetails(prev => prev ? {
                        ...prev,
                        loading: i < edgeIdArray.length - 1,
                        response: {
                            status: response.status,
                            headers: convertHeaders(response.headers),
                            body: {
                                currentStep: {
                                    path: edge.data?.path || '',
                                    response: response.data
                                },
                                allResponses: responses.map(r => ({
                                    path: r.path,
                                    status: r.status,
                                    response: r.body
                                }))
                            }
                        }
                    } : null);

                    if (i === edgeIdArray.length - 1) {
                        setTimeout(() => {
                            updateEdgeStatus(id, 'performed');
                        }, 500);
                    }

                } catch (err) {
                    updateEdgeStatus(id, 'error');
                    const error = err as Error;
                    const errorResponse = {
                        status: axios.isAxiosError(err) ? err.response?.status || 500 : 500,
                        headers: axios.isAxiosError(err) ? convertHeaders(err.response?.headers || {}) : {},
                        body: {
                            error: error.message,
                            details: axios.isAxiosError(err) ? err.response?.data : 'An unexpected error occurred',
                            path: edge.data?.path || ''
                        }
                    };

                    setTransactionDetails(prev => prev ? {
                        ...prev,
                        loading: false,
                        response: errorResponse
                    } : null);
                }

                setEdgeRunning(id, false);

                if (i < edgeIdArray.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        return responses;
    }, [edges, setEdgeRunning, updateEdgeStatus]);

    const stopTransaction = useCallback((edgeId: string) => {
        setEdgeRunning(edgeId, false);
        setTransactionDetails(null);
    }, [setEdgeRunning]);

    return {
        transactionDetails,
        setTransactionDetails,
        runTransaction,
        stopTransaction
    };
}; 