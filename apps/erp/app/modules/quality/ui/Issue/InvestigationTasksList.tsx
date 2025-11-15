import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  HStack,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
  VStack,
} from "@carbon/react";
import { useFetcher, useParams } from "@remix-run/react";
import { useCallback, useEffect, useState } from "react";
import { LuCirclePlus } from "react-icons/lu";
import { useRouteData } from "~/hooks";
import type { IssueInvestigationTask } from "~/modules/quality";
import type { ListItem } from "~/types";
import { path } from "~/utils/path";
import { TaskItem, TaskProgress } from "./IssueTask";

export function InvestigationTasksList({
  tasks,
  isDisabled,
}: {
  tasks: IssueInvestigationTask[];
  isDisabled: boolean;
}) {
  if (tasks.length === 0) return <NewInvestigation isDisabled={isDisabled} />;

  return (
    <Card className="w-full" isCollapsible>
      <HStack className="justify-between w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Investigations
          </CardTitle>
        </CardHeader>
        <TaskProgress tasks={tasks} />
      </HStack>
      <CardContent>
        <VStack spacing={3}>
          {tasks
            .sort((a, b) => a.name?.localeCompare(b.name ?? "") ?? 0)
            .map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                type="investigation"
                isDisabled={isDisabled}
              />
            ))}
        </VStack>
      </CardContent>
    </Card>
  );
}

function NewInvestigation({ isDisabled }: { isDisabled: boolean }) {
  const { id } = useParams();
  if (!id) throw new Error("id not found");

  const [isOpen, setIsOpen] = useState(false);
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);

  const routeData = useRouteData<{
    investigationTypes: ListItem[];
  }>(path.to.issue(id));

  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      setIsOpen(false);
      setSelectedTypeIds([]);
    }
  }, [fetcher.state, fetcher.data]);

  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.append("ids", id);
    formData.append("field", "investigationTypeIds");
    formData.append("value", selectedTypeIds.join(","));

    fetcher.submit(formData, {
      method: "post",
      action: path.to.bulkUpdateIssue,
    });
  }, [id, selectedTypeIds, fetcher]);

  const handleCheckboxChange = useCallback(
    (typeId: string, checked: boolean) => {
      setSelectedTypeIds((prev) =>
        checked ? [...prev, typeId] : prev.filter((id) => id !== typeId)
      );
    },
    []
  );

  return (
    <>
      <button
        className="flex items-center justify-start bg-card border-2 border-dashed border-background w-full hover:bg-background/80 rounded-lg p-4 gap-2 transition-colors duration-200 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => setIsOpen(true)}
        disabled={isDisabled}
      >
        <LuCirclePlus size={16} /> <span>Add Investigations</span>
      </button>

      <Modal
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsOpen(false);
            setSelectedTypeIds([]);
          }
        }}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Add Investigation Types</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <VStack spacing={3}>
              {routeData?.investigationTypes.map((type) => (
                <HStack key={type.id}>
                  <Checkbox
                    isChecked={selectedTypeIds.includes(type.id)}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(type.id, !!checked)
                    }
                  />
                  <span>{type.name}</span>
                </HStack>
              ))}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setIsOpen(false);
                setSelectedTypeIds([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                selectedTypeIds.length === 0 || fetcher.state !== "idle"
              }
              isLoading={fetcher.state === "submitting"}
            >
              {fetcher.state !== "idle" ? "Adding..." : "Add Investigations"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
