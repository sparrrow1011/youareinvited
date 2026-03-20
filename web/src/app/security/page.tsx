'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiSearch, FiShield, FiCheckCircle, FiCamera } from 'react-icons/fi';

export default function SecurityDashboard() {
  const [invitationId, setInvitationId] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invitationId.trim()) {
      router.push(`/security/check-in/${invitationId.trim()}`);
    }
  };

  const handleScanQR = () => {
    alert('QR Scanner integration coming soon!\n\nFor now:\n1. Scan QR code with phone camera\n2. Open the link\n3. The URL will contain the invitation ID\n4. Enter that ID here');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-full p-6">
              <FiShield className="text-6xl text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Security Check-In
          </h1>
          <p className="text-xl text-blue-100">
            Scan guest QR codes or enter invitation ID
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/admin" className="bg-white text-blue-700 font-semibold px-4 py-2 rounded-lg">
              Switch to Admin
            </Link>
            <a href="/logout" className="bg-blue-900 text-white font-semibold px-4 py-2 rounded-lg">
              Logout
            </a>
          </div>
        </div>

        {/* Main Card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* QR Scan Section */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-8 text-white">
              <h2 className="text-2xl font-bold mb-4 text-center">Scan QR Code</h2>
              <button
                onClick={handleScanQR}
                className="w-full bg-white text-blue-600 font-bold py-6 rounded-xl hover:bg-blue-50 transition-all duration-200 flex items-center justify-center gap-3 text-lg shadow-lg"
              >
                <FiCamera className="text-3xl" />
                Open QR Scanner
              </button>
              <p className="text-center text-sm text-blue-100 mt-3">
                Guest QR codes will automatically redirect to check-in
              </p>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center px-8">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 py-2 text-sm text-gray-500 font-medium">
                  OR ENTER MANUALLY
                </span>
              </div>
            </div>

            {/* Manual Entry Section */}
            <div className="p-8">
              <h2 className="text-xl font-bold mb-4 text-gray-900">Enter Invitation ID</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Invitation ID</label>
                  <input
                    type="text"
                    value={invitationId}
                    onChange={(e) => setInvitationId(e.target.value)}
                    placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                    className="input-field text-lg"
                    autoFocus
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    The invitation ID is found in the guest's URL or QR code
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2"
                  disabled={!invitationId.trim()}
                >
                  <FiSearch className="text-xl" />
                  Look Up Guest
                </button>
              </form>
            </div>

            {/* Instructions */}
            <div className="bg-gray-50 p-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">How to Use:</h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>Guest shows QR code at entrance</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>Scan QR code with camera or QR scanner app</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>Link opens automatically showing guest details</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600">4.</span>
                  <span>Verify identity and click "Check In Guest"</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600">5.</span>
                  <span>System confirms - guest is admitted</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-8 text-center">
            <a
              href="/admin"
              className="inline-flex items-center gap-2 text-white hover:text-blue-200 transition-colors"
            >
              <FiCheckCircle />
              <span>View Admin Dashboard for Stats</span>
            </a>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="max-w-2xl mx-auto mt-8 bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-6 text-white">
          <h3 className="font-semibold mb-2">QR Code Format</h3>
          <p className="text-sm text-blue-100">
            Each QR code contains a URL like: <br />
            <code className="bg-white bg-opacity-20 px-2 py-1 rounded mt-1 inline-block">
              https://yoursite.com/security/check-in/[invitation-id]
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
