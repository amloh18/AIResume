'use client';

import React from 'react';
import { SyncedFormWrapper } from '@/components/sync-engine';
import CertificatesSection from './CertificatesSection';
import { EnhancedResumeJSON, CertificateItem } from '@/types/enhanced-resume-schema';

interface SyncedCertificatesFormProps {
    cvId: string;
    initialData: EnhancedResumeJSON;
    onStateChange?: (state: EnhancedResumeJSON) => void;
}

/**
 * SyncedCertificatesForm - Demonstrates sync engine integration with certificates form
 */
const SyncedCertificatesForm: React.FC<SyncedCertificatesFormProps> = ({
    cvId,
    initialData,
    onStateChange
}) => {
    // Extract certificates items from sections
    const getCertificatesItems = (data: EnhancedResumeJSON): CertificateItem[] => {
        const certificatesSection = data.sections.find(section => section.type === 'certificates');
        return (certificatesSection?.items || []) as CertificateItem[];
    };

    return (
        <SyncedFormWrapper
            cvId={cvId}
            initialData={initialData}
            onStateChange={onStateChange}
            showUndoRedo={true}
            undoRedoPosition="top-right"
        >
            {({ data, onUpdate }) => {
                const certificatesItems = getCertificatesItems(data);
                const certificatesSectionIndex = data.sections.findIndex(
                    section => section.type === 'certificates'
                );

                const handleUpdate = (updatedItems: CertificateItem[]) => {
                    if (certificatesSectionIndex !== -1) {
                        onUpdate(`sections[${certificatesSectionIndex}].items`, updatedItems);
                    }
                };

                const handleAdd = () => {
                    const newCertificate: CertificateItem = {
                        id: crypto.randomUUID(),
                        name: '',
                        date: '',
                        issuer: '',
                        url: '',
                        description: ''
                    };
                    handleUpdate([...certificatesItems, newCertificate]);
                };

                const handleRemove = (index: number) => {
                    const updatedItems = certificatesItems.filter((_, i) => i !== index);
                    handleUpdate(updatedItems);
                };

                return (
                    <CertificatesSection
                        data={certificatesItems}
                        onUpdate={handleUpdate}
                        onAdd={handleAdd}
                        onRemove={handleRemove}
                    />
                );
            }}
        </SyncedFormWrapper>
    );
};

export default SyncedCertificatesForm;
