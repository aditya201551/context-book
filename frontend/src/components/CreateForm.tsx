import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from './Icon';

interface CreateFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { title: string; tags: string[]; pages: string[]; source: string; bookId?: string }) => void;
  initial?: { title: string; tags: string[]; pages: string[]; source: string; book_id: string } | null;
}

const DRAFT_KEY = 'cb_draft';

interface Draft {
  title: string;
  tags: string[];
  pages: string[];
  savedAt: string;
}

function saveDraft(draft: Draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
}

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

export default function CreateForm({ open, onClose, onSave, initial }: CreateFormProps) {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [pages, setPages] = useState<string[]>(['']);
  const [autoSaved, setAutoSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEdit = !!initial;

  // Reset / load when opening
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setTags(initial.tags);
      setPages(initial.pages.length ? initial.pages : ['']);
      clearDraft();
    } else {
      const draft = loadDraft();
      if (draft) {
        setTitle(draft.title);
        setTags(draft.tags);
        setPages(draft.pages.length ? draft.pages : ['']);
      } else {
        setTitle('');
        setTags([]);
        setPages(['']);
      }
    }
    setTagInput('');
    setAutoSaved(false);
  }, [open, initial]);

  // Auto-save draft (debounced)
  const triggerAutoSave = useCallback(() => {
    if (isEdit) return; // don't auto-save edits
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveDraft({ title, tags, pages, savedAt: new Date().toISOString() });
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 800);
  }, [title, tags, pages, isEdit]);

  useEffect(() => {
    if (open && !isEdit) triggerAutoSave();
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [title, tags, pages, open, isEdit, triggerAutoSave]);

  const addTag = () => {
    const t = tagInput.replace(/^#/, '').trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const updatePage = (index: number, value: string) => {
    setPages(prev => prev.map((p, i) => i === index ? value : p));
  };

  const addPage = () => {
    setPages(prev => [...prev, '']);
  };

  const removePage = (index: number) => {
    setPages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const cleanPages = pages.map(p => p.trim()).filter(p => p.length > 0);
    onSave({
      title: title.trim(),
      tags,
      pages: cleanPages.length > 0 ? cleanPages : [''],
      source: initial?.source || 'user',
      bookId: initial?.book_id,
    });
    clearDraft();
    onClose();
  };

  const tokens = pages.reduce((acc, p) => acc + Math.ceil(p.length / 4), 0);

  if (!open) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer drawer-create" onClick={e => e.stopPropagation()}>
        <header className="drawer-head">
          <div className="drawer-head-meta">
            <span className="create-badge"><Icon name="plus" size={12} stroke={2.5}/> {isEdit ? 'Edit context' : 'New context'}</span>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={16}/></button>
        </header>

        <div className="form-field">
          <label>Title</label>
          <input className="form-input form-input-lg"
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="A descriptive title for future-you…" autoFocus />
        </div>

        <div className="form-field">
          <label>Tags</label>
          <div className="tag-input-wrap">
            {tags.map(t => (
              <span key={t} className="tag tag-removable">
                #{t}
                <button onClick={() => setTags(tags.filter(x => x !== t))}><Icon name="close" size={9} stroke={2.5}/></button>
              </span>
            ))}
            <input className="tag-input" value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
              onBlur={addTag}
              placeholder={tags.length ? '' : 'architecture, meeting, research…'} />
          </div>
        </div>

        <div className="form-field">
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Pages</span>
            <span className="form-hint mono">markdown supported · ~{tokens} tokens</span>
          </label>
          <div className="pages-list">
            {pages.map((page, i) => (
              <div key={i} className="page-editor">
                <div className="page-editor-head">
                  <span className="mono">Page {String(i).padStart(2, '0')}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {pages.length > 1 && (
                      <button className="icon-btn" onClick={() => removePage(i)} title="Remove page">
                        <Icon name="trash" size={11} />
                      </button>
                    )}
                    <button className="icon-btn" onClick={addPage} title="Add page below">
                      <Icon name="plus" size={11} stroke={2.5} />
                    </button>
                  </div>
                </div>
                <textarea
                  className="form-input form-textarea"
                  value={page}
                  onChange={e => updatePage(i, e.target.value)}
                  placeholder={i === 0
                    ? "# Start with a heading\n\nUse markdown. Paste transcripts, notes, decisions. Anything you want future-you — or any AI — to remember."
                    : "Additional page content…"}
                  rows={8}
                />
              </div>
            ))}
          </div>
        </div>

        <footer className="form-foot">
          <div className="form-foot-left mono">
            {!isEdit && (
              autoSaved
                ? <>Auto-saved to draft · <Icon name="check" size={10} /></>
                : <>Auto-save draft · <span className="pulse-dot" /></>
            )}
            {isEdit && <span>Editing existing context</span>}
          </div>
          <div className="form-foot-right">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>
              {isEdit ? 'Update context' : 'Save context'} <span className="kbd-sm">⌘↵</span>
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
