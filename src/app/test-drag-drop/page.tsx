'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  useSortable,
} from '@dnd-kit/sortable';
import {
  useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface Job {
  id: string;
  jobTitle: string;
  company: string;
  status: string;
  priority: string;
}

const SortableJobCard: React.FC<{ job: Job }> = ({ job }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`bg-white/5 border border-white/10 rounded-xl p-4 mb-3 cursor-move ${
        isDragging ? 'opacity-50 rotate-2 scale-105' : ''
      }`}
      whileHover={{ y: -2, scale: 1.02 }}
      {...attributes}
      {...listeners}
    >
      <h3 className="text-white font-semibold">{job.jobTitle}</h3>
      <p className="text-white/60">{job.company}</p>
      <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${
        job.priority === 'high' ? 'bg-red-500/20 text-red-400' :
        job.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
        'bg-green-500/20 text-green-400'
      }`}>
        {job.priority}
      </span>
    </motion.div>
  );
};

const DroppableZone: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div className="flex-1 min-w-[250px]">
      <div className={`${isOver ? 'bg-white/10' : 'bg-white/5'} border border-white/10 rounded-xl p-4 mb-4`}>
        <h3 className="text-white font-semibold mb-2">{title}</h3>
        <div
          ref={setNodeRef}
          className={`min-h-[200px] transition-colors duration-200 ${
            isOver ? 'bg-white/5 border-2 border-dashed border-white/20 rounded-lg p-2' : ''
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

const TestDragDrop: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const userId = '6889b151d17daa1eaee91a5c';

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/jobs?userId=${userId}`);
      const result = await response.json();
      if (result.success) {
        setJobs(result.data.map((job: any) => ({
          ...job,
          id: job.id || job._id
        })));
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    console.log('Drag start:', event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    console.log('Drag end:', { active: active.id, over: over?.id });

    if (over && active.id !== over.id) {
      const activeJob = jobs.find(job => job.id === active.id);
      const newStatus = over.id as string;
      
      console.log('Updating job:', { jobId: activeJob?.id, newStatus });
      
      if (activeJob) {
        try {
          const response = await fetch('/api/jobs', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: activeJob.id,
              status: newStatus,
              applicationDate: newStatus === 'applied' ? new Date().toISOString() : undefined
            })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              console.log('Job updated successfully:', result.data);
              setJobs(jobs.map(job => 
                job.id === active.id ? { ...job, status: newStatus } : job
              ));
            } else {
              console.error('Failed to update job:', result);
            }
          } else {
            console.error('HTTP error updating job:', response.status);
          }
        } catch (error) {
          console.error('Error updating job status:', error);
        }
      }
    }
  };

  const getJobsByStatus = (status: string) => {
    return jobs.filter(job => job.status === status);
  };

  const stages = [
    { id: 'created', title: 'Created' },
    { id: 'applied', title: 'Applied' },
    { id: 'screening', title: 'Screening' },
    { id: 'interview', title: 'Interview' },
    { id: 'offer', title: 'Offer' },
    { id: 'rejected', title: 'Rejected' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Drag & Drop Test</h1>
          <p className="text-white/60">Test drag and drop functionality between job stages</p>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => (
              <DroppableZone key={stage.id} id={stage.id} title={`${stage.title} (${getJobsByStatus(stage.id).length})`}>
                {getJobsByStatus(stage.id).map((job) => (
                  <SortableJobCard key={job.id} job={job} />
                ))}
              </DroppableZone>
            ))}
          </div>

          <DragOverlay>
            {activeId ? (
              <div className="bg-white/10 border border-white/20 rounded-xl p-4 shadow-2xl">
                <div className="text-white font-semibold">
                  {jobs.find(job => job.id === activeId)?.jobTitle}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Debug Info */}
        <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-xl">
          <h3 className="text-white font-semibold mb-2">Debug Information:</h3>
          <div className="text-white/60 text-sm space-y-1">
            <div>Total Jobs: {jobs.length}</div>
            <div>Active Drag ID: {activeId || 'None'}</div>
            <div>Jobs by Status:</div>
            {stages.map(stage => (
              <div key={stage.id} className="ml-4">
                {stage.title}: {getJobsByStatus(stage.id).length}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestDragDrop; 