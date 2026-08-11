'use client';

import type { Invitation } from '@/lib/api';

export type RSVPFilter = '' | 'attending' | 'not_attending' | 'no_response';
export type CheckInStatusFilter = '' | 'checked_in' | 'pending';
export type OpenStatusFilter = '' | 'opened' | 'not_opened';

export const getRSVPLabel = (invitation: Invitation) => {
  if (!invitation.rsvp_responded_at) return 'No RSVP';
  return invitation.rsvp_attending ? 'Coming' : 'Not coming';
};

export const getRSVPBadgeClass = (invitation: Invitation) => {
  if (!invitation.rsvp_responded_at) return 'bg-surface-container text-on-surface-variant';
  return invitation.rsvp_attending
    ? 'bg-brand-container/40 text-on-brand-container'
    : 'bg-tertiary-container/25 text-tertiary';
};

export const getOpenLabel = (invitation: Invitation) => {
  if (!invitation.first_viewed_at) return 'Not opened';
  const countLabel = invitation.view_count === 1 ? '1 open' : `${invitation.view_count} opens`;
  return countLabel;
};

export const getLastOpenLabel = (invitation: Invitation) => {
  if (!invitation.last_viewed_at) return '';
  return new Date(invitation.last_viewed_at).toLocaleString();
};

export interface EventGuestsSectionProps {
  invitations: Invitation[];
  invitationsLoading: boolean;
  invitationCount: number;
  totalGuests: number;
  invitationPage: number;
  invitationTotalPages: number;
  pageSize: number;
  search: string;
  debouncedSearch: string;
  rsvpFilter: RSVPFilter;
  checkInStatusFilter: CheckInStatusFilter;
  openStatusFilter: OpenStatusFilter;
  selectedIds: Set<string>;
  bulkSendLoading: boolean;
  bulkDeleteLoading: boolean;
  onSearchChange: (value: string) => void;
  onRsvpFilterChange: (value: RSVPFilter) => void;
  onCheckInStatusFilterChange: (value: CheckInStatusFilter) => void;
  onOpenStatusFilterChange: (value: OpenStatusFilter) => void;
  onPageChange: (updater: (page: number) => number) => void;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onAddGuest: () => void;
  onPreview: (invitation: Invitation) => void;
  onEdit: (invitation: Invitation) => void;
  onUndoCheckIn: (id: string) => void;
  onDelete: (id: string) => void;
  onSendWhatsApp: () => void;
  onBulkDelete: () => void;
}

/**
 * Organizer Guests tab: search/filters, invitation list (mobile cards +
 * desktop table), bulk actions, and pagination.
 */
