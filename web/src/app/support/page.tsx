'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@youare-invited.com';
const SUPPORT_WHATSAPP_URL = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_URL || '';
const CHECKLIST_STORAGE_KEY = 'yai_support_checklist_v1';

const FAQ_ITEMS = [
  {
    question: 'Why is my CSV import failing?',
    answer: 'Use the downloaded template and make sure your file includes the exact columns: name, seat_number, and tag. Save as standard CSV with one guest per row.',
  },
  {
    question: 'Why are invitation images not generating?',
    answer: 'Image generation depends on a valid template or default invite layout and working media storage. On Vercel, Cloudinary must be configured for template uploads and generated assets.',
  },
  {
    question: 'Why does the QR code open the security flow instead of the guest page?',
    answer: 'The QR code is designed for venue staff check-in. Guests should use their invitation link, while security scans the QR to validate arrival quickly.',
  },
  {
    question: 'Can I edit a guest after I have already shared the invite?',
    answer: 'Yes. Update the guest from the event page, then regenerate assets if you need the invite image and QR output refreshed with the new data.',
  },
  {
    question: 'Why is login not working even with the right password?',
    answer: 'Check that the browser is calling the right backend URL and that your token is not stale. If the issue is production-only, confirm your CORS, CSRF, and backend env settings.',
  },
  {
    question: 'What should I test before the event goes live?',
    answer: 'Create one sample guest, open the invitation page, verify the WhatsApp link, confirm the QR reaches the security PIN flow, and run a full check-in test on mobile.',
  },
];

const GUIDE_CARDS = [
  {
    id: 'csv-guide',
    title: 'CSV Import Guide',
    icon: 'upload_file',
    steps: [
      'Download the guest import template from an event page.',
      'Fill the columns exactly as name, seat_number, and tag.',
      'Remove blank rows before saving the file as CSV.',
      'Import the file, review the preview, then confirm the bulk upload.',
    ],
  },
  {
    id: 'template-guide',
    title: 'Template Design Guide',
    icon: 'brush',
    steps: [
      'Upload a high-resolution PNG or JPG invitation background.',
      'Leave clear visual space for guest name, tag, and QR placement.',
      'Avoid putting important text too close to the edges of the design.',
      'Save the zones, then regenerate invitations to apply the new template.',
    ],
  },
  {
    id: 'security-guide',
    title: 'QR / Security Setup Guide',
    icon: 'qr_code_scanner',
    steps: [
      'Set a 4 to 6 digit security PIN inside the event page.',
      'Copy the staff link and share it only with your check-in team.',
      'Use a sample invite to confirm the QR opens the right check-in path.',
      'Run one end-to-end check-in test before the event day starts.',
    ],
  },
];

const CHECKLIST_ITEMS = [
  { id: 'event', label: 'Create your first event' },
  { id: 'template', label: 'Upload and map an invitation template' },
  { id: 'guests', label: 'Import or add guests manually' },
  { id: 'security', label: 'Set the security PIN and test staff access' },
  { id: 'share', label: 'Open one invite and test the guest experience' },
];

const buildMailtoUrl = (subject: string, body: string) =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

