import { About } from "../components/About";
import { Cta } from "../components/Cta";
import { FAQ } from "../components/FAQ";
import { Footer } from "../components/Footer";
import { Hero } from "../components/Hero";
import { HowItWorks } from "../components/HowItWorks";
import { Navbar } from "../components/Navbar";
import { Pricing } from "../components/Pricing";
import { ScrollToTop } from "../components/ScrollToTop";
import { Services } from "../components/Services";
import { Team } from "../components/Team";
// SEO Metadata for Calendar App
export const metadata = {
  title: "Cal Meetings - Smart Calendar Management with AI Insights | Schedule & Analyze",
  description: "Transform your meeting productivity with Cal Meetings. AI-powered calendar app that generates smart summaries, preparation insights, and analytics for your Google Calendar events. Schedule smarter, meet better.",
  keywords: "calendar app, meeting scheduler, AI calendar, Google Calendar integration, meeting analytics, smart scheduling, calendar management, meeting insights, productivity tools, calendar AI",
  authors: [{ name: "Cal Meetings Team" }],
  creator: "Cal Meetings",
  publisher: "Cal Meetings",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "http://localhost:3000",
    title: "Cal Meetings - AI-Powered Calendar Management",
    description: "Smart calendar app with AI-generated meeting summaries and preparation insights. Connect your Google Calendar and boost your meeting productivity.",
    siteName: "Cal Meetings",
    images: [
      {
        url: "/images/og-calendar-app.jpg",
        width: 1200,
        height: 630,
        alt: "Cal Meetings - Smart Calendar Management Dashboard"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Cal Meetings - AI Calendar Management",
    description: "Smart calendar app with AI insights for better meetings",
    images: ["/images/twitter-calendar-app.jpg"]
  },
  alternates: {
    canonical: "http://localhost:3000"
  },
  category: "productivity"
};

export default function HomePage() {
  return (
    <>
      <Navbar />
      <Hero />
      <About />
      <HowItWorks />
      <Services />
      <Cta />
      <Team />
      <Pricing />
      <FAQ />
      <Footer />
      <ScrollToTop />
    </>
  );
}
