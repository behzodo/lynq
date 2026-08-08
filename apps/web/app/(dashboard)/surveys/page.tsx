import type { Metadata } from "next";
import { SurveysView } from "@/modules/surveys/ui/views/surveys-view";

export const metadata: Metadata = {
  title: "Surveys",
  description: "Collect ratings, NPS and written feedback.",
};

const Page = () => {
  return <SurveysView />;
};

export default Page;
