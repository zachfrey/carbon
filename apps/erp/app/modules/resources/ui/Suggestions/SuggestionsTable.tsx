import { Avatar, Badge, HStack, MenuIcon, MenuItem } from "@carbon/react";
import { formatDate } from "@carbon/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { memo, useCallback, useMemo } from "react";
import {
  LuCalendar,
  LuEye,
  LuFileText,
  LuTag,
  LuTrash,
  LuUser
} from "react-icons/lu";
import { useNavigate } from "react-router";
import { Hyperlink, Table } from "~/components";
import { usePermissions, useUrlParams } from "~/hooks";
import type { SuggestionListItem } from "~/modules/resources";
import { usePeople } from "~/stores";
import { path } from "~/utils/path";

type SuggestionsTableProps = {
  data: SuggestionListItem[];
  tags: { name: string }[];
  count: number;
};

const defaultColumnVisibility = {};

const SuggestionsTable = memo(
  ({ data, tags, count }: SuggestionsTableProps) => {
    const navigate = useNavigate();
    const permissions = usePermissions();
    const [params] = useUrlParams();
    const [people] = usePeople();

    const columns = useMemo<ColumnDef<SuggestionListItem>[]>(() => {
      const defaultColumns: ColumnDef<SuggestionListItem>[] = [
        {
          accessorKey: "suggestion",
          header: "Suggestion",
          cell: ({ row }) => (
            <Hyperlink to={row.original.id!}>
              <HStack spacing={2} className="max-w-[400px]">
                <span className="text-xl shrink-0">
                  {row.original.emoji ?? "💡"}
                </span>
                <span className="truncate">
                  {row.original.suggestion?.slice(0, 100)}
                  {(row.original.suggestion?.length ?? 0) > 100 ? "..." : ""}
                </span>
              </HStack>
            </Hyperlink>
          ),
          meta: {
            icon: <LuFileText />
          }
        },
        {
          id: "employee",
          header: "Employee",
          cell: ({ row }) => (
            <HStack spacing={2}>
              <Avatar
                size="sm"
                name={row.original.employeeName ?? undefined}
                src={row.original.employeeAvatarUrl ?? undefined}
              />
              <span>{row.original.employeeName ?? "Anonymous"}</span>
            </HStack>
          ),
          meta: {
            icon: <LuUser />,
            filter: {
              type: "static",
              options: people.map((employee) => ({
                value: employee.id,
                label: employee.name
              }))
            }
          }
        },
        {
          accessorKey: "tags",
          header: "Tags",
          cell: ({ row }) => (
            <HStack spacing={0} className="gap-1">
              {row.original.tags?.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </HStack>
          ),
          meta: {
            filter: {
              type: "static",
              options: tags?.map((tag) => ({
                value: tag.name,
                label: <Badge variant="secondary">{tag.name}</Badge>
              })),
              isArray: true
            },
            icon: <LuTag />
          }
        },
        {
          accessorKey: "createdAt",
          header: "Date",
          cell: (item) => formatDate(item.getValue<string>()),
          meta: {
            icon: <LuCalendar />
          }
        }
      ];
      return defaultColumns;
    }, [tags, people]);

    const renderContextMenu = useCallback(
      (row: SuggestionListItem) => {
        return (
          <>
            <MenuItem
              onClick={() => {
                navigate(path.to.suggestion(row.id!));
              }}
            >
              <MenuIcon icon={<LuEye />} />
              View Suggestion
            </MenuItem>
            <MenuItem
              destructive
              disabled={!permissions.can("delete", "resources")}
              onClick={() => {
                navigate(
                  `${path.to.deleteSuggestion(row.id!)}?${params.toString()}`
                );
              }}
            >
              <MenuIcon icon={<LuTrash />} />
              Delete Suggestion
            </MenuItem>
          </>
        );
      },
      [navigate, params, permissions]
    );

    return (
      <Table<SuggestionListItem>
        data={data}
        count={count}
        columns={columns}
        defaultColumnVisibility={defaultColumnVisibility}
        renderContextMenu={renderContextMenu}
        title="Suggestions"
        table="suggestion"
        withSavedView
      />
    );
  }
);

SuggestionsTable.displayName = "SuggestionsTable";
export default SuggestionsTable;
