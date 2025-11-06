import EditStoryClient from "./Client";
import Hero from "../../../components/Hero";

export default function EditStoryPage({ params }: any) {
  const { id } = params;
  return (
    <>
      <Hero title="Upravit příběh" subtitle="Aktualizujte svou pohádku" height="sm" />
      <EditStoryClient id={id} />
    </>
  );
}