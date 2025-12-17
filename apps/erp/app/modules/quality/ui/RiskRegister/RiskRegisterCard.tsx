import { useCarbon } from "@carbon/auth";
import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  Heading,
  HStack,
  IconButton,
  Loading,
  toast,
  useDisclosure
} from "@carbon/react";
import { useCallback, useEffect, useState } from "react";
import { LuSettings2, LuTrash2 } from "react-icons/lu";
import { Assignee, Empty } from "~/components";
import { Enumerable } from "~/components/Enumerable";
import { Confirm } from "~/components/Modals";
import { usePermissions, useUser } from "~/hooks";
import type { riskSource } from "~/modules/quality/quality.models";
import type { Risk } from "~/modules/quality/types";
import { path } from "~/utils/path";
import RiskRegisterForm from "./RiskRegisterForm";
import RiskStatus from "./RiskStatus";

type RiskRegisterCardProps = {
  sourceId: string;
  source: (typeof riskSource)[number];
  itemId?: string;
};

export default function RiskRegisterCard({
  sourceId,
  source,
  itemId
}: RiskRegisterCardProps) {
  const { carbon } = useCarbon();
  const { company } = useUser();

  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(false);
  const formDisclosure = useDisclosure();
  const deleteDisclosure = useDisclosure();
  const [selectedRisk, setSelectedRisk] = useState<Risk | undefined>(undefined);

  const fetchRisks = useCallback(async () => {
    if (!carbon || !company?.id) return;
    setLoading(true);
    const { data, error } = await carbon
      .from("riskRegister")
      .select("*, assignee:assignee(id, firstName, lastName, avatarUrl)")
      .eq("companyId", company.id)
      .or(`source.eq.${source},sourceId.eq.${sourceId},itemId.eq.${itemId}`)
      .order("createdAt", { ascending: false });

    if (error) {
      toast.error(`Failed to fetch risks`);
      return;
    }

    if (data) {
      setRisks(data as unknown as Risk[]);
    }
    setLoading(false);
  }, [carbon, company?.id, sourceId, source, itemId]);

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  const handleAdd = () => {
    setSelectedRisk(undefined);
    formDisclosure.onOpen();
  };

  const handleEdit = (risk: Risk) => {
    setSelectedRisk(risk);
    formDisclosure.onOpen();
  };

  const handleDelete = (risk: Risk) => {
    setSelectedRisk(risk);
    deleteDisclosure.onOpen();
  };

  return (
    <Card className="h-full">
      <HStack className="justify-between">
        <CardHeader>
          <CardTitle>Risks</CardTitle>
        </CardHeader>
        <CardAction>
          <Button aria-label="Add Risk" variant="secondary" onClick={handleAdd}>
            Add Risk
          </Button>
        </CardAction>
      </HStack>

      <CardContent className="p-0 h-full">
        {loading ? (
          <div className="p-4">
            <Loading isLoading={true} />
          </div>
        ) : risks.length === 0 ? (
          <Empty className="pb-8">No risks registered</Empty>
        ) : (
          <div className="flex flex-col gap-4 p-4">
            {risks.map((risk) => (
              <RiskRegisterCardItem
                key={risk.id}
                risk={risk}
                setRisks={setRisks}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </CardContent>

      {formDisclosure.isOpen && (
        <RiskRegisterForm
          open={formDisclosure.isOpen}
          onClose={() => {
            formDisclosure.onClose();
            fetchRisks();
          }}
          initialValues={
            selectedRisk
              ? {
                  ...selectedRisk,
                  description: selectedRisk.description ?? undefined,
                  assignee: selectedRisk.assignee ?? undefined,
                  sourceId: selectedRisk.sourceId ?? undefined,
                  itemId: selectedRisk.itemId ?? undefined,
                  severity: selectedRisk.severity ?? undefined,
                  likelihood: selectedRisk.likelihood ?? undefined
                }
              : {
                  title: "",
                  status: "Open",
                  source: source,
                  sourceId: sourceId,
                  itemId: itemId
                }
          }
        />
      )}

      {selectedRisk && deleteDisclosure.isOpen && (
        <Confirm
          isOpen={deleteDisclosure.isOpen}
          confirmText="Delete"
          onCancel={() => {
            deleteDisclosure.onClose();
            setSelectedRisk(undefined);
          }}
          onSubmit={() => {
            deleteDisclosure.onClose();
            setSelectedRisk(undefined);
            fetchRisks();
          }}
          title="Delete Risk"
          text="Are you sure you want to delete this risk?"
          action={path.to.deleteRisk(selectedRisk.id)}
        />
      )}
    </Card>
  );
}

function RiskRegisterCardItem({
  risk,
  setRisks,
  handleEdit,
  handleDelete
}: {
  risk: Risk;
  setRisks: React.Dispatch<React.SetStateAction<Risk[]>>;
  handleEdit: (risk: Risk) => void;
  handleDelete: (risk: Risk) => void;
}) {
  const permissions = usePermissions();

  return (
    <div
      key={risk.id}
      className="flex flex-col hover:bg-muted/50 transition-colors group rounded-md bg-muted/30 border border-border"
    >
      <div className="p-4 flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <Heading size="h4" as="h3">
            {risk.title}
          </Heading>

          {risk.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {risk.description}
            </p>
          )}
          <HStack className="text-xs text-muted-foreground">
            {risk.severity && <span>Severity: {risk.severity}</span>}
            {risk.likelihood && <span>Likelihood: {risk.likelihood}</span>}
          </HStack>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconButton
            aria-label="Edit"
            icon={<LuSettings2 className="h-4 w-4" />}
            variant="secondary"
            size="sm"
            onClick={() => handleEdit(risk)}
          />
          {permissions.can("delete", "quality") && (
            <IconButton
              aria-label="Delete"
              icon={<LuTrash2 className="h-4 w-4" />}
              variant="secondary"
              size="sm"
              onClick={() => handleDelete(risk)}
            />
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 border-t border-border">
        <div>
          <Assignee
            table="riskRegister"
            id={risk.id}
            size="sm"
            value={risk.assignee ?? undefined}
            onChange={(assignee) => {
              setRisks((prev) =>
                prev.map((r) => (r.id === risk.id ? { ...r, assignee } : r))
              );
            }}
          />
        </div>
        <RiskStatus status={risk.status} />
        <Enumerable value={risk.source} />
      </div>
    </div>
  );
}
