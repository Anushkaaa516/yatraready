import { notFound } from "next/navigation";
import SampleFiles from "./sample-files";

// Sample documents for recording a demo video. Not available on the live site.
export default function DemoFiles() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SampleFiles />;
}
