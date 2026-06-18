import { DataTable } from "../../components/DataTable";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusPill } from "../../components/StatusPill";
import type { User } from "../../lib/types";

type StaffListScreenProps = {
  users: User[];
};

export function StaffListScreen({ users }: StaffListScreenProps) {
  return (
    <>
      <SectionHeader title="Staff" eyebrow="Admin" />
      <section className="panel">
        <DataTable
          rows={users}
          getRowKey={(user) => user.id}
          columns={[
            { header: "Name", render: (user) => <strong>{user.display_name}</strong> },
            { header: "Role", render: (user) => <StatusPill status={user.role} /> },
            { header: "Phone", render: (user) => user.phone ?? "Not set" },
            { header: "Email", render: (user) => user.email ?? "Not set" },
            { header: "Status", render: (user) => (user.is_active ? "Active" : "Inactive") },
          ]}
        />
      </section>
    </>
  );
}
