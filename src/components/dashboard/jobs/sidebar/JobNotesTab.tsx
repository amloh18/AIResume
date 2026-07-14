'use client';

import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import { JobApplication } from '@/types/job';

interface NoteEntry {
  id: string;
  content: string;
  date: string | Date;
}

interface JobNotesTabProps {
  job: JobApplication;
  user: any;
  notesString: string;
  notesSource: 'job' | 'journey';
  activeActionPayload: any;
  primaryJourney: any;
  onRefresh: () => Promise<void>;
}

const JobNotesTab: React.FC<JobNotesTabProps> = ({
  job,
  user,
  notesString,
  notesSource,
  activeActionPayload,
  primaryJourney,
  onRefresh,
}) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [noteCharacterCount, setNoteCharacterCount] = useState(0);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  
  // Parse existing string notes if no noteEntries exist
  const getInitialNotes = (): NoteEntry[] => {
    let entries: NoteEntry[] = [];
    
    // Check for new schema entries first
    const sourceData = notesSource === 'journey' ? primaryJourney : job;
    if (sourceData?.noteEntries && Array.isArray(sourceData.noteEntries)) {
      entries = sourceData.noteEntries.map((n: any) => ({
        id: n.id || crypto.randomUUID(),
        content: n.content,
        date: new Date(n.date)
      }));
      return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // Fallback to parsing legacy string format
    if (!notesString) return [];
    
    if (notesString.length > 100000) {
      return [{
        id: 'legacy',
        date: new Date(job.updatedAt || job.createdAt || Date.now()),
        content: notesString.trim()
      }];
    }
    
    const regex = /---\s*([^\s]+)\s*---\n([\s\S]*?)(?=(?:---\s*[^\s]+\s*---|$))/g;
    let match;
    while ((match = regex.exec(notesString)) !== null) {
      const dateStr = match[1];
      const content = match[2].trim();
      if (content) {
        const parsedDate = new Date(dateStr);
        if (Number.isNaN(parsedDate.getTime())) {
          continue;
        }
        entries.push({
          id: dateStr + '-' + Math.random().toString(36).substring(7),
          date: parsedDate,
          content
        });
      }
    }

    if (entries.length === 0 && notesString.trim()) {
      entries.push({
        id: 'legacy-' + Math.random().toString(36).substring(7),
        date: new Date(job.updatedAt || job.createdAt || Date.now()),
        content: notesString.trim()
      });
    }

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const [notesList, setNotesList] = useState<NoteEntry[]>(getInitialNotes());

  useEffect(() => {
    setNotesList(getInitialNotes());
  }, [job, primaryJourney, notesString]);

  const saveToBackend = async (updatedNotes: NoteEntry[]) => {
    // Generate the concatenated string for backwards compatibility with parts of the app that haven't migrated
    const newNotesString = updatedNotes
      .map(n => `--- ${new Date(n.date).toISOString()} ---
${n.content}

`)
      .join('');

    const payload = { 
      noteEntries: updatedNotes,
      notes: newNotesString 
    };

    if (notesSource === 'journey') {
      const targetJourneyId = activeActionPayload?.journeyId || primaryJourney?.id;
      const res = await authenticatedFetchWithUserId(`/api/application-journey/${targetJourneyId}`, user.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save note to journey');
    } else {
      const jobId = job.id || job._id;
      const res = await authenticatedFetchWithUserId(`/api/jobs/${jobId}`, user.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save note to job');
    }
  };

  const handleSaveNewNote = async () => {
    if (!newNoteText.trim() || !user?.id) return;
    try {
      setIsSavingNotes(true);
      
      const newEntry: NoteEntry = {
        id: crypto.randomUUID(),
        content: newNoteText.trim(),
        date: new Date()
      };
      
      const updatedNotes = [newEntry, ...notesList];
      await saveToBackend(updatedNotes);

      toast.success('Note added successfully!');
      setNewNoteText('');
      setShowAddNoteForm(false);
      setNoteCharacterCount(0);
      await onRefresh();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!user?.id) return;
    try {
      const updatedNotes = notesList.filter(n => n.id !== noteId);
      await saveToBackend(updatedNotes);

      toast.success('Note deleted');
      await onRefresh();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const handleUpdateNote = async (noteId: string, newContent: string) => {
    if (!user?.id || !newContent.trim()) return;
    try {
      const updatedNotes = notesList.map(n => 
        n.id === noteId ? { ...n, content: newContent.trim() } : n
      );
      
      await saveToBackend(updatedNotes);

      toast.success('Note updated');
      setEditingNoteId(null);
      setEditingNoteText('');
      await onRefresh();
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  };

  return (
    <div className="space-y-4 flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between flex-shrink-0">
        <h4 className="text-small font-bold text-gray-900 dark:text-white uppercase tracking-wider">Application Notes</h4>
        {!showAddNoteForm && (
          <button
            onClick={() => setShowAddNoteForm(true)}
            className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 text-[11px] font-bold transition flex items-center gap-1"
          >
            <Plus size={12} /> Add Note
          </button>
        )}
      </div>

      {showAddNoteForm && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-[#181f16] space-y-3 flex-shrink-0 animate-fadeIn">
          <div className="flex items-center justify-between">
            <p className="text-small font-bold text-gray-900 dark:text-white">New Note</p>
            <span className="text-[10px] text-gray-500">
              Saving to: <span className="font-semibold capitalize">{notesSource === 'journey' ? 'Journey' : 'Job'}</span>
            </span>
          </div>
          <textarea
            value={newNoteText}
            onChange={(e) => {
              setNewNoteText(e.target.value);
              setNoteCharacterCount(e.target.value.length);
            }}
            placeholder="Type your note content here..."
            className="w-full h-[120px] text-small rounded-lg border border-gray-250 bg-white p-2.5 dark:border-white/10 dark:bg-[#131810] focus:border-emerald-500 focus:outline-none dark:text-white resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500">{noteCharacterCount} characters</span>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddNoteForm(false);
                  setNewNoteText('');
                  setNoteCharacterCount(0);
                }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 text-[11px] font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewNote}
                disabled={isSavingNotes || !newNoteText.trim()}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition disabled:opacity-60"
              >
                {isSavingNotes ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {notesList.length > 0 ? (
        <div className="flex-1 overflow-y-auto pr-1 min-h-0 relative pl-4 border-l-2 border-gray-150 dark:border-white/5 space-y-5 py-2 ml-2">
          {notesList.map((entry) => {
            if (editingNoteId === entry.id) {
              return (
                <div key={entry.id} className="relative">
                  <div className="absolute -left-[23px] top-1.5 w-3 h-3 bg-white dark:bg-[#181f16] border-2 border-emerald-500 rounded-full z-10 shadow-sm" />
                  <div className="bg-white dark:bg-[#181f16] rounded-xl border border-gray-200 dark:border-white/10 p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <textarea
                      value={editingNoteText}
                      onChange={(e) => setEditingNoteText(e.target.value)}
                      className="w-full h-24 text-small rounded-lg border border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-900/10 p-2 focus:border-emerald-500 focus:outline-none dark:text-white resize-none mb-2"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingNoteId(null);
                          setEditingNoteText('');
                        }}
                        className="px-2 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateNote(entry.id, editingNoteText)}
                        disabled={!editingNoteText.trim()}
                        className="px-2 py-1 text-[11px] font-bold bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:opacity-50"
                      >
                        Save Update
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={entry.id} className="relative group">
                <div className="absolute -left-[23px] top-1.5 w-3 h-3 bg-gray-200 dark:bg-white/20 rounded-full z-10 group-hover:bg-emerald-400 group-hover:border-2 group-hover:border-white dark:group-hover:border-[#181f16] transition-colors" />
                <div className="bg-white dark:bg-[#181f16] rounded-xl border border-gray-200 dark:border-white/5 p-3.5 shadow-sm hover:shadow-md transition-shadow group-hover:border-emerald-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingNoteId(entry.id);
                          setEditingNoteText(entry.content);
                        }}
                        className="text-[10px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this note?')) {
                            handleDeleteNote(entry.id);
                          }
                        }}
                        className="text-[10px] font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="text-small text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {entry.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !showAddNoteForm && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#181f16]/50">
            <p className="text-small text-gray-500 dark:text-gray-400 text-center mb-3">
              No notes added yet for this {notesSource}.
            </p>
            <button
              onClick={() => setShowAddNoteForm(true)}
              className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
            >
              <Plus size={12} /> Add your first note
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default JobNotesTab;
