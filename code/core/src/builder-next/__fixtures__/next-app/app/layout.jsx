import './globals.css';

export const metadata = { title: 'builder-next fixture' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
