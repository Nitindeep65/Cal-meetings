import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

interface FAQProps {
  question: string;
  answer: string;
  value: string;
}

const FAQList: FAQProps[] = [
  {
    question: "How does Cal Meetings integrate with Google Calendar?",
    answer: "Cal Meetings seamlessly connects with your Google Calendar through secure OAuth authentication. Once connected, it automatically syncs your events and provides real-time access to your calendar data.",
    value: "item-1",
  },
  {
    question: "What kind of AI insights can I get for my meetings?",
    answer:
      "Our AI provides two types of insights: intelligent summaries for past meetings that highlight key takeaways and action items, and smart preparation suggestions for upcoming meetings based on attendees, topics, and historical context.",
    value: "item-2",
  },
  {
    question:
      "Is my calendar data secure and private?",
    answer:
      "Absolutely. We use industry-standard security measures and OAuth 2.0 authentication. Your calendar data is never stored permanently on our servers and is only accessed when you're actively using the application.",
    value: "item-3",
  },
  {
    question: "Do I need to install any software to use Cal Meetings?",
    answer: "No installation required! Cal Meetings is a web-based application that works directly in your browser. Just sign in with your Google account and start managing your calendar intelligently.",
    value: "item-4",
  },
  {
    question:
      "Can I use Cal Meetings with multiple Google accounts?",
    answer:
      "Currently, Cal Meetings supports one Google account per session. You can easily switch between accounts by signing out and signing in with a different Google account.",
    value: "item-5",
  },
];

export const FAQ = () => {
  return (
    <section
      id="faq"
      className="container py-24 sm:py-32"
    >
      <h2 className="text-3xl md:text-4xl font-bold mb-4">
        Frequently Asked{" "}
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          Questions
        </span>
      </h2>

      <Accordion
        type="single"
        collapsible
        className="w-full AccordionRoot"
      >
        {FAQList.map(({ question, answer, value }: FAQProps) => (
          <AccordionItem
            key={value}
            value={value}
          >
            <AccordionTrigger className="text-left">
              {question}
            </AccordionTrigger>

            <AccordionContent>{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <h3 className="font-medium mt-4">
        Still have questions?{" "}
        <a
          rel="noreferrer noopener"
          href="#"
          className="text-primary transition-all border-primary hover:border-b-2"
        >
          Contact us
        </a>
      </h3>
    </section>
  );
};
