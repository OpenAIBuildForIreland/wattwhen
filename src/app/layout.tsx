import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "WattWhen — A better time to power your home",
  description:
    "Find the cheapest, cleanest time to use electricity. Made for Irish households with EirGrid, Met Éireann and PVGIS.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IE">
      <body>
        <a href="#main" className="skip-link">
          Skip to your energy plan
        </a>
        {children}
      </body>
    </html>
  );
}
