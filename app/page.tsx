import NotebookApp from "@/components/notebook-app";
import {
  appendixResources,
  handoutResources,
  notebookSettings,
} from "@/lib/resources";

export default function Home() {
  return (
    <NotebookApp
      appendixResources={appendixResources}
      handoutResources={handoutResources}
      notebookSettings={notebookSettings}
    />
  );
}
