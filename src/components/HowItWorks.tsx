import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { MedalIcon, MapIcon, PlaneIcon, GiftIcon } from "../components/Icons";
import { ReactElement } from "react";

interface FeatureProps {
  icon: ReactElement;
  title: string;
  description: string;
}

const features: FeatureProps[] = [
  {
    icon: <MedalIcon />,
    title: "Connect Google Calendar",
    description:
      "Sign in with your Google account and securely connect your calendar for seamless integration and real-time synchronization.",
  },
  {
    icon: <MapIcon />,
    title: "View Your Events",
    description:
      "Access all your calendar events in one intelligent dashboard with clean organization and smart filtering options.",
  },
  {
    icon: <PlaneIcon />,
    title: "Generate AI Insights",
    description:
      "Get instant AI-powered summaries for past meetings and smart preparation insights for upcoming events.",
  },
  {
    icon: <GiftIcon />,
    title: "Boost Productivity",
    description:
      "Transform your meeting experience with actionable insights, better preparation, and enhanced productivity tracking.",
  },
];

export const HowItWorks = () => {
  return (
    <section
      id="howItWorks"
      className="container text-center py-24 sm:py-32"
    >
      <h2 className="text-3xl md:text-4xl font-bold ">
        How It{" "}
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          Works{" "}
        </span>
        Step-by-Step Guide
      </h2>
      <p className="md:w-3/4 mx-auto mt-4 mb-8 text-xl text-muted-foreground">
        Get started with Cal Meetings in just a few simple steps and transform your calendar management experience today.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map(({ icon, title, description }: FeatureProps) => (
          <Card
            key={title}
            className="bg-muted/50"
          >
            <CardHeader>
              <CardTitle className="grid gap-4 place-items-center">
                {icon}
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent>{description}</CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
