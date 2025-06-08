import React from 'react';
import Editor, { OnChange } from '@monaco-editor/react';

interface MonacoEditorProps {
    value: string;
    onChange: (value: string) => void;
    language: string;
    height: string;
    readOnly?: boolean;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
    value,
    onChange,
    language,
    height,
    readOnly = false
}) => {
    const handleEditorChange: OnChange = (value) => {
        onChange(value?.toString() || '');
    };

    return (
        <Editor
            height={height}
            language={language}
            value={value}
            onChange={handleEditorChange}
            options={{
                minimap: { enabled: false },
                lineNumbers: 'on',
                readOnly,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true
            }}
        />
    );
}; 