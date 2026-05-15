import { useState, useMemo } from 'react';
import Icon from './Icon';

const CLUSTER_COLORS = ['amber', 'blue', 'green', 'purple', 'rose', 'cyan'];

function autoColor(index: number) {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
}

interface ClusterFormProps {
  allTags: string[];
  initial?: { id?: string; name: string; tags: string[]; color?: string };
  onSave: (data: { name: string; tags: string[]; color: string }) => void;
  onCancel: () => void;
  onDelete?: () => void;
  clusterCount?: number;
}

export default function ClusterForm({ allTags, initial, onSave, onCancel, onDelete, clusterCount = 0 }: ClusterFormProps) {
  const isEdit = !!initial?.id;
  const [name, setName] = useState(initial?.name || '');
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.tags || []));
  const [tagSearch, setTagSearch] = useState('');

  const color = initial?.color || autoColor(clusterCount);

  const filteredTags = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    return allTags.filter(t => !selected.has(t) && t.toLowerCase().includes(q));
  }, [allTags, selected, tagSearch]);

  const toggleTag = (t: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const canSave = name.trim().length > 0 && selected.size > 0;

  return (
    <div className="cluster-form">
      <div className="cluster-form-head">
        <div className="cluster-form-title">{isEdit ? 'Edit cluster' : 'New cluster'}</div>
        <button className="icon-btn" onClick={onCancel}><Icon name="close" size={12} /></button>
      </div>

      <div className="cluster-form-body">
        <div className="form-row">
          <label className="form-label">Name</label>
          <input
            className="form-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Infrastructure"
            autoFocus
          />
        </div>

        <div className="form-row">
          <label className="form-label">Tags ({selected.size} selected)</label>
          <div className="cluster-tag-picker">
            {selected.size > 0 && (
              <div className="cluster-selected-tags">
                {Array.from(selected).map(t => (
                  <span key={t} className="cluster-tag-chip active" onClick={() => toggleTag(t)}>
                    #{t} <Icon name="close" size={9} stroke={2} />
                  </span>
                ))}
              </div>
            )}
            <input
              className="form-input"
              value={tagSearch}
              onChange={e => setTagSearch(e.target.value)}
              placeholder="Search existing tags…"
            />
            {filteredTags.length > 0 && (
              <div className="cluster-tag-options">
                {filteredTags.map(t => (
                  <button key={t} className="cluster-tag-chip" onClick={() => { toggleTag(t); setTagSearch(''); }}>
                    #{t}
                  </button>
                ))}
              </div>
            )}
            {tagSearch && filteredTags.length === 0 && (
              <div className="empty-hint" style={{ fontSize: 11, padding: 6 }}>No matching tags</div>
            )}
          </div>
        </div>
      </div>

      <div className="cluster-form-actions">
        {isEdit && onDelete && (
          <button className="btn btn-sm btn-ghost-danger" onClick={onDelete}>
            <Icon name="trash" size={11} /> Delete
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
        <button
          className="btn btn-sm btn-primary"
          disabled={!canSave}
          onClick={() => onSave({ name: name.trim(), tags: Array.from(selected), color })}
        >
          {isEdit ? 'Save' : 'Create'}
        </button>
      </div>
    </div>
  );
}
