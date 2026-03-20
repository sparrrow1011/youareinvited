'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { invitationService, Invitation, resolveMediaUrl } from '@/lib/api';
import { FiCheckCircle, FiMapPin, FiTag, FiDownload, FiShare2 } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import Image from 'next/image';

export default function InvitationPage() {
  const params = useParams();
  const id = params.id as string;
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvitation();
  }, [id]);

  const loadInvitation = async () => {
    try {
      const data = await invitationService.getById(id);
      setInvitation(data);
    } catch (error) {
      console.error('Error loading invitation:', error);
      alert('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!invitation) return;
    window.open(invitation.whatsapp_share_url, '_blank');
  };

  const handleDownloadInvite = () => {
    if (!invitation) return;
    window.open(resolveMediaUrl(invitation.e_invite_image), '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-secondary to-primary">
        <div className="text-2xl text-white">Loading your invitation...</div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-secondary to-primary">
        <div className="card text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Invitation Not Found</h1>
          <p className="text-gray-600">This invitation does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-primary py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Main Invitation Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-accent to-pink-600 text-white p-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">You're Invited!</h1>
            <p className="text-lg opacity-90">We're excited to celebrate with you</p>
          </div>

          {/* Guest Information */}
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{invitation.name}</h2>
              
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
                  <FiMapPin className="text-blue-600" />
                  <span className="font-semibold">Seat: {invitation.seat_number}</span>
                </div>
                <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-lg">
                  <FiTag className="text-purple-600" />
                  <span className="font-semibold">{invitation.tag}</span>
                </div>
              </div>

              {/* Check-in Status */}
              {invitation.checked_in ? (
                <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-center gap-2 text-green-700 mb-2">
                    <FiCheckCircle className="text-3xl" />
                    <span className="text-2xl font-bold">Checked In</span>
                  </div>
                  <p className="text-green-600">
                    {new Date(invitation.checked_in_at!).toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600 mt-2">
                    See you at the event!
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border-2 border-blue-500 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-center gap-2 text-blue-700 mb-2">
                    <FiCheckCircle className="text-3xl" />
                    <span className="text-2xl font-bold">Not Yet Checked In</span>
                  </div>
                  <p className="text-blue-600 text-center">
                    Please show your QR code to security at the venue entrance for check-in
                  </p>
                </div>
              )}
            </div>

            {/* QR Code Section */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                Your QR Code
              </h3>
              <div className="flex justify-center">
                {invitation.qr_code && (
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <Image
                      src={resolveMediaUrl(invitation.qr_code)}
                      alt="QR Code"
                      width={200}
                      height={200}
                    />
                  </div>
                )}
              </div>
              <p className="text-center text-sm text-gray-600 mt-4">
                Show this QR code at the venue
              </p>
            </div>

            {/* E-Invite Preview */}
            {invitation.e_invite_image && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                  Your Digital Invitation
                </h3>
                <div className="flex justify-center">
                  <div className="max-w-md">
                    <Image
                      src={resolveMediaUrl(invitation.e_invite_image)}
                      alt="E-Invite"
                      width={400}
                      height={600}
                      className="rounded-lg shadow-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <FaWhatsapp className="text-xl" />
                Share via WhatsApp
              </button>
              <button
                onClick={handleDownloadInvite}
                className="flex items-center justify-center gap-2 btn-secondary py-3"
              >
                <FiDownload className="text-xl" />
                Download Invitation
              </button>
            </div>

            {/* Important Notice */}
            <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <p className="text-sm text-blue-800">
                <strong>At the Venue:</strong> Show your QR code to security at the entrance. They will scan it and check you in.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-white">
          <p className="text-sm opacity-75">
            Have questions? Contact the event organizer
          </p>
        </div>
      </div>
    </div>
  );
}
