import React from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Button } from '@mui/material';
import { Transaction } from '../../../../types/TestData';

interface SelectTransactionDialogProps {
    open: boolean;
    onClose: () => void;
    transactions: Transaction[];
    onSelect: (transaction: Transaction) => void;
}

export const SelectTransactionDialog: React.FC<SelectTransactionDialogProps> = ({
    open,
    onClose,
    transactions,
    onSelect
}) => {
    return (
        <Dialog 
            open={open} 
            onClose={onClose}
        >
            <DialogTitle>Select Transaction</DialogTitle>
            <DialogContent>
                <Box sx={{ minWidth: '300px' }}>
                    {transactions.map((transaction) => (
                        <Button
                            key={transaction.id}
                            onClick={() => onSelect(transaction)}
                            fullWidth
                            sx={{ 
                                mb: 1, 
                                justifyContent: 'flex-start', 
                                textAlign: 'left',
                                textTransform: 'none'
                            }}
                        >
                            {transaction.operation} {transaction.requestPath}
                        </Button>
                    ))}
                </Box>
            </DialogContent>
        </Dialog>
    );
};
