import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography, IconButton, TextField } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { SystemNodeData } from '../types';
import { defaultNodeStyles, selectedNodeStyles } from '../styles';

export const SystemNode: React.FC<NodeProps<SystemNodeData>> = ({ 
    data, 
    id, 
    selected 
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedLabel, setEditedLabel] = useState(data.label);

    const handleSave = useCallback(() => {
        if (data.onLabelChange) {
            data.onLabelChange(editedLabel);
        }
        setIsEditing(false);
    }, [data, editedLabel]);

    const handleDelete = useCallback(() => {
        if (data.onDelete) {
            data.onDelete(id);
        }
    }, [data, id]);

    return (
        <Box
            sx={{
                padding: 1,
                borderRadius: 1,
                minWidth: 100,
                maxWidth: 150,
                ...defaultNodeStyles,
                ...(selected ? selectedNodeStyles : {}),
            }}
        >
            <Handle type="target" position={Position.Top} />
            <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ minHeight: 32 }}>
                {isEditing ? (
                    <TextField
                        value={editedLabel}
                        onChange={(e) => setEditedLabel(e.target.value)}
                        size="small"
                        autoFocus
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleSave();
                            }
                        }}
                        sx={{ 
                            flex: 1,
                            mr: 0.5,
                            '& .MuiInputBase-input': {
                                padding: '2px 4px',
                                fontSize: '0.875rem'
                            }
                        }}
                    />
                ) : (
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            flex: 1,
                            fontSize: '0.875rem',
                            fontWeight: 500
                        }}
                    >
                        {data.label}
                    </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {isEditing ? (
                        <IconButton 
                            size="small" 
                            onClick={handleSave}
                            sx={{ padding: 0.5 }}
                        >
                            <SaveIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                    ) : (
                        <IconButton 
                            size="small" 
                            onClick={() => setIsEditing(true)}
                            sx={{ padding: 0.5 }}
                        >
                            <EditIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                    )}
                    <IconButton 
                        size="small" 
                        onClick={handleDelete}
                        sx={{ padding: 0.5 }}
                    >
                        <DeleteIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                </Box>
            </Box>
            <Handle type="source" position={Position.Bottom} />
        </Box>
    );
}; 