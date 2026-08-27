import type { ExtractedField } from '../../types/screening';
import { FieldRow } from './FieldRow';

interface ExtractedFieldsProps {
  fields: ExtractedField[];
}

export function ExtractedFields({ fields }: ExtractedFieldsProps) {
  if (fields.length === 0) {
    return <p className="px-2 py-1.5 text-scale-3 text-steel-400">No fields extracted.</p>;
  }

  return (
    <div className="divide-y divide-shell-700">
      {fields.map((field) => (
        <FieldRow key={field.key} field={field} />
      ))}
    </div>
  );
}
