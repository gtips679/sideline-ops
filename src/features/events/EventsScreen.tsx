import { DataTable } from "../../components/DataTable";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusPill } from "../../components/StatusPill";
import { formatDateTime, titleCase } from "../../lib/format";
import type { Event } from "../../lib/types";

type EventsScreenProps = {
  events: Event[];
};

export function EventsScreen({ events }: EventsScreenProps) {
  return (
    <>
      <SectionHeader title="Events" eyebrow="Admin" />
      <section className="panel">
        <DataTable
          rows={events}
          getRowKey={(event) => event.id}
          columns={[
            { header: "Event", render: (event) => <strong>{event.title}</strong> },
            { header: "Location", render: (event) => event.location_name ?? event.location_id },
            { header: "Type", render: (event) => titleCase(event.event_type) },
            { header: "Starts", render: (event) => formatDateTime(event.starts_at) },
            { header: "Crowd", render: (event) => event.expected_crowd ?? "Not set" },
            { header: "Status", render: (event) => <StatusPill status={event.status} /> },
          ]}
        />
      </section>
    </>
  );
}
