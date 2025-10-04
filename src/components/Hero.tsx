import { Button } from "./ui/button";
import { HeroCards } from "./HeroCards";
import Link from "next/link";

export const Hero = () => {
  return (
    <section className="container grid lg:grid-cols-2 place-items-center py-20 md:py-32 gap-10">
      <div className="text-center lg:text-start space-y-6">
        <main className="text-5xl md:text-6xl font-bold">
          <h1 className="inline">
            <span className="inline bg-gradient-to-r from-[#F596D3]  to-[#D247BF] text-transparent bg-clip-text">
              Smart
            </span>{" "}
            Calendar
          </h1>{" "}
          with{" "}
          <h2 className="inline">
            <span className="inline bg-gradient-to-r from-[#61DAFB] via-[#1fc0f1] to-[#03a3d7] text-transparent bg-clip-text">
              AI
            </span>{" "}
            Insights
          </h2>
        </main>

        <p className="text-xl text-muted-foreground md:w-10/12 mx-auto lg:mx-0">
          Transform your meeting productivity with AI-powered summaries, smart preparation insights, and seamless Google Calendar integration. Schedule smarter, meet better.
        </p>

        <div className="flex justify-center lg:justify-start">
          <Link href="/login">
            <Button className="w-full md:w-auto px-8">Start Managing Your Calendar</Button>
          </Link>
        </div>
      </div>

      {/* Hero cards sections */}
      <div className="z-10">
        <HeroCards />
      </div>

      {/* Shadow effect */}
      <div className="shadow"></div>
    </section>
  );
};
