import { Statistics } from "./Statistics";
import pilot from "../assets/pilot.png";
import Image from "next/image";

export const About = () => {
  return (
    <section
      id="about"
      className="container py-24 sm:py-32"
    >
      <div className="bg-muted/50 border rounded-lg py-12">
        <div className="px-6 flex flex-col-reverse md:flex-row gap-8 md:gap-12">
          <Image
            src={pilot}
            alt=""
            className="w-[300px] object-contain rounded-lg"
            width={300}
            height={300}
          />
          <div className="bg-green-0 flex flex-col justify-between">
            <div className="pb-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
                  About{" "}
                </span>
                Cal Meetings
              </h2>
              <p className="text-xl text-muted-foreground mt-4">
                Cal Meetings revolutionizes how you manage your calendar and meetings. 
                Our AI-powered platform integrates seamlessly with Google Calendar to provide 
                intelligent meeting summaries, preparation insights, and productivity analytics. 
                Say goodbye to inefficient meetings and hello to smarter scheduling that adapts 
                to your workflow and maximizes your time.
              </p>
            </div>

            <Statistics />
          </div>
        </div>
      </div>
    </section>
  );
};
