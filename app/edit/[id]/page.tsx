import EditStoryClient from "./Client";

export default function EditStoryPage({ params }: any) {
  const { id } = params;
  return <EditStoryClient id={id} />;
}