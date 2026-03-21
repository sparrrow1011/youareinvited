'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { eventService } from '@/lib/api';

export default function NewEventPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const event = await eventService.create({ name, date, description });
      router.push(`/events/${event.id}`);
    } catch {
      setError('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white p-8">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-[#a8dadc] mb-6 hover:underline text-sm"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold mb-6">Create New Event</h1>
        <form onSubmit={handleSubmit} className="space-y-4 bg-[#16213e] p-6 rounded-lg">
          <div>
            <label className="block text-sm text-[#a8dadc] mb-1">Event Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 rounded bg-[#0f3460] text-white border border-[#0f3460] focus:outline-none focus:border-[#e94560]"
              placeholder="Sarah & James Wedding"
            />
          </div>
          <div>
            <label className="block text-sm text-[#a8dadc] mb-1">Event Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-2 rounded bg-[#0f3460] text-white border border-[#0f3460] focus:outline-none focus:border-[#e94560]"
            />
          </div>
          <div>
            <label className="block text-sm text-[#a8dadc] mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded bg-[#0f3460] text-white border border-[#0f3460] focus:outline-none focus:border-[#e94560]"
              placeholder="A brief description of the event"
            />
          </div>
          {error && <p className="text-[#e94560] text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#e94560] text-white rounded font-semibold hover:bg-opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
}
