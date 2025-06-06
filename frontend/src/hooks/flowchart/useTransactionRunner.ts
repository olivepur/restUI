import { useCallback, useState } from 'react';
import axios from 'axios';
import { TransactionEdge, TransactionDetails, EdgeStatus } from '../../components/FlowchartEditor/types';
import { Edge } from 'reactflow';
import { TransactionEdgeData } from '../../components/FlowchartEditor/types';

interface UseTransactionRunnerProps {
    edges: Edge<TransactionEdgeData>[];
    updateEdgeStatus: (edgeId: string, status: string) => void;
    setEdgeRunning: (edgeId: string, isRunning: boolean) => void;
    onApiCall?: (method: string, url: string, request: any, response: any) => void;
}

export const useTransactionRunner = ({
    edges,
    updateEdgeStatus,
    setEdgeRunning,
    onApiCall
}: UseTransactionRunnerProps) => {
    const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
    const [runningTransactions, setRunningTransactions] = useState<Set<string>>(new Set());

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
            return fullUrl.pathname + fullUrl.search;
        } catch {
            return url;
        }
    };

    const stopTransaction = useCallback((transactionId: string) => {
        setRunningTransactions(prev => {
            const next = new Set(prev);
            next.delete(transactionId);
            return next;
        });
    }, []);

    const runTransaction = useCallback(async (transactionId: string) => {
        const edge = edges.find(e => e.data?.transactionId === transactionId);
        if (!edge?.data) return;

        setRunningTransactions(prev => new Set(prev).add(transactionId));
        setEdgeRunning(edge.id, true);
        updateEdgeStatus(edge.id, 'running');

        try {
            const request = {
                method: edge.data.operation,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer sample-token'
                },
                body: edge.data.requestBody
            };

            const response = await fetch(edge.data.path, request);
            const responseData = await response.json();

            // Log the API call
            if (onApiCall) {
                onApiCall(
                    edge.data.operation,
                    edge.data.path,
                    request,
                    {
                        status: response.status,
                        headers: Object.fromEntries(response.headers.entries()),
                        body: responseData
                    }
                );
            }

            const details: TransactionDetails = {
                id: transactionId,
                request: {
                    method: edge.data.operation,
                    path: edge.data.path,
                    headers: request.headers,
                    body: request.body
                },
                response: {
                    status: response.status,
                    headers: Object.fromEntries(response.headers.entries()),
                    body: responseData
                },
                loading: false
            };

            setTransactionDetails(details);
            updateEdgeStatus(edge.id, response.ok ? 'success' : 'failed');
        } catch (error) {
            console.error('Transaction failed:', error);
            updateEdgeStatus(edge.id, 'failed');
        } finally {
            setEdgeRunning(edge.id, false);
            stopTransaction(transactionId);
        }
    }, [edges, updateEdgeStatus, setEdgeRunning, stopTransaction, onApiCall]);

    return {
        runTransaction,
        stopTransaction,
        transactionDetails,
        runningTransactions
    };
}; 