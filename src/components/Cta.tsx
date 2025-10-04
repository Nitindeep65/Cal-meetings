import { Button } from "./ui/button";
import Link from "next/link";

export const Cta = () => {
  return (
    <section
      id="cta"
      className="bg-muted/50 py-16 my-24 sm:my-32"
    >
      <div className="container lg:grid lg:grid-cols-2 place-items-center">
        <div className="lg:col-start-1">
          <h2 className="text-3xl md:text-4xl font-bold ">
            All Your
            <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
              {" "}
              Calendar Events{" "}
            </span>
            With AI Intelligence
          </h2>
          <p className="text-muted-foreground text-xl mt-4 mb-8 lg:mb-0">
            Experience the future of calendar management. Get smart summaries, preparation insights, and productivity analytics that transform how you handle meetings and events.
          </p>
        </div>

        <div className="space-y-4 lg:col-start-2">
          <Link href="/login">
            <Button className="w-full md:mr-4 md:w-auto">Try Cal Meetings</Button>
          </Link>
          <Link href="/dashboard">
            <Button
              variant="outline"
              className="w-full md:w-auto"
            >
              View Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
