import Editor from "./Editor";

export const metadata = { title: "Edit CV · CV for Ethiopians" };

export default async function EditCVPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Editor id={id} />;
}
