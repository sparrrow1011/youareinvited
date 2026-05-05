export const FAQ_ITEMS = [
  {
    question: 'Why is my CSV import failing?',
    answer: 'Use the downloaded template and make sure your file includes the exact columns: name, seat_number, and tag. Save as standard CSV with one guest per row.',
  },
  {
    question: 'Why are invitation images not generating?',
    answer: 'Invitation images need either a saved template or the standard invite layout. If images still are not appearing, contact support and we will help enable image generation for your account.',
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
    answer: 'Refresh the page, try signing in again, and make sure you are using the correct app link. If it still fails, contact support so we can check your account access.',
  },
  {
    question: 'What should I test before the event goes live?',
    answer: 'Create one sample guest, open the invitation page, verify the WhatsApp link, confirm the QR reaches the security PIN flow, and run a full check-in test on mobile.',
  },
] as const;

export const GUIDE_CARDS = [
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
] as const;
