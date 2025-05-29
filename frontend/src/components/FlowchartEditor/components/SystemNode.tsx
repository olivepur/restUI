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
                padding: 2,
                borderRadius: 1,
                minWidth: 200,
                ...defaultNodeStyles,
                ...(selected ? selectedNodeStyles : {}),
            }}
        >
            <Handle type="target" position={Position.Top} />
            <Box display="flex" alignItems="center" justifyContent="space-between">
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
                        sx={{ flex: 1, mr: 1 }}
                    />
                ) : (
                    <Typography variant="body1" sx={{ flex: 1 }}>
                        {data.label}
                    </Typography>
                )}
                <Box>
                    {isEditing ? (
                        <IconButton size="small" onClick={handleSave}>
                            <SaveIcon fontSize="small" />
                        </IconButton>
                    ) : (
                        <IconButton size="small" onClick={() => setIsEditing(true)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    )}
                    <IconButton size="small" onClick={handleDelete}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>
            <Typography variant="caption" color="textSecondary">
                {data.type}
            </Typography>
            <Handle type="source" position={Position.Bottom} />
        </Box>
    );
}; 