const buildWhatsAppUrl = (message: string) => {
  if (!SUPPORT_WHATSAPP_URL) return '';
  const separator = SUPPORT_WHATSAPP_URL.includes('?') ? '&' : '?';
  return `${SUPPORT_WHATSAPP_URL}${separator}text=${encodeURIComponent(message)}`;
};

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState(0);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [contactForm, setContactForm] = useState({
    subject: '',
    eventName: '',
    message: '',
  });
  const [bugForm, setBugForm] = useState({
    title: '',
    severity: 'medium',
    steps: '',
    expected: '',
    actual: '',
  });

  useEffect(() => {
    const raw = window.localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return;

    try {
      setChecklist(JSON.parse(raw));
    } catch {
      window.localStorage.removeItem(CHECKLIST_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (Object.keys(checklist).length === 0) return;
    window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checklist));
  }, [checklist]);

  const completedChecklistCount = CHECKLIST_ITEMS.filter((item) => checklist[item.id]).length;

  const toggleChecklist = (id: string) => {
    setChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleContactSubmit = (event: FormEvent) => {
    event.preventDefault();
    const subject = `[Support] ${contactForm.subject || 'Organizer help request'}`;
    const body = [
      'Support request',
      '',
      `Event name: ${contactForm.eventName || 'Not provided'}`,
      '',
      contactForm.message || 'No message provided.',
    ].join('\n');

    window.location.href = buildMailtoUrl(subject, body);
  };

  const handleBugSubmit = (event: FormEvent) => {
    event.preventDefault();
    const subject = `[Bug Report] ${bugForm.title || 'Organizer issue report'}`;
    const body = [
      'Bug report',
      '',
      `Severity: ${bugForm.severity}`,
      '',
      'Steps to reproduce:',
      bugForm.steps || 'Not provided',
      '',
      'Expected result:',
      bugForm.expected || 'Not provided',
      '',
      'Actual result:',
      bugForm.actual || 'Not provided',
    ].join('\n');

    window.location.href = buildMailtoUrl(subject, body);
  };

  const openWhatsAppSupport = () => {
    const url = buildWhatsAppUrl('Hello support team, I need help with my event setup.');
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    window.location.href = buildMailtoUrl(
      '[Support] WhatsApp support request',
      'Hello support team,\n\nI would like help with my event setup.'
    );
  };

  return (
    <div className="min-h-screen bg-lp-background text-on-surface font-body">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-20 -left-20 w-[520px] h-[520px] rounded-full bg-brand/10 blur-[140px]" />
        <div className="absolute top-1/3 -right-16 w-[420px] h-[420px] rounded-full bg-tertiary/10 blur-[120px]" />
        <div className="absolute -bottom-24 left-1/3 w-[460px] h-[460px] rounded-full bg-secondary-container/20 blur-[130px]" />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 lg:py-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand mb-3">Support Center</p>
            <h1 className="font-headline text-4xl sm:text-5xl leading-tight text-on-lp-background">
              Help for setup,
              <br />
              launch, and event-day operations.
            </h1>
            <p className="text-sm sm:text-base text-on-surface-variant mt-4 max-w-2xl">
              Everything your organizers need to get live quickly, fix common issues, and contact support without leaving the app.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/support/status"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/70 border border-white/60 text-sm font-semibold text-on-surface shadow-sm"
            >
              <span className="material-symbols-outlined text-base">monitor_heart</span>
              System Status
            </Link>
            <button
              onClick={openWhatsAppSupport}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#25D366] text-white text-sm font-semibold shadow-lg shadow-[#25D366]/20"
            >
              <span className="material-symbols-outlined text-base">support_agent</span>
              {SUPPORT_WHATSAPP_URL ? 'WhatsApp Support' : 'Email Support'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-10">
          {[
            ['#checklist', 'Checklist'],
            ['#guides', 'Guides'],
            ['#faq', 'FAQ'],
            ['#contact', 'Contact'],
            ['#bugs', 'Bug Report'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-white/50 text-xs sm:text-sm font-medium text-on-surface-variant"
            >
              {label}
            </a>
          ))}
        </div>

        <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6 lg:gap-8 mb-12">
          <div id="checklist" className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/50 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-2">Getting Started Checklist</p>
                <h2 className="font-headline text-2xl text-on-lp-background">Launch your event with confidence</h2>
              </div>
              <div className="text-right">
                <p className="text-3xl font-headline text-on-lp-background">{completedChecklistCount}/{CHECKLIST_ITEMS.length}</p>
                <p className="text-xs text-on-surface-variant uppercase tracking-widest">Completed</p>
              </div>
            </div>

            <div className="space-y-3">
              {CHECKLIST_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleChecklist(item.id)}
                  className={`w-full text-left rounded-2xl border px-4 py-4 flex items-center gap-3 transition-colors ${
                    checklist[item.id]
                      ? 'bg-brand-container/25 border-brand/20'
                      : 'bg-white/50 border-outline-variant/10'
                  }`}
                >
                  <span className={`material-symbols-outlined ${checklist[item.id] ? 'text-brand' : 'text-on-surface-variant'}`}>
                    {checklist[item.id] ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className="text-sm sm:text-base font-medium text-on-surface">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-low rounded-[2rem] border border-white/40 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-2">Quick Support</p>
            <h2 className="font-headline text-2xl text-on-lp-background mb-6">What you can do right now</h2>

            <div className="space-y-4">
              <div className="rounded-3xl bg-white/60 border border-white/50 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-brand">mail</span>
                  <p className="font-semibold text-on-lp-background">Contact Support</p>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Send a help request for setup, event configuration, media issues, or deployment questions.
                </p>
              </div>

              <div className="rounded-3xl bg-white/60 border border-white/50 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-brand">bug_report</span>
                  <p className="font-semibold text-on-lp-background">Report a Bug</p>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Capture the problem, reproduction steps, and the expected result so support can act faster.
                </p>
              </div>

              <div className="rounded-3xl bg-white/60 border border-white/50 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-brand">forum</span>
                  <p className="font-semibold text-on-lp-background">Live Chat / WhatsApp</p>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Use one-tap support for urgent organizer questions before or during event check-in.
                </p>
              </div>

              <div className="rounded-3xl bg-on-lp-background text-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/60 mb-2">Status Board</p>
                    <p className="font-semibold">Review system health before event day starts.</p>
                  </div>
                  <Link href="/support/status" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-on-lp-background text-sm font-semibold shrink-0">
                    View
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="guides" className="mb-12">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-2">Guides</p>
            <h2 className="font-headline text-3xl text-on-lp-background">Core setup guides</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {GUIDE_CARDS.map((guide) => (
              <div key={guide.id} className="rounded-[2rem] bg-white/70 backdrop-blur-xl border border-white/50 p-6 shadow-sm">
                <div className="w-11 h-11 rounded-2xl bg-brand-container/30 text-brand flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">{guide.icon}</span>
                </div>
                <h3 className="font-headline text-2xl text-on-lp-background mb-4">{guide.title}</h3>
                <ol className="space-y-3 text-sm text-on-surface-variant leading-relaxed">
                  {guide.steps.map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-semibold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="mb-12">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-2">FAQ</p>
            <h2 className="font-headline text-3xl text-on-lp-background">Answers to common organizer questions</h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, index) => (
              <div key={item.question} className="rounded-[1.75rem] bg-white/70 backdrop-blur-xl border border-white/50 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                  className="w-full px-5 sm:px-6 py-5 flex items-center justify-between gap-4 text-left"
                >
                  <span className="font-medium text-on-lp-background">{item.question}</span>
                  <span className="material-symbols-outlined text-on-surface-variant shrink-0">
                    {openFaq === index ? 'remove' : 'add'}
                  </span>
                </button>
                {openFaq === index && (
                  <div className="px-5 sm:px-6 pb-5 text-sm text-on-surface-variant leading-relaxed">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          <div id="contact" className="rounded-[2rem] bg-white/70 backdrop-blur-xl border border-white/50 p-6 sm:p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-2">Contact Support</p>
            <h2 className="font-headline text-3xl text-on-lp-background mb-6">Send a help request</h2>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">Subject</label>
                <input
                  value={contactForm.subject}
                  onChange={(event) => setContactForm((prev) => ({ ...prev, subject: event.target.value }))}
                  placeholder="Need help setting up guest invitations"
                  className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">Event Name</label>
                <input
                  value={contactForm.eventName}
                  onChange={(event) => setContactForm((prev) => ({ ...prev, eventName: event.target.value }))}
                  placeholder="Spring wedding launch"
                  className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">Message</label>
                <textarea
                  rows={6}
                  value={contactForm.message}
                  onChange={(event) => setContactForm((prev) => ({ ...prev, message: event.target.value }))}
                  placeholder="Describe what is blocked, what you expected, and whether this is urgent for event day."
                  className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none resize-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button type="submit" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-brand text-white text-sm font-semibold">
                  <span className="material-symbols-outlined text-base">send</span>
                  Email Support
                </button>
                <button
                  type="button"
                  onClick={openWhatsAppSupport}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#25D366] text-white text-sm font-semibold"
                >
                  <span className="material-symbols-outlined text-base">forum</span>
                  {SUPPORT_WHATSAPP_URL ? 'Open WhatsApp' : 'Fallback to Email'}
                </button>
              </div>
            </form>
          </div>

          <div id="bugs" className="rounded-[2rem] bg-surface-container-low border border-white/40 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-2">Bug Report</p>
            <h2 className="font-headline text-3xl text-on-lp-background mb-6">Send a structured issue report</h2>

            <form onSubmit={handleBugSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">Issue Title</label>
                <input
                  value={bugForm.title}
                  onChange={(event) => setBugForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Bulk import fails with valid CSV"
                  className="w-full rounded-2xl border border-outline-variant/20 bg-white/70 px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">Severity</label>
                <select
                  value={bugForm.severity}
                  onChange={(event) => setBugForm((prev) => ({ ...prev, severity: event.target.value }))}
                  className="w-full rounded-2xl border border-outline-variant/20 bg-white/70 px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-brand/30"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">Steps to Reproduce</label>
                <textarea
                  rows={4}
                  value={bugForm.steps}
                  onChange={(event) => setBugForm((prev) => ({ ...prev, steps: event.target.value }))}
                  placeholder="1. Open event page&#10;2. Import CSV&#10;3. Confirm upload..."
                  className="w-full rounded-2xl border border-outline-variant/20 bg-white/70 px-4 py-3 text-sm text-on-surface outline-none resize-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">Expected Result</label>
                  <textarea
                    rows={3}
                    value={bugForm.expected}
                    onChange={(event) => setBugForm((prev) => ({ ...prev, expected: event.target.value }))}
                    className="w-full rounded-2xl border border-outline-variant/20 bg-white/70 px-4 py-3 text-sm text-on-surface outline-none resize-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">Actual Result</label>
                  <textarea
                    rows={3}
                    value={bugForm.actual}
                    onChange={(event) => setBugForm((prev) => ({ ...prev, actual: event.target.value }))}
                    className="w-full rounded-2xl border border-outline-variant/20 bg-white/70 px-4 py-3 text-sm text-on-surface outline-none resize-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>

              <button type="submit" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-on-lp-background text-white text-sm font-semibold">
                <span className="material-symbols-outlined text-base">bug_report</span>
                Send Bug Report
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
