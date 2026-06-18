import { PlaceholderPanel } from "../../components/PlaceholderPanel";
import { SectionHeader } from "../../components/SectionHeader";

export function ChecklistsPlaceholder() {
  return (
    <>
      <SectionHeader title="Checklists" />
      <PlaceholderPanel title="Checklists placeholder" description="Location opening, closing, prep, and cleanup checklists will use this section." />
    </>
  );
}
