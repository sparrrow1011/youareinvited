'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { invitationService, Invitation } from '@/lib/api';
import { FiCheckCircle, FiMapPin, FiTag, FiUser, FiClock, FiAlertCircle } from 'react-icons/fi';
import Image from 'next/image';

export default function SecurityCheckInPage() {
  const params = useParams();
  const id = params.id as string;
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    loadInvitation();
  }, [id]);

  const loadInvitation = async () => {
    try {
      const data = await invitationService.getById(id);
      setInvitation(data);
    } catch (error) {
      console.error('Error loading invitation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!invitation || invitation.checked_in) return;
    
    if (!confirm(`Confirm check-in for ${invitation.name}?`)) return;
    
    setCheckingIn(true);
    try {
      const updated = await invitationService.checkIn(id);
      setInvitation(updated);
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Failed to check in. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="card text-center max-w-md">
          <FiAlertCircle className="text-6xl text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Invalid QR Code</h1>
          <p className="text-gray-600">This invitation does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Security Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl shadow-lg">
          <h1 className="text-2xl font-bold text-center">Security Check-In</h1>
          <p className="text-center text-blue-100 text-sm mt-1">Scan QR → Verify → Check In</p>
        </div>

        {/* Guest Information Card */}
        <div className="bg-white shadow-lg rounded-b-2xl overflow-hidden">
          {invitation.checked_in ? (
            /* Already Checked In - Warning Display */
            <div className="p-8">
              <div className="bg-red-50 border-2 border-red-400 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-center gap-3 text-red-700 mb-3">
                  <FiAlertCircle className="text-4xl" />
                  <span className="text-2xl font-bold">ALREADY CHECKED IN</span>
                </div>
                <div className="text-center">
                  <p className="text-red-600 font-semibold">
                    {new Date(invitation.checked_in_at!).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </p>
                  <p className="text-red-500 text-sm mt-2">
                    This guest has already been admitted to the event
                  </p>
                </div>
              </div>

              {/* Show guest details even if checked in */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <FiUser className="text-2xl text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-500">Guest Name</p>
                    <p className="text-xl font-bold text-gray-900">{invitation.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <FiMapPin className="text-xl text-gray-600" />
                    <div>
                      <p className="text-xs text-gray-500">Seat</p>
                      <p className="text-lg font-semibold text-gray-900">{invitation.seat_number}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <FiTag className="text-xl text-gray-600" />
                    <div>
                      <p className="text-xs text-gray-500">Category</p>
                      <p className="text-lg font-semibold text-gray-900">{invitation.tag}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => window.location.reload()}
                  className="btn-secondary px-8 py-3"
                >
                  Scan Next Guest
                </button>
              </div>
            </div>
          ) : (
            /* Not Checked In - Allow Check In */
            <div className="p-8">
              {/* Guest Photo Placeholder */}
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <FiUser className="text-6xl text-white" />
                </div>
              </div>

              {/* Guest Name */}
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{invitation.name}</h2>
                <div className="inline-block bg-green-100 text-green-800 px-4 py-1 rounded-full text-sm font-semibold">
                  Ready to Check In
                </div>
              </div>

              {/* Guest Details */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <FiMapPin className="text-2xl text-blue-600" />
                    <span className="text-sm text-gray-600">Seat Number</span>
                  </div>
                  <span className="text-xl font-bold text-blue-900">{invitation.seat_number}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-3">
                    <FiTag className="text-2xl text-purple-600" />
                    <span className="text-sm text-gray-600">Category</span>
                  </div>
                  <span className="text-xl font-bold text-purple-900">{invitation.tag}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <FiClock className="text-2xl text-gray-600" />
                    <span className="text-sm text-gray-600">Invitation Created</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {new Date(invitation.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Check In Button */}
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-6 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-xl"
              >
                {checkingIn ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    Checking In...
                  </>
                ) : (
                  <>
                    <FiCheckCircle className="text-2xl" />
                    Check In Guest
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                Verify guest identity before checking in
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => window.location.href = '/security'}
            className="flex-1 bg-white text-gray-700 font-semibold py-3 px-6 rounded-lg shadow hover:shadow-md transition-all duration-200"
          >
            Back to Security
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-white text-gray-700 font-semibold py-3 px-6 rounded-lg shadow hover:shadow-md transition-all duration-200"
          >
            Scan Next
          </button>
        </div>
      </div>
    </div>
  );
}
