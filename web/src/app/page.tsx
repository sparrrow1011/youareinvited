'use client';

import Link from 'next/link';
import { FiUsers, FiCalendar, FiCheckSquare } from 'react-icons/fi';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-primary">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Event Invitation System
          </h1>
          <p className="text-xl text-light max-w-2xl mx-auto">
            Create beautiful digital invitations with QR codes, manage guest lists, and track attendance effortlessly
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {/* Admin Card */}
          <Link href="/admin">
            <div className="card hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer bg-white">
              <div className="flex items-center justify-center w-16 h-16 bg-accent rounded-full mb-4 mx-auto">
                <FiUsers className="text-3xl text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                Admin Dashboard
              </h2>
              <p className="text-gray-600 text-center">
                Create and manage invitations, track attendance, and view statistics
              </p>
              <div className="mt-6 text-center">
                <span className="text-accent font-semibold">Access Dashboard →</span>
              </div>
            </div>
          </Link>

          {/* Security Card */}
          <Link href="/security">
            <div className="card hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer bg-white">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4 mx-auto">
                <FiCheckSquare className="text-3xl text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                Security Check-In
              </h2>
              <p className="text-gray-600 text-center">
                Scan QR codes and check in guests at the venue entrance
              </p>
              <div className="mt-6 text-center">
                <span className="text-blue-600 font-semibold">Access Security →</span>
              </div>
            </div>
          </Link>

          {/* Guest Info Card */}
          <div className="card bg-white">
            <div className="flex items-center justify-center w-16 h-16 bg-purple-500 rounded-full mb-4 mx-auto">
              <FiCalendar className="text-3xl text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Guest Access
            </h2>
            <p className="text-gray-600 text-center mb-4">
              Guests can view their personalized invitation through their unique link or QR code
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 text-center">
                Each invitation has a unique URL like:
              </p>
              <code className="block mt-2 text-xs bg-white p-2 rounded text-center break-all">
                /invitation/[unique-id]
              </code>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-10">
            Key Features
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-6 text-white">
              <div className="flex items-center justify-center w-12 h-12 bg-accent rounded-lg mb-4">
                <FiCheckSquare className="text-2xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2">QR Code Generation</h3>
              <p className="text-light text-sm">
                Automatic QR code creation linking directly to security check-in
              </p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-6 text-white">
              <div className="flex items-center justify-center w-12 h-12 bg-green-500 rounded-lg mb-4">
                <FiUsers className="text-2xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Security Check-In</h3>
              <p className="text-light text-sm">
                Security scans QR codes and checks guests in at entrance
              </p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-6 text-white">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-lg mb-4">
                <FiCalendar className="text-2xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Beautiful E-Invites</h3>
              <p className="text-light text-sm">
                Shareable invitation images with embedded QR codes for WhatsApp
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <Link href="/admin">
            <button className="btn-primary text-xl px-10 py-4 hover:scale-105 transition-transform">
              Get Started
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