export default function EventGuestsSection({
  invitations,
  invitationsLoading,
  invitationCount,
  totalGuests,
  invitationPage,
  invitationTotalPages,
  pageSize,
  search,
  debouncedSearch,
  rsvpFilter,
  checkInStatusFilter,
  openStatusFilter,
  selectedIds,
  bulkSendLoading,
  bulkDeleteLoading,
  onSearchChange,
  onRsvpFilterChange,
  onCheckInStatusFilterChange,
  onOpenStatusFilterChange,
  onPageChange,
  onSelect,
  onSelectAll,
  onAddGuest,
  onPreview,
  onEdit,
  onUndoCheckIn,
  onDelete,
  onSendWhatsApp,
  onBulkDelete,
}: EventGuestsSectionProps) {
  const hasActiveFilters = Boolean(debouncedSearch || rsvpFilter || checkInStatusFilter || openStatusFilter);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="font-headline text-2xl font-normal">Guest List</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Add, import, edit, and preview invitations for this event.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-on-surface-variant">
            {hasActiveFilters
              ? `${invitationCount} match${invitationCount !== 1 ? 'es' : ''}`
              : `${totalGuests} guest${totalGuests !== 1 ? 's' : ''}`}
          </span>
          <button
            onClick={onAddGuest}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand/20 transition-colors hover:bg-brand-dim"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            Add Guest
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-4xl">
          <label className="relative block w-full sm:max-w-md">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search guests, seats, tags, or phone numbers"
              className="h-11 w-full rounded-full border border-outline-variant/20 bg-white/70 pl-10 pr-4 text-sm text-on-surface outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="relative block w-full sm:max-w-56">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              event_available
            </span>
            <select
              value={rsvpFilter}
              onChange={(event) => onRsvpFilterChange(event.target.value as RSVPFilter)}
              className="h-11 w-full appearance-none rounded-full border border-outline-variant/20 bg-white/70 pl-10 pr-8 text-sm text-on-surface outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
            >
              <option value="">All RSVPs</option>
              <option value="attending">Coming</option>
              <option value="not_attending">Not coming</option>
              <option value="no_response">No response</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              expand_more
            </span>
          </label>
          <label className="relative block w-full sm:max-w-56">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              how_to_reg
            </span>
            <select
              value={checkInStatusFilter}
              onChange={(event) => onCheckInStatusFilterChange(event.target.value as CheckInStatusFilter)}
              className="h-11 w-full appearance-none rounded-full border border-outline-variant/20 bg-white/70 pl-10 pr-8 text-sm text-on-surface outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
            >
              <option value="">All statuses</option>
              <option value="checked_in">Checked In</option>
              <option value="pending">Pending</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              expand_more
            </span>
          </label>
          <label className="relative block w-full sm:max-w-56">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              visibility
            </span>
            <select
              value={openStatusFilter}
              onChange={(event) => onOpenStatusFilterChange(event.target.value as OpenStatusFilter)}
              className="h-11 w-full appearance-none rounded-full border border-outline-variant/20 bg-white/70 pl-10 pr-8 text-sm text-on-surface outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
            >
              <option value="">All opens</option>
              <option value="opened">Opened</option>
              <option value="not_opened">Not opened</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              expand_more
            </span>
          </label>
        </div>
        {invitationCount > 0 && (
          <span className="text-xs text-on-surface-variant">
            Showing {(invitationPage - 1) * pageSize + 1}-{Math.min(invitationPage * pageSize, invitationCount)} of {invitationCount}
          </span>
        )}
      </div>

      <div className="bg-surface-container-lowest rounded-[2rem] overflow-hidden border border-outline-variant/10 shadow-sm">
        {invitationsLoading ? (
          <div className="py-16 sm:py-20 px-6 text-center">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-4 block animate-pulse">hourglass_empty</span>
            <p className="text-on-surface-variant text-sm">Loading guests...</p>
          </div>
        ) : invitations.length === 0 ? (
          <div className="py-16 sm:py-20 px-6 text-center">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-4 block">
              {debouncedSearch ? 'search_off' : 'group_add'}
            </span>
            <p className="text-on-surface-variant text-sm mb-4">
              {hasActiveFilters ? 'No guests match your filters.' : 'No guests yet.'}
            </p>
            {!hasActiveFilters && (
              <button
                onClick={onAddGuest}
                className="px-6 py-2.5 bg-brand text-white rounded-full text-sm font-medium"
              >
                Add First Guest
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-outline-variant/10">
              {invitations.map((inv) => (
                <div key={inv.id} className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(inv.id)}
                        onChange={() => onSelect(inv.id)}
                        className="mt-1 rounded"
                        aria-label={`Select ${inv.name}`}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-on-surface truncate">{inv.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-on-surface-variant">
                            {inv.seat_number ? `Seat ${inv.seat_number}` : 'No seat assigned'}
                          </span>
                          {inv.tag && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container">
                              {inv.tag}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getRSVPBadgeClass(inv)}`}>
                            {getRSVPLabel(inv)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${inv.first_viewed_at
                            ? 'bg-brand-container/30 text-on-brand-container'
                            : 'bg-surface-container text-on-surface-variant'
                          }`}>
                            {getOpenLabel(inv)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${inv.checked_in
                      ? 'bg-brand-container/40 text-on-brand-container'
                      : 'bg-surface-container text-on-surface-variant'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${inv.checked_in ? 'bg-brand' : 'bg-outline-variant'}`} />
                      {inv.checked_in ? 'Checked In' : 'Pending'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onPreview(inv)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-container text-xs font-medium text-on-surface-variant"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      View
                    </button>
                    <button
                      onClick={() => onEdit(inv)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-container text-xs font-medium text-on-surface-variant"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Edit
                    </button>
                    {inv.checked_in && (
                      <button
                        onClick={() => onUndoCheckIn(inv.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-secondary-container/40 text-xs font-medium text-on-surface"
                      >
                        <span className="material-symbols-outlined text-sm">undo</span>
                        Undo
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(inv.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-tertiary-container/20 text-xs font-medium text-tertiary"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedIds.size > 0 && (
              <div className="m-4 p-3 bg-surface-container rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-sm text-on-surface">
                  {selectedIds.size} guest{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={onSendWhatsApp}
                    disabled={bulkSendLoading || bulkDeleteLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dim disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    Send WhatsApp
                  </button>
                  <button
                    onClick={onBulkDelete}
                    disabled={bulkDeleteLoading || bulkSendLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-tertiary-container/30 px-4 py-2 text-sm font-medium text-tertiary transition hover:bg-tertiary-container/50 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    {bulkDeleteLoading ? 'Deleting...' : 'Delete Selected'}
                  </button>
                </div>
              </div>
            )}

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/10 bg-surface-container-low">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === invitations.length && invitations.length > 0}
                        onChange={onSelectAll}
                        className="rounded"
                      />
                    </th>
                    {['Name', 'Opened', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-surface-container-low/50 transition-colors group">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(inv.id)}
                          onChange={() => onSelect(inv.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-on-surface">{inv.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-on-surface-variant">
                            {inv.seat_number ? `Seat ${inv.seat_number}` : 'No seat assigned'}
                          </span>
                          {inv.tag && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container">
                              {inv.tag}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getRSVPBadgeClass(inv)}`}>
                            {getRSVPLabel(inv)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${inv.first_viewed_at
                            ? 'bg-brand-container/40 text-on-brand-container'
                            : 'bg-surface-container text-on-surface-variant'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${inv.first_viewed_at ? 'bg-brand' : 'bg-outline-variant'}`} />
                            {getOpenLabel(inv)}
                          </span>
                          {inv.last_viewed_at && (
                            <span className="text-xs text-on-surface-variant">
                              Last: {getLastOpenLabel(inv)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${inv.checked_in
                            ? 'bg-brand-container/40 text-on-brand-container'
                            : 'bg-surface-container text-on-surface-variant'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${inv.checked_in ? 'bg-brand' : 'bg-outline-variant'}`} />
                            {inv.checked_in ? 'Checked In' : 'Pending'}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getRSVPBadgeClass(inv)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${inv.rsvp_responded_at ? (inv.rsvp_attending ? 'bg-brand' : 'bg-tertiary') : 'bg-outline-variant'}`} />
                            {getRSVPLabel(inv)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onPreview(inv)}
                            className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant hover:text-brand"
                            title="Preview invitation"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                          </button>
                          <button
                            onClick={() => onEdit(inv)}
                            className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant hover:text-brand"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          {inv.checked_in && (
                            <button
                              onClick={() => onUndoCheckIn(inv.id)}
                              className="p-1.5 rounded-lg hover:bg-secondary-container transition-colors text-on-surface-variant hover:text-warm"
                              title="Undo check-in"
                            >
                              <span className="material-symbols-outlined text-sm">undo</span>
                            </button>
                          )}
                          <button
                            onClick={() => onDelete(inv.id)}
                            className="p-1.5 rounded-lg hover:bg-tertiary-container/30 transition-colors text-on-surface-variant hover:text-tertiary"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invitationTotalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-outline-variant/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-on-surface-variant">
                  Page {invitationPage} of {invitationTotalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPageChange((page) => Math.max(page - 1, 1))}
                    disabled={invitationPage <= 1 || invitationsLoading}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-outline-variant/20 bg-white/70 px-3 text-xs font-semibold text-on-surface transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => onPageChange((page) => Math.min(page + 1, invitationTotalPages))}
                    disabled={invitationPage >= invitationTotalPages || invitationsLoading}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-outline-variant/20 bg-white/70 px-3 text-xs font-semibold text-on-surface transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
