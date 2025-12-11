import React, { useState, useEffect } from 'react';
import { TranslationApiKeys, TranslationProvider } from '../../types';
import Button from '../ui/Button';
import { EyeIcon, EyeOffIcon, ExternalLinkIcon } from '../icons';

interface TranslationSettingsContentProps {
    keys: TranslationApiKeys;
    onSave: (keys: TranslationApiKeys) => void;
    onCancel?: () => void;
    showCancelButton?: boolean;
}

export const TranslationSettingsContent: React.FC<TranslationSettingsContentProps> = ({ keys, onSave, onCancel, showCancelButton = true }) => {
    const [localKeys, setLocalKeys] = useState(keys);
    const [visible, setVisible] = useState<Record<string, boolean>>({});

    // Sync input keys when prop changes (for external updates)
    useEffect(() => {
        setLocalKeys(keys);
    }, [keys]);

    const toggleVis = (k: string) => setVisible(p => ({ ...p, [k]: !p[k] }));

    const renderField = (label: string, key: keyof TranslationApiKeys | 'microsoft_region', placeholder: string, link: string) => (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-300">{label}</label>
                <a href={link} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center">
                    Get Key <ExternalLinkIcon className="w-3 h-3 ml-1" />
                </a>
            </div>
            <div className="relative">
                <input
                    type={visible[key] ? 'text' : 'password'}
                    className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={placeholder}
                    value={localKeys[key] || ''}
                    onChange={e => setLocalKeys({ ...localKeys, [key]: e.target.value })}
                />
                <button type="button" onClick={() => toggleVis(key)} className="absolute right-2 top-2.5 text-gray-500 hover:text-white">
                    {visible[key] ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-2">
            <p className="text-sm text-gray-400 mb-4 bg-gray-800 p-3 rounded border border-gray-700">
                Configure professional translation APIs for faster and consistent results. These keys are stored locally in your browser.
            </p>
            {renderField("DeepL API Key", TranslationProvider.DEEPL, "e.g., xxxxx-xxxx-xxxx:fx", "https://www.deepl.com/pro-api")}
            {renderField("Google Cloud Translate Key", TranslationProvider.GOOGLE, "AIzaSy...", "https://cloud.google.com/translate/docs/setup")}
            <div className="grid grid-cols-2 gap-4">
                {renderField("Microsoft Key", TranslationProvider.MICROSOFT, "Key 1 or Key 2", "https://azure.microsoft.com/en-us/services/cognitive-services/translator/")}
                {renderField("Microsoft Region", "microsoft_region", "e.g., eastus, global", "#")}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 border-t border-gray-700 pt-4">
                {renderField("LibreTranslate URL", "libre_base_url", "https://libretranslate.com", "https://github.com/LibreTranslate/LibreTranslate")}
                {renderField("LibreTranslate Key (Optional)", "libre_api_key", "API Key if required", "#")}
            </div>

            <div className="flex justify-end gap-2 mt-6 border-t border-gray-700/50 pt-4">
                {showCancelButton && onCancel && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
                <Button onClick={() => onSave(localKeys)}>Save Keys</Button>
            </div>
        </div>
    );
};
