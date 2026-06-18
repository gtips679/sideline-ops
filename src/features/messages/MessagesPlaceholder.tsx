import { PlaceholderPanel } from "../../components/PlaceholderPanel";
import { SectionHeader } from "../../components/SectionHeader";

export function MessagesPlaceholder() {
  return (
    <>
      <SectionHeader title="Messages" />
      <PlaceholderPanel title="Messages placeholder" description="Announcements, acknowledgements, SMS fallback, and staff communication will land here in a later phase." />
    </>
  );
}
