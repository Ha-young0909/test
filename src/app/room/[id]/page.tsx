import RoomView from "@/components/RoomView";

export default async function RoomPage({ params }: PageProps<"/room/[id]">) {
  const { id } = await params;
  return <RoomView roomId={id} />;
}
