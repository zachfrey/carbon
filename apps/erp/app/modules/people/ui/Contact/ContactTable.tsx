import type { ColumnDef } from "@tanstack/react-table";
import { memo, useMemo } from "react";
import { LuMail, LuPhone, LuUser } from "react-icons/lu";
import { Table } from "~/components";
import type { Contact } from "../../types";

type ContactTableProps = {
  data: Contact[];
  count: number;
};

const ContactTable = memo(({ data, count }: ContactTableProps) => {
  const columns = useMemo<ColumnDef<Contact>[]>(() => {
    return [
      {
        accessorKey: "firstName",
        header: "First Name",
        cell: (item) => item.getValue(),
        meta: {
          icon: <LuUser />
        }
      },
      {
        accessorKey: "lastName",
        header: "Last Name",
        cell: (item) => item.getValue(),
        meta: {
          icon: <LuUser />
        }
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: (item) => item.getValue(),
        meta: {
          icon: <LuMail />
        }
      },
      {
        accessorKey: "mobilePhone",
        header: "Mobile Phone",
        cell: (item) => item.getValue(),
        meta: {
          icon: <LuPhone />
        }
      },
      {
        accessorKey: "workPhone",
        header: "Work Phone",
        cell: (item) => item.getValue(),
        meta: {
          icon: <LuPhone />
        }
      },
      {
        accessorKey: "homePhone",
        header: "Home Phone",
        cell: (item) => item.getValue(),
        meta: {
          icon: <LuPhone />
        }
      }
    ];
  }, []);

  return (
    <Table<Contact>
      count={count}
      columns={columns}
      data={data}
      defaultColumnPinning={{
        left: ["Select"]
      }}
      title="Contacts"
      table="contact"
    />
  );
});

ContactTable.displayName = "ContactTable";

export default ContactTable;
