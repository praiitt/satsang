'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/livekit/button';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';

interface BulkUploadCsvProps {
    onUpload: (emails: string[]) => void;
    onCancel: () => void;
}

export function BulkUploadCsv({ onUpload, onCancel }: BulkUploadCsvProps) {
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
                setError('Please upload a valid CSV file.');
                return;
            }
            setFile(selectedFile);
            setError(null);
            parseFile(selectedFile);
        }
    };

    const parseFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n');
            const emails: string[] = [];

            lines.forEach(line => {
                const cleanLine = line.trim();
                if (cleanLine) {
                    // Simple regex for email extraction from CSV line
                    // Assuming email is the first column or the only column
                    const parts = cleanLine.split(',');
                    const potentialEmail = parts[0]?.trim();
                    if (potentialEmail && potentialEmail.includes('@')) {
                        emails.push(potentialEmail);
                    }
                }
            });

            if (emails.length === 0) {
                setError('No valid emails found in the file.');
            } else {
                setPreview(emails.slice(0, 5)); // Show first 5
            }
        };
        reader.readAsText(file);
    };

    const handleSubmit = () => {
        if (file) {
            // Re-parse to get all emails (since preview is sliced)
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                const lines = text.split('\n');
                const emails: string[] = [];
                lines.forEach(line => {
                    const cleanLine = line.trim();
                    if (cleanLine) {
                        const parts = cleanLine.split(',');
                        const potentialEmail = parts[0]?.trim();
                        if (potentialEmail && potentialEmail.includes('@')) {
                            emails.push(potentialEmail);
                        }
                    }
                });
                onUpload(emails);
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className="p-6 bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl max-w-md w-full mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Bulk Upload Employees</h3>
                <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-4">
                <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm font-medium">Click to upload CSV</p>
                    <p className="text-xs text-muted-foreground mt-1">Format: Email, Name (optional)</p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".csv"
                        className="hidden"
                    />
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {file && !error && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                            <FileText className="w-4 h-4" />
                            {file.name}
                        </div>
                        {preview.length > 0 && (
                            <div className="text-xs text-muted-foreground pl-6">
                                <p className="mb-1">Preview:</p>
                                <ul className="list-disc pl-4 space-y-0.5">
                                    {preview.map((email, i) => (
                                        <li key={i}>{email}</li>
                                    ))}
                                    {preview.length === 5 && <li>...and more</li>}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex gap-3 mt-6">
                    <Button variant="outline" className="flex-1" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button className="flex-1" disabled={!file || !!error} onClick={handleSubmit}>
                        Upload & Invite
                    </Button>
                </div>
            </div>
        </div>
    );
}
