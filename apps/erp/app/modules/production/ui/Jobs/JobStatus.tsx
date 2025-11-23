import { Status } from "@carbon/react";
import type { jobStatus } from "../../production.models";

type JobStatusProps = {
  status?: (typeof jobStatus)[number] | null;
  className?: string;
};

function JobStatus({ status, className }: JobStatusProps) {
  switch (status) {
    case "Draft":
      return (
        <Status color="gray" className={className}>
          {status}
        </Status>
      );
    case "Planned":
      return (
        <Status color="yellow" className={className}>
          {status}
        </Status>
      );
    case "Ready":
      return (
        <Status color="blue" className={className}>
          Released
        </Status>
      ); // TODO: update this properly
    case "In Progress":
      return (
        <Status color="blue" className={className}>
          {status}
        </Status>
      );
    case "Paused":
    case "Due Today":
      return (
        <Status color="orange" className={className}>
          {status}
        </Status>
      );
    case "Completed":
      return (
        <Status color="green" className={className}>
          {status}
        </Status>
      );
    case "Overdue":
    case "Cancelled":
      return (
        <Status color="red" className={className}>
          {status}
        </Status>
      );

    default:
      return null;
  }
}

export default JobStatus;
