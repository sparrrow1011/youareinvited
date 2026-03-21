'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { eventService, authService, Event } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    eventService.getAll()
      .then(setEvents)
      .catch(() => setError('Failed to load events.'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    router.push('/login');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event and all its invitations?')) return;
    await eventService.delete(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Events</h1>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/events/new')}
              className="px-4 py-2 bg-[#e94560] rounded font-semibold hover:bg-opacity-90"
            >
              + New Event
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-[#0f3460] rounded hover:bg-opacity-80"
            >
              Log out
            </button>
          </div>
        </div>

        {loading && <p className="text-[#a8dadc]">Loading…</p>}
        {error && <p className="text-[#e94560]">{error}</p>}

        {!loading && events.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#a8dadc] mb-4">No events yet.</p>
            <button
              onClick={() => router.push('/events/new')}
              className="px-6 py-3 bg-[#e94560] rounded font-semibold"
            >
              Create Your First Event
            </button>
          </div>
        )}

        <div className="grid gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-[#16213e] rounded-lg p-6 flex justify-between items-center"
            >
              <div>
                <h2 className="text-xl font-semibold">{event.name}</h2>
                <p className="text-[#a8dadc] text-sm mt-1">{event.date}</p>
                {event.description && (
                  <p className="text-gray-400 text-sm mt-1">{event.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/events/${event.id}`)}
                  className="px-4 py-2 bg-[#0f3460] rounded hover:bg-opacity-80 text-sm"
                >
                  Manage
                </button>
                <button
                  onClick={() => handleDelete(event.id)}
                  className="px-4 py-2 bg-[#e94560] bg-opacity-20 rounded hover:bg-opacity-40 text-sm text-[#e94560]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
