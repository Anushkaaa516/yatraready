import { Suspense } from "react";
import UploadForm from "./upload-form";

async function Form({ params }: { params: PageProps<"/upload/[token]">["params"] }) {
  const { token } = await params;
  return <UploadForm token={token} />;
}

export default function UploadPage(props: PageProps<"/upload/[token]">) {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Loading…</p>}>
      <Form params={props.params} />
    </Suspense>
  );
}
