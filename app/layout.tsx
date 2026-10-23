import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'MATH AI - Intelligent Mathematical Solver & Classroom',
  description: 'AI-powered mathematical problem solver, step-by-step tutor, adaptive quiz generator, and teacher-student classroom management.',
  openGraph: {
    title: 'MATH AI - Intelligent Mathematical Solver & Classroom',
    description: 'AI-powered mathematical problem solver, step-by-step tutor, adaptive quiz generator, and teacher-student classroom management.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MATH AI - Intelligent Mathematical Solver & Classroom',
    description: 'AI-powered mathematical problem solver, step-by-step tutor, adaptive quiz generator, and teacher-student classroom management.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
