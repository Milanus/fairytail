import EditStoryClient from "./Client";
import Hero from "../../../components/Hero";

export default async function EditStoryPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  
  return (
    <>
      <Hero title="Upravit příběh" subtitle="Aktualizujte svou pohádku" height="sm" />
      <EditStoryClient id={id} />
    </>
  );
}