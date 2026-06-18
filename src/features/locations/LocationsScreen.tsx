import { DataTable } from "../../components/DataTable";
import { SectionHeader } from "../../components/SectionHeader";
import { titleCase } from "../../lib/format";
import type { Location } from "../../lib/types";

type LocationsScreenProps = {
  locations: Location[];
};

export function LocationsScreen({ locations }: LocationsScreenProps) {
  return (
    <>
      <SectionHeader title="Locations" eyebrow="Admin" />
      <section className="panel">
        <DataTable
          rows={locations}
          getRowKey={(location) => location.id}
          columns={[
            { header: "Location", render: (location) => <strong>{location.name}</strong> },
            { header: "Type", render: (location) => titleCase(location.location_type) },
            { header: "Notes", render: (location) => location.notes ?? "None" },
            { header: "Status", render: (location) => (location.is_active ? "Active" : "Inactive") },
          ]}
        />
      </section>
    </>
  );
}